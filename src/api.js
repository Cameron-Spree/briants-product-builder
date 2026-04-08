/**
 * API helper — completely refactored for Vercel Serverless compatibility.
 * State (products/settings) is stored in the browser's localStorage.
 * The backend is used strictly for stateless processing.
 */

const BASE = '/api';

// --- Local Storage Helpers ---
function loadProducts() {
    try {
        const data = localStorage.getItem('briants_products');
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

function saveProducts(products) {
    localStorage.setItem('briants_products', JSON.stringify(products));
}

export async function getSettings() {
    try {
        const data = localStorage.getItem('briants_settings');
        return data ? JSON.parse(data) : {};
    } catch {
        return {};
    }
}

export async function saveSettings(settings) {
    const current = await getSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem('briants_settings', JSON.stringify(updated));
    return {
        geminiApiKey: updated.geminiApiKey ? '****' + updated.geminiApiKey.slice(-4) : '',
        googleApiKey: updated.googleApiKey ? '****' + updated.googleApiKey.slice(-4) : '',
        googleCseId: updated.googleCseId || ''
    };
}

// --- Fetch Wrapper ---
async function request(path, options = {}) {
    const res = await fetch(`${BASE}${path}`, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res;
}

// --- API Methods ---

export async function getProducts() {
    return loadProducts();
}

export async function getCategories() {
    const res = await request('/categories');
    return res.json();
}

export async function uploadCSV(file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${BASE}/upload-csv`, { method: 'POST', body: formData });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || `HTTP ${res.status}`);
    }
    const data = await res.json();
    
    // Merge new parsed products with local state
    const products = loadProducts();
    const existingSkus = new Set(products.map(p => p.sku));
    let addedCount = 0;
    for (const p of data.products) {
        if (!existingSkus.has(p.sku)) {
            products.push(p);
            addedCount++;
        }
    }
    saveProducts(products);
    
    return {
        message: `Added ${addedCount} new products (${data.products.length - addedCount} duplicates skipped)`,
        total: products.length,
        added: addedCount
    };
}

export async function updateProduct(sku, data) {
    const products = loadProducts();
    
    // Process new parent def locally
    if (data.newParentDef) {
        const parent = {
            sku: data.newParentDef.sku,
            name: data.newParentDef.name,
            type: 'variable',
            globalAttributeName: data.newParentDef.globalAttributeName,
            status: 'complete',
            categories: [...(data.categories || [])]
        };
        if (!products.some(x => x.sku === parent.sku)) {
            products.push(parent);
        }
        data.parentSku = parent.sku;
        delete data.newParentDef;
    }

    const idx = products.findIndex(p => p.sku === sku);
    if (idx === -1) throw new Error('Product not found');

    products[idx] = { ...products[idx], ...data };
    saveProducts(products);
    return products[idx];
}

export async function scrapeUrl(url) {
    const res = await request('/scrape', {
        method: 'POST',
        body: JSON.stringify({ url })
    });
    return res.json();
}

export async function suggestCategories(name, description) {
    const res = await request('/suggest-categories', {
        method: 'POST',
        body: JSON.stringify({ name, description })
    });
    return res.json();
}

export async function downloadImage(imageUrl, sku, productName) {
    // Images are downloaded to server /tmp, which is ephemeral.
    // They must be exported immediately or URLs preserved. 
    const res = await request('/download-image', {
        method: 'POST',
        body: JSON.stringify({ imageUrl, sku, productName })
    });
    return res.json();
}

export async function deleteProduct(sku) {
    const products = loadProducts();
    const idx = products.findIndex(p => p.sku === sku);
    if (idx === -1) throw new Error('Product not found');
    products.splice(idx, 1);
    saveProducts(products);
    return { message: 'Deleted' };
}

export async function resetAll() {
    saveProducts([]);
    return { message: 'All products cleared' };
}

export async function getStats() {
    const products = loadProducts();
    return {
        total: products.length,
        pending: products.filter(p => p.status === 'pending').length,
        confirmed: products.filter(p => p.status === 'confirmed').length,
        complete: products.filter(p => p.status === 'complete').length
    };
}

export async function generateWithAI(product, fields) {
    const settings = await getSettings();
    if (!settings.geminiApiKey) {
        throw new Error('No Gemini API key set. Go to Settings to add it.');
    }
    const res = await request('/generate', {
        method: 'POST',
        body: JSON.stringify({ 
            product, 
            fields,
            geminiApiKey: settings.geminiApiKey 
        })
    });
    return res.json();
}

// Replaces getExportUrl -> executes POST returning blob
export async function exportCSVFile(domain) {
    const products = loadProducts();
    const res = await fetch(`${BASE}/export-csv`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, products: products.filter(p => p.status === 'complete') })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.blob();
}

export async function exportImagesFile() {
    const products = loadProducts();
    const imagesToExport = [];
    products.forEach(p => {
        if (p.images) {
            p.images.filter(img => img.approved).forEach(img => {
                imagesToExport.push({
                    url: img.url,
                    filename: img.filename || `${p.sku}-image.jpg`,
                    sku: p.sku
                });
            });
        }
    });
    
    if (imagesToExport.length === 0) throw new Error('No approved images found to export.');
    
    const res = await fetch(`${BASE}/export-images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: imagesToExport })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.blob();
}
