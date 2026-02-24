/**
 * API helper — all fetch calls to the Express backend
 */

const BASE = '/api';

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

export async function getProducts() {
    const res = await request('/products');
    return res.json();
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
    return res.json();
}

export async function updateProduct(sku, data) {
    const res = await request(`/products/${encodeURIComponent(sku)}`, {
        method: 'POST',
        body: JSON.stringify(data)
    });
    return res.json();
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
    const res = await request('/download-image', {
        method: 'POST',
        body: JSON.stringify({ imageUrl, sku, productName })
    });
    return res.json();
}

export async function deleteProduct(sku) {
    const res = await request(`/products/${encodeURIComponent(sku)}`, { method: 'DELETE' });
    return res.json();
}

export async function resetAll() {
    const res = await request('/reset', { method: 'POST' });
    return res.json();
}

export function getExportUrl(domain) {
    return `${BASE}/export-csv?domain=${encodeURIComponent(domain)}`;
}

export async function getStats() {
    const res = await request('/stats');
    return res.json();
}

export async function generateWithAI(sku, fields) {
    const res = await request('/generate', {
        method: 'POST',
        body: JSON.stringify({ sku, fields })
    });
    return res.json();
}

export async function saveSettings(settings) {
    const res = await request('/settings', {
        method: 'POST',
        body: JSON.stringify(settings)
    });
    return res.json();
}

export async function getSettings() {
    const res = await request('/settings');
    return res.json();
}
