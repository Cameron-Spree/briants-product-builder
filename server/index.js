import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { scrapeProductPage, autoFindProductUrl } from './scraper.js';
import { suggestCategories, getAllCategories } from './categories.js';
import { generateProductContent } from './gemini.js';
import AdmZip from 'adm-zip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// On Vercel, use /tmp (ephemeral but writable). Locally, use ./data.
const IS_VERCEL = !!process.env.VERCEL;
const DATA_DIR = IS_VERCEL ? path.join('/tmp', 'data') : path.join(__dirname, '..', 'data');
const IMAGES_DIR = path.join(DATA_DIR, 'images');
const EXPORTS_DIR = path.join(DATA_DIR, 'exports');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');

// Ensure directories exist
[DATA_DIR, IMAGES_DIR, EXPORTS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use('/data/images', express.static(IMAGES_DIR));

const upload = multer({ dest: path.join(DATA_DIR, 'uploads') });

// ── Routes ─────────────────────────────────────────────

// Get categories
app.get('/api/categories', (req, res) => {
    res.json(getAllCategories());
});

// Upload CSV
app.post('/api/upload-csv', upload.single('file'), (req, res) => {
    try {
        const fileContent = fs.readFileSync(req.file.path, 'utf-8');
        const records = parse(fileContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
            bom: true
        });

        const newProducts = records.map(row => {
            // Try common column name variations
            const sku = row['SKU'] || row['sku'] || row['Sku'] || row['SKU Number'] || '';
            const name = row['Name'] || row['name'] || row['Product Name'] || row['product_name'] || '';
            const price = row['Price'] || row['price'] || row['Regular price'] || row['regular_price'] || '';

            return {
                sku: sku.trim(),
                name: name.trim(),
                price: price.trim(),
                status: 'pending',               // pending | searching | confirmed | complete
                confirmedUrl: '',
                shortDescription: '',
                longDescription: '',
                featuresHtml: '',
                categories: [],
                suggestedCategories: [],
                images: [],                       // [{ url, approved, filename }]
                sourceLinks: [],
                scrapedData: null,
                notes: ''
            };
        }).filter(p => p.sku && p.name);

        // Just return the parsed products to the client to manage state
        res.json({
            message: `Parsed ${newProducts.length} products from CSV`,
            products: newProducts
        });
    } catch (e) {
        console.error('CSV parse error:', e);
        res.status(400).json({ error: 'Failed to parse CSV: ' + e.message });
    } finally {
        // Clean up uploaded file
        if (req.file) fs.unlinkSync(req.file.path);
    }
});

// Scrape a product URL
app.post('/api/scrape', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    try {
        const data = await scrapeProductPage(url);
        res.json(data);
    } catch (e) {
        console.error('Scrape error:', e);
        res.status(500).json({ error: 'Failed to scrape: ' + e.message });
    }
});

// Auto-find a product URL
app.post('/api/auto-find-url', async (req, res) => {
    const { query, googleApiKey, googleCseId } = req.body;
    if (!query) return res.status(400).json({ error: 'Query is required' });

    try {
        const url = await autoFindProductUrl(query, { googleApiKey, googleCseId });
        if (url) {
            res.json({ url });
        } else {
            res.status(404).json({ error: 'Could not automatically find a valid URL' });
        }
    } catch (e) {
        console.error('Auto-find error:', e);
        res.status(500).json({ error: 'Auto-find failed: ' + e.message });
    }
});

// Suggest categories for a product
app.post('/api/suggest-categories', (req, res) => {
    const { name, description } = req.body;
    const suggestions = suggestCategories(name || '', description || '');
    res.json(suggestions);
});



// Generate content with Gemini AI
app.post('/api/generate', async (req, res) => {
    const { product, fields, geminiApiKey } = req.body;
    
    if (!geminiApiKey) {
        return res.status(400).json({ error: 'No Gemini API key provided.' });
    }
    if (!product || !product.sku) return res.status(400).json({ error: 'Product with SKU is required' });

    const fieldsToGenerate = fields || ['shortDescription', 'description', 'features', 'categories'];

    try {
        const result = await generateProductContent(
            geminiApiKey,
            product,
            fieldsToGenerate,
            getAllCategories()
        );
        res.json(result);
    } catch (e) {
        console.error('Gemini error:', e);
        res.status(500).json({ error: 'AI generation failed: ' + e.message });
    }
});

// Download an image
app.post('/api/download-image', async (req, res) => {
    const { imageUrl, sku, productName } = req.body;
    if (!imageUrl || !sku) return res.status(400).json({ error: 'imageUrl and sku required' });

    try {
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const contentType = response.headers.get('content-type') || '';
        let ext = '.jpg';
        if (contentType.includes('png')) ext = '.png';
        else if (contentType.includes('webp')) ext = '.webp';
        else if (contentType.includes('gif')) ext = '.gif';

        const slug = (productName || sku)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .substring(0, 60);

        const filename = `${sku}-${slug}${ext}`;
        const skuDir = path.join(IMAGES_DIR, sku);
        if (!fs.existsSync(skuDir)) fs.mkdirSync(skuDir, { recursive: true });

        const filePath = path.join(skuDir, filename);
        const buffer = Buffer.from(await response.arrayBuffer());
        fs.writeFileSync(filePath, buffer);

        res.json({
            filename,
            localPath: `/data/images/${sku}/${filename}`,
            size: buffer.length
        });
    } catch (e) {
        console.error('Image download error:', e);
        res.status(500).json({ error: 'Failed to download image: ' + e.message });
    }
});

// Export ZIP of all approved images (fetches them directly to zip in memory)
app.post('/api/export-images', async (req, res) => {
    const { images } = req.body; // Array of {url, filename, sku}
    if (!images || !Array.isArray(images) || images.length === 0) {
        return res.status(400).send('No images provided for export.');
    }

    try {
        const zip = new AdmZip();
        let addedCount = 0;
        const fetch = (await import('node-fetch')).default;

        // Fetch each image and add it directly to the ZIP buffer
        // Note: Done sequentially to avoid overwhelming memory on Vercel instance
        for (const img of images) {
            try {
                const response = await fetch(img.url, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
                    timeout: 5000
                });
                if (response.ok) {
                    const buffer = Buffer.from(await response.arrayBuffer());
                    // Organize inside SKU folders within the ZIP
                    zip.addFile(`${img.sku}/${img.filename}`, buffer);
                    addedCount++;
                }
            } catch (err) {
                console.error(`Failed to fetch image for ZIP: ${img.url}`, err);
            }
        }

        if (addedCount === 0) {
            return res.status(404).send('Failed to fetch any images for export.');
        }

        const zipName = `briants-images-${Date.now()}.zip`;
        const zipBuffer = zip.toBuffer();

        res.set('Content-Type', 'application/zip');
        res.set('Content-Disposition', `attachment; filename="${zipName}"`);
        res.set('Content-Length', zipBuffer.length);
        res.send(zipBuffer);

    } catch (e) {
        console.error('ZIP generation error:', e);
        res.status(500).send('Failed to generate ZIP: ' + e.message);
    }
});

// Export WooCommerce CSV
app.post('/api/export-csv', (req, res) => {
    const domain = req.body.domain || 'briantsofrisborough.co.uk';
    const productsToExport = req.body.products || [];

    // Prepare a map of all parents and their children
    const parentChildrenMap = {};
    productsToExport.forEach(p => {
        if (p.isVariation && p.parentSku) {
            if (!parentChildrenMap[p.parentSku]) {
                parentChildrenMap[p.parentSku] = [];
            }
            parentChildrenMap[p.parentSku].push(p);
        }
    });

    // Helper to generate a generic row struct
    const generateBaseRow = (p) => {
        const approvedImages = (p.images || [])
            .filter(img => img.approved && img.filename)
            .map(img => `https://${domain}/wp-content/uploads/${img.filename}`);

        const categoryStr = (p.categories || []).join(', ');

        const baseRow = {
            'ID': '',
            'SKU': p.sku,
            'Name': p.name,
            'Published': 1,
            'Is featured?': 0,
            'Visibility in catalog': 'visible',
            'Short description': p.shortDescription || '',
            'Description': p.longDescription || '',
            'Date sale price starts': '',
            'Date sale price ends': '',
            'Tax status': 'taxable',
            'Tax class': '',
            'In stock?': 1,
            'Stock': '',
            'Low stock amount': '',
            'Backorders allowed?': 0,
            'Sold individually?': 0,
            'Weight (kg)': '',
            'Length (cm)': '',
            'Width (cm)': '',
            'Height (cm)': '',
            'Allow customer reviews?': 1,
            'Purchase note': '',
            'Sale price': '',
            'Categories': categoryStr,
            'Tags': '',
            'Shipping class': '',
            'Download limit': '',
            'Download expiry days': '',
            'Parent': '',
            'Grouped products': '',
            'Upsells': '',
            'Cross-sells': '',
            'External URL': '',
            'Button text': '',
            'Position': 0,
            'Attribute 1 name': '',
            'Attribute 1 value(s)': '',
            'Attribute 1 visible': '',
            'Attribute 1 global': ''
        };

        // Add dynamically numbered image columns
        approvedImages.forEach((imgUrl, i) => {
            baseRow[`Image ${i + 1}`] = imgUrl;
        });

        return baseRow;
    };

    const rows = productsToExport.flatMap(p => {
        // Simple Products
        if (!p.isVariation && p.type !== 'variable') {
            return [{
                ...generateBaseRow(p),
                'Type': 'simple',
                'Regular price': p.price || ''
            }];
        }

        // Parent (Variable) Products
        if (p.type === 'variable') {
            const attrName = p.globalAttributeName || 'Option';
            const children = parentChildrenMap[p.sku] || [];

            // Gather all distinct values from children bridging to this parent
            const allValues = children
                .map(c => c.variationValue)
                .filter(Boolean)
                .join(', ');

            return [{
                ...generateBaseRow(p),
                'Type': 'variable',
                'Regular price': '', // Left empty on parent per instruction
                'Attribute 1 name': attrName,
                'Attribute 1 value(s)': allValues,
                'Attribute 1 global': 1,
                'Attribute 1 visible': 1
            }];
        }

        // Child (Variation) Products
        if (p.isVariation) {
            // Find parent to inherit attribute name (fallback to 'Option')
            const parent = productsToExport.find(x => x.sku === p.parentSku);
            const attrName = parent?.globalAttributeName || 'Option';

            return [{
                ...generateBaseRow(p),
                'Type': 'variation',
                'Regular price': p.price || '',
                'Parent': p.parentSku || '',
                'Attribute 1 name': attrName,
                'Attribute 1 value(s)': p.variationValue || '',
                'Attribute 1 global': 1,
                'Attribute 1 visible': ''
            }];
        }

        return [];
    });

    // We must ensure that our CSV headers contain enough Image columns for the product with the most images
    let maxImages = 0;
    rows.forEach(row => {
        let count = 0;
        while (row[`Image ${count + 1}`]) count++;
        if (count > maxImages) maxImages = count;
    });

    // Pre-fill empty image columns on all rows so the CSV library outputs consistent headers for all
    rows.forEach(row => {
        for (let i = 1; i <= maxImages; i++) {
            if (!row[`Image ${i}`]) row[`Image ${i}`] = '';
        }
    });

    const csv = stringify(rows, { header: true });
    const filename = `briants-products-${Date.now()}.csv`;
    // Return CSV buffer directly
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
});

// Export for Vercel serverless function
export default app;

// Only listen when running locally (not on Vercel)
if (!IS_VERCEL) {
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
        console.log(`\n  🚀 Briants Product Builder API running on http://localhost:${PORT}`);
        console.log(`  ⚡ Stateless Mode Active\n`);
    });
}
