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
const DATA_DIR = path.join(__dirname, '..', 'data');
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

// ── State ──────────────────────────────────────────────
let products = loadProducts();
let geminiApiKey = '';  // Set via /api/settings

function loadProducts() {
    try {
        if (fs.existsSync(PRODUCTS_FILE)) {
            return JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf-8'));
        }
    } catch (e) {
        console.error('Failed to load products:', e.message);
    }
    return [];
}

function saveProducts() {
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2));
}

// ── Routes ─────────────────────────────────────────────

// Get all products
app.get('/api/products', (req, res) => {
    res.json(products);
});

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

        // Merge: don't overwrite existing products with same SKU
        const existingSkus = new Set(products.map(p => p.sku));
        let addedCount = 0;
        for (const p of newProducts) {
            if (!existingSkus.has(p.sku)) {
                products.push(p);
                addedCount++;
            }
        }

        saveProducts();
        res.json({
            message: `Added ${addedCount} new products (${newProducts.length - addedCount} duplicates skipped)`,
            total: products.length,
            added: addedCount
        });
    } catch (e) {
        console.error('CSV parse error:', e);
        res.status(400).json({ error: 'Failed to parse CSV: ' + e.message });
    } finally {
        // Clean up uploaded file
        if (req.file) fs.unlinkSync(req.file.path);
    }
});

// Update a product
app.post('/api/products/:sku', (req, res) => {
    const sku = req.params.sku;
    const data = req.body;

    // If the frontend sent up a request to create a new parent...
    if (data.newParentDef) {
        const parent = {
            sku: data.newParentDef.sku,
            name: data.newParentDef.name,
            type: 'variable',
            globalAttributeName: data.newParentDef.globalAttributeName,
            status: 'complete',
            categories: [...(data.categories || [])] // Inherit categories
        };
        // Add if not already tracking
        if (!products.some(x => x.sku === parent.sku)) {
            products.push(parent);
        }

        // Ensure child connects to it directly
        data.parentSku = parent.sku;
        delete data.newParentDef;
    }

    const idx = products.findIndex(p => p.sku === sku);
    if (idx === -1) return res.status(404).json({ error: 'Product not found' });

    products[idx] = { ...products[idx], ...data };
    saveProducts();
    res.json(products[idx]);
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
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'Query is required' });

    try {
        const url = await autoFindProductUrl(query);
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

// Set/get API settings
app.post('/api/settings', (req, res) => {
    if (req.body.geminiApiKey !== undefined) {
        geminiApiKey = req.body.geminiApiKey;
    }
    res.json({ geminiApiKey: geminiApiKey ? '****' + geminiApiKey.slice(-4) : '' });
});

app.get('/api/settings', (req, res) => {
    res.json({ geminiApiKey: geminiApiKey ? '****' + geminiApiKey.slice(-4) : '' });
});

// Generate content with Gemini AI
app.post('/api/generate', async (req, res) => {
    const { sku, fields } = req.body;
    if (!geminiApiKey) {
        return res.status(400).json({ error: 'No Gemini API key set. Go to Settings to add it.' });
    }
    if (!sku) return res.status(400).json({ error: 'SKU is required' });

    const product = products.find(p => p.sku === sku);
    if (!product) return res.status(404).json({ error: 'Product not found' });

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

// Export ZIP of all approved images
app.get('/api/export-images', (req, res) => {
    try {
        const zip = new AdmZip();
        let addedCount = 0;

        // Add all approved images from all products
        products.forEach(p => {
            if (p.images && p.images.length > 0) {
                p.images.filter(img => img.approved && img.filename).forEach(img => {
                    const skuDir = path.join(IMAGES_DIR, p.sku);
                    const imagePath = path.join(skuDir, img.filename);
                    if (fs.existsSync(imagePath)) {
                        zip.addLocalFile(imagePath);
                        addedCount++;
                    }
                });
            }
        });

        if (addedCount === 0) {
            return res.status(404).send('No approved images found to export.');
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
app.get('/api/export-csv', (req, res) => {
    const domain = req.query.domain || 'briantsofrisborough.co.uk';
    const all = req.query.all === 'true';
    const productsToExport = all ? products : products.filter(p => p.status === 'complete');

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
    const filePath = path.join(EXPORTS_DIR, filename);
    fs.writeFileSync(filePath, csv);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
});

// Delete a product
app.delete('/api/products/:sku', (req, res) => {
    const idx = products.findIndex(p => p.sku === req.params.sku);
    if (idx === -1) return res.status(404).json({ error: 'Product not found' });
    products.splice(idx, 1);
    saveProducts();
    res.json({ message: 'Deleted' });
});

// Reset all products
app.post('/api/reset', (req, res) => {
    products = [];
    saveProducts();
    res.json({ message: 'All products cleared' });
});

// Stats
app.get('/api/stats', (req, res) => {
    res.json({
        total: products.length,
        pending: products.filter(p => p.status === 'pending').length,
        confirmed: products.filter(p => p.status === 'confirmed').length,
        complete: products.filter(p => p.status === 'complete').length
    });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`\n  🚀 Briants Product Builder API running on http://localhost:${PORT}`);
    console.log(`  📦 ${products.length} products loaded\n`);
});
