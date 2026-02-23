/**
 * Briants Product Builder — Main Application
 * Single-page app with Upload → Workspace → Export views
 */

import * as API from './api.js';

// ════════════════════════════════════════════════
// STATE
// ════════════════════════════════════════════════
const state = {
    products: [],
    allCategories: [],
    currentView: 'upload',
    currentSku: null,
    filter: 'all',
    searchQuery: ''
};

// ════════════════════════════════════════════════
// INITIALIZATION
// ════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
    setupNavigation();
    setupUploadView();
    setupWorkspaceView();
    setupExportView();
    setupSectionToggles();
    setupSettings();
    setupTheme();

    // Load existing data
    try {
        state.products = await API.getProducts();
        state.allCategories = await API.getCategories();
        if (state.products.length > 0) {
            showView('workspace');
        }
    } catch (e) {
        // Server may not be running yet, that's OK
        console.warn('Could not load initial data:', e.message);
    }

    updateStats();
});

// ════════════════════════════════════════════════
// NAVIGATION
// ════════════════════════════════════════════════
function setupNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            showView(btn.dataset.view);
        });
    });
}

function showView(viewName) {
    state.currentView = viewName;

    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`${viewName}-view`).classList.add('active');

    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.nav-btn[data-view="${viewName}"]`).classList.add('active');

    if (viewName === 'workspace') renderQueue();
    if (viewName === 'export') updateExportStats();
    updateStats();
}

// ════════════════════════════════════════════════
// STATS
// ════════════════════════════════════════════════
function updateStats() {
    const total = state.products.length;
    const pending = state.products.filter(p => p.status === 'pending' || p.status === 'searching').length;
    const complete = state.products.filter(p => p.status === 'complete').length;

    setText('stat-total', total);
    setText('stat-pending', pending);
    setText('stat-complete', complete);
}

// ════════════════════════════════════════════════
// UPLOAD VIEW
// ════════════════════════════════════════════════
function setupUploadView() {
    const zone = document.getElementById('upload-zone');
    const input = document.getElementById('csv-input');
    const browseBtn = document.getElementById('browse-btn');
    const confirmBtn = document.getElementById('confirm-upload-btn');

    // Browse button
    browseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        input.click();
    });

    // Click zone
    zone.addEventListener('click', () => input.click());

    // Drag & drop
    zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('drag-over');
    });

    zone.addEventListener('dragleave', () => {
        zone.classList.remove('drag-over');
    });

    zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelect(file);
    });

    // File input change
    input.addEventListener('change', () => {
        if (input.files[0]) handleFileSelect(input.files[0]);
    });

    // Confirm upload
    confirmBtn.addEventListener('click', () => confirmUpload());
}

let pendingFile = null;

function handleFileSelect(file) {
    if (!file.name.match(/\.(csv|txt)$/i)) {
        toast('Please select a CSV file', 'error');
        return;
    }

    pendingFile = file;

    // Preview: parse client-side for quick display
    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target.result;
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        if (lines.length < 2) {
            toast('CSV file appears empty', 'error');
            return;
        }

        // Simple CSV parse for preview
        const headers = parseCSVLine(lines[0]);
        const rows = lines.slice(1).map(l => parseCSVLine(l));

        // Find column indices
        const skuIdx = findColIndex(headers, ['sku', 'sku number']);
        const nameIdx = findColIndex(headers, ['name', 'product name', 'product_name']);
        const priceIdx = findColIndex(headers, ['price', 'regular price', 'regular_price']);

        if (skuIdx === -1 || nameIdx === -1) {
            toast('Could not find SKU and Name columns in your CSV', 'error');
            return;
        }

        // Render preview table
        const tbody = document.getElementById('preview-tbody');
        tbody.innerHTML = '';

        const previewRows = rows.slice(0, 50);
        previewRows.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
        <td>${esc(row[skuIdx] || '')}</td>
        <td>${esc(row[nameIdx] || '')}</td>
        <td>${priceIdx !== -1 ? esc(row[priceIdx] || '') : '-'}</td>
      `;
            tbody.appendChild(tr);
        });

        setText('preview-count', `${rows.length} products found${rows.length > 50 ? ' (showing first 50)' : ''}`);

        show('upload-preview');
        toast(`Found ${rows.length} products in CSV`, 'success');
    };
    reader.readAsText(file);
}

async function confirmUpload() {
    if (!pendingFile) return;

    show('upload-progress');
    const fill = document.getElementById('progress-fill');
    const status = document.getElementById('upload-status');

    fill.style.width = '30%';
    status.textContent = 'Uploading and parsing CSV...';

    try {
        const result = await API.uploadCSV(pendingFile);

        fill.style.width = '100%';
        status.textContent = result.message;

        state.products = await API.getProducts();
        updateStats();

        toast(result.message, 'success');

        // Switch to workspace after brief delay
        setTimeout(() => {
            showView('workspace');
        }, 1000);

    } catch (e) {
        fill.style.width = '100%';
        fill.style.background = 'var(--accent-red)';
        status.textContent = 'Error: ' + e.message;
        toast('Upload failed: ' + e.message, 'error');
    }

    pendingFile = null;
}

// ════════════════════════════════════════════════
// WORKSPACE VIEW — QUEUE SIDEBAR
// ════════════════════════════════════════════════
function setupWorkspaceView() {
    // Filter
    document.getElementById('status-filter').addEventListener('change', (e) => {
        state.filter = e.target.value;
        renderQueue();
    });

    // Search
    document.getElementById('queue-search').addEventListener('input', (e) => {
        state.searchQuery = e.target.value.toLowerCase();
        renderQueue();
    });

    // Search & Scrape
    document.getElementById('google-search-btn').addEventListener('click', googleSearch);
    document.getElementById('scrape-btn').addEventListener('click', scrapeProduct);
    document.getElementById('confirmed-url').addEventListener('change', (e) => {
        if (state.currentSku) {
            const p = getProduct(state.currentSku);
            if (p) p.confirmedUrl = e.target.value;
        }
    });

    // Save
    document.getElementById('save-product-btn').addEventListener('click', saveCurrentProduct);

    // AI Generate
    document.getElementById('ai-generate-btn').addEventListener('click', aiGenerateContent);

    // Clear Workspace
    document.getElementById('clear-all-btn').addEventListener('click', clearWorkspace);

    // Status change
    document.getElementById('editor-status').addEventListener('change', (e) => {
        const p = getProduct(state.currentSku);
        if (p) p.status = e.target.value;
    });

    // Short description char count
    document.getElementById('short-desc').addEventListener('input', (e) => {
        setText('short-desc-count', `${e.target.value.length} chars`);
    });

    // Features preview
    document.getElementById('features-html').addEventListener('input', (e) => {
        document.getElementById('features-preview').innerHTML = e.target.value;
    });

    // Add image URL
    document.getElementById('add-image-btn').addEventListener('click', () => {
        const url = document.getElementById('add-image-url').value.trim();
        if (!url) return;
        const p = getProduct(state.currentSku);
        if (p) {
            p.images.push({ url, approved: false, filename: '' });
            document.getElementById('add-image-url').value = '';
            renderImages(p);
        }
    });

    // Add source link
    document.getElementById('add-source-btn').addEventListener('click', () => {
        const url = document.getElementById('add-source-url').value.trim();
        if (!url) return;
        const p = getProduct(state.currentSku);
        if (p) {
            p.sourceLinks.push(url);
            document.getElementById('add-source-url').value = '';
            renderSourceLinks(p);
        }
    });

    // Category search
    document.getElementById('cat-search').addEventListener('input', (e) => {
        renderAllCategories(e.target.value.toLowerCase());
    });
}

function renderQueue() {
    const container = document.getElementById('product-queue');
    container.innerHTML = '';

    let filtered = state.products;

    if (state.filter !== 'all') {
        filtered = filtered.filter(p => p.status === state.filter);
    }

    if (state.searchQuery) {
        filtered = filtered.filter(p =>
            p.name.toLowerCase().includes(state.searchQuery) ||
            p.sku.toLowerCase().includes(state.searchQuery)
        );
    }

    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state" style="padding:40px"><p>No products found</p></div>';
        return;
    }

    filtered.forEach(p => {
        const item = document.createElement('div');
        item.className = `queue-item${p.sku === state.currentSku ? ' active' : ''}`;
        item.innerHTML = `
      <span class="status-dot ${p.status}"></span>
      <div class="queue-item-info">
        <div class="queue-item-name">${esc(p.name)}</div>
        <div class="queue-item-sku">${esc(p.sku)}${p.price ? ' · £' + p.price : ''}</div>
      </div>
    `;
        item.addEventListener('click', () => selectProduct(p.sku));
        container.appendChild(item);
    });
}

// ════════════════════════════════════════════════
// WORKSPACE VIEW — PRODUCT EDITOR
// ════════════════════════════════════════════════
function selectProduct(sku) {
    state.currentSku = sku;
    const p = getProduct(sku);
    if (!p) return;

    hide('no-product-selected');
    show('editor-panel');

    // Header
    setText('editor-sku', p.sku);
    setText('editor-name', p.name);
    setText('editor-price', p.price ? `£${p.price}` : 'No price');
    document.getElementById('editor-status').value = p.status;

    // Search
    document.getElementById('confirmed-url').value = p.confirmedUrl || '';

    // Descriptions
    document.getElementById('short-desc').value = p.shortDescription || '';
    document.getElementById('long-desc').value = p.longDescription || '';
    document.getElementById('features-html').value = p.featuresHtml || '';
    setText('short-desc-count', `${(p.shortDescription || '').length} chars`);
    document.getElementById('features-preview').innerHTML = p.featuresHtml || '';

    // Categories
    renderSuggestedCategories(p);
    renderSelectedCategories(p);
    renderAllCategories('');

    // Images
    renderImages(p);

    // Source links
    renderSourceLinks(p);

    // Notes
    document.getElementById('product-notes').value = p.notes || '';

    // Re-render queue to update active state
    renderQueue();
}

function googleSearch() {
    const p = getProduct(state.currentSku);
    if (!p) return;
    const query = encodeURIComponent(p.name);
    window.open(`https://www.google.co.uk/search?q=${query}`, '_blank');
    toast('Google search opened in new tab — paste the correct URL below', 'info');
}

async function scrapeProduct() {
    const url = document.getElementById('confirmed-url').value.trim();
    if (!url) {
        toast('Please enter a product URL first', 'error');
        return;
    }

    const p = getProduct(state.currentSku);
    if (!p) return;

    const statusEl = document.getElementById('scrape-status');
    statusEl.className = 'scrape-status loading';
    statusEl.textContent = '🔄 Scraping product page...';
    show('scrape-status', statusEl);

    try {
        const data = await API.scrapeUrl(url);
        p.scrapedData = data;
        p.confirmedUrl = url;
        p.status = 'confirmed';

        // Auto-fill descriptions
        if (!p.shortDescription) {
            if (data.shortDescription) {
                p.shortDescription = data.shortDescription;
            } else if (data.metaDescription) {
                p.shortDescription = data.metaDescription;
            } else if (data.description) {
                const sentences = data.description.split(/[.!?]+/).filter(s => s.trim().length > 10);
                p.shortDescription = sentences.slice(0, 2).join('. ').trim() + '.';
            }
        }

        if (data.description && !p.longDescription) {
            p.longDescription = data.description;
        }

        if (data.features && data.features.length > 0 && !p.featuresHtml) {
            const lis = data.features.map(f => `  <li>${esc(f)}</li>`).join('\n');
            p.featuresHtml = `<ul>\n${lis}\n</ul>`;
        }

        // Add images from scraping
        if (data.images && data.images.length > 0) {
            const existingUrls = new Set(p.images.map(i => i.url));
            data.images.forEach(imgUrl => {
                if (!existingUrls.has(imgUrl)) {
                    p.images.push({ url: imgUrl, approved: false, filename: '' });
                }
            });
        }

        // Add source link
        if (!p.sourceLinks.includes(url)) {
            p.sourceLinks.push(url);
        }

        // Suggest categories
        const suggestions = await API.suggestCategories(p.name, data.description || '');
        p.suggestedCategories = suggestions;

        // Refresh editor
        selectProduct(p.sku);

        statusEl.className = 'scrape-status success';
        statusEl.textContent = '✅ Successfully scraped product info!';
        toast('Product info scraped successfully', 'success');

    } catch (e) {
        statusEl.className = 'scrape-status error';
        statusEl.textContent = '❌ Failed: ' + e.message;
        toast('Scrape failed: ' + e.message, 'error');
    }
}

async function aiGenerateContent() {
    const p = getProduct(state.currentSku);
    if (!p) return;

    // Determine which fields need generating
    const fields = [];
    if (!p.shortDescription) fields.push('shortDescription');
    if (!p.longDescription) fields.push('description');
    if (!p.featuresHtml) fields.push('features');
    if (!p.categories || p.categories.length === 0) fields.push('categories');

    if (fields.length === 0) {
        toast('All fields already have content!', 'info');
        return;
    }

    const btn = document.getElementById('ai-generate-btn');
    const original = btn.textContent;
    btn.textContent = '🤖 Generating...';
    btn.disabled = true;

    try {
        // Save current form state first
        p.shortDescription = document.getElementById('short-desc').value;
        p.longDescription = document.getElementById('long-desc').value;
        p.featuresHtml = document.getElementById('features-html').value;
        p.notes = document.getElementById('product-notes').value;
        await API.updateProduct(p.sku, p);

        const result = await API.generateWithAI(p.sku, fields);

        // Apply results to product
        if (result.shortDescription && !p.shortDescription) {
            p.shortDescription = result.shortDescription;
        }
        if (result.description && !p.longDescription) {
            p.longDescription = result.description;
        }
        if (result.features && result.features.length > 0 && !p.featuresHtml) {
            const lis = result.features.map(f => `  <li>${esc(f)}</li>`).join('\n');
            p.featuresHtml = `<ul>\n${lis}\n</ul>`;
        }
        if (result.categories && result.categories.length > 0 && p.categories.length === 0) {
            p.categories = result.categories;
        }

        await API.updateProduct(p.sku, p);

        // Refresh editor
        selectProduct(p.sku);
        toast(`AI generated ${fields.length} field(s) successfully!`, 'success');

    } catch (e) {
        toast('AI generation failed: ' + e.message, 'error');
    } finally {
        btn.textContent = original;
        btn.disabled = false;
    }
}

async function saveCurrentProduct() {
    const p = getProduct(state.currentSku);
    if (!p) return;

    // Gather form values
    p.status = document.getElementById('editor-status').value;
    p.confirmedUrl = document.getElementById('confirmed-url').value;
    p.shortDescription = document.getElementById('short-desc').value;
    p.longDescription = document.getElementById('long-desc').value;
    p.featuresHtml = document.getElementById('features-html').value;
    p.notes = document.getElementById('product-notes').value;

    try {
        await API.updateProduct(p.sku, p);
        toast('Product saved ✓', 'success');
        updateStats();
        renderQueue();
    } catch (e) {
        toast('Save failed: ' + e.message, 'error');
    }
}

async function clearWorkspace() {
    if (!confirm('Are you sure you want to clear the workspace? All uploaded data and progress will be lost. This cannot be undone.')) {
        return;
    }

    try {
        await API.resetAll();
        state.products = [];
        state.currentSku = null;

        hide('editor-panel');
        show('no-product-selected');

        renderQueue();
        updateStats();
        toast('Workspace cleared successfully', 'success');

        showView('upload');
    } catch (e) {
        toast('Failed to clear workspace: ' + e.message, 'error');
    }
}

// ─── Categories ────────────────────────────────
function renderSuggestedCategories(product) {
    const container = document.getElementById('suggested-categories');
    container.innerHTML = '';

    const suggestions = product.suggestedCategories || [];
    if (suggestions.length === 0) {
        container.innerHTML = '<span style="color:var(--text-muted);font-size:0.8rem">Scrape a product to get suggestions</span>';
        return;
    }

    suggestions.forEach(s => {
        const isSelected = product.categories.includes(s.path);
        const chip = document.createElement('span');
        chip.className = `cat-chip${isSelected ? ' selected' : ''}`;
        chip.innerHTML = `${esc(s.path)} <span class="cat-score">(${s.score})</span>`;
        chip.addEventListener('click', () => {
            toggleCategory(product, s.path);
            renderSuggestedCategories(product);
            renderSelectedCategories(product);
        });
        container.appendChild(chip);
    });
}

function renderSelectedCategories(product) {
    const container = document.getElementById('selected-categories');
    container.innerHTML = '';

    if (product.categories.length === 0) {
        container.innerHTML = '<span style="color:var(--text-muted);font-size:0.8rem;padding:4px">No categories selected</span>';
        return;
    }

    product.categories.forEach(cat => {
        const tag = document.createElement('span');
        tag.className = 'selected-cat-tag';
        tag.innerHTML = `${esc(cat)} <span class="remove-cat" title="Remove">×</span>`;
        tag.querySelector('.remove-cat').addEventListener('click', () => {
            product.categories = product.categories.filter(c => c !== cat);
            renderSelectedCategories(product);
            renderSuggestedCategories(product);
        });
        container.appendChild(tag);
    });
}

function renderAllCategories(filter) {
    const container = document.getElementById('all-categories');
    container.innerHTML = '';

    const p = getProduct(state.currentSku);
    if (!p) return;

    let cats = state.allCategories;
    if (filter) {
        cats = cats.filter(c => c.toLowerCase().includes(filter));
    }

    // Show max 50
    cats.slice(0, 50).forEach(catPath => {
        const item = document.createElement('div');
        item.className = 'cat-list-item';
        item.textContent = catPath;
        item.addEventListener('click', () => {
            toggleCategory(p, catPath);
            renderSelectedCategories(p);
            renderSuggestedCategories(p);
        });
        container.appendChild(item);
    });
}

function toggleCategory(product, catPath) {
    const idx = product.categories.indexOf(catPath);
    if (idx === -1) {
        product.categories.push(catPath);
    } else {
        product.categories.splice(idx, 1);
    }
}

// ─── Images ────────────────────────────────────
function renderImages(product) {
    const gallery = document.getElementById('image-gallery');
    gallery.innerHTML = '';

    if (product.images.length === 0) {
        gallery.innerHTML = '<span style="color:var(--text-muted);font-size:0.8rem">No images yet — scrape a product or add URLs</span>';
        return;
    }

    product.images.forEach((img, idx) => {
        const card = document.createElement('div');
        card.className = `image-card${img.approved ? ' approved' : ''}`;
        card.innerHTML = `
      <img src="${esc(img.url)}" alt="Product image ${idx + 1}" loading="lazy"
        onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22150%22 height=%22150%22><rect fill=%22%23222%22 width=%22150%22 height=%22150%22/><text fill=%22%23666%22 x=%2275%22 y=%2275%22 text-anchor=%22middle%22 dy=%22.3em%22 font-size=%2212%22>Failed to load</text></svg>'">
      ${img.approved ? '<div class="image-badge">✓</div>' : ''}
      <div class="image-overlay">
        <div class="image-actions">
          <button class="btn btn-sm ${img.approved ? 'btn-danger' : 'btn-success'}" data-action="toggle">
            ${img.approved ? '✗ Reject' : '✓ Approve'}
          </button>
          <button class="btn btn-sm btn-secondary" data-action="remove">🗑️</button>
        </div>
      </div>
    `;

        card.querySelector('[data-action="toggle"]').addEventListener('click', async (e) => {
            e.stopPropagation();
            img.approved = !img.approved;

            // If approving, download the image
            if (img.approved && !img.filename) {
                try {
                    toast('Downloading image...', 'info');
                    const result = await API.downloadImage(img.url, product.sku, product.name);
                    img.filename = result.filename;
                    img.localPath = result.localPath;
                    toast('Image downloaded: ' + result.filename, 'success');
                } catch (e) {
                    toast('Image download failed: ' + e.message, 'error');
                    img.approved = false;
                }
            }

            renderImages(product);
        });

        card.querySelector('[data-action="remove"]').addEventListener('click', (e) => {
            e.stopPropagation();
            product.images.splice(idx, 1);
            renderImages(product);
        });

        gallery.appendChild(card);
    });
}

// ─── Source Links ──────────────────────────────
function renderSourceLinks(product) {
    const container = document.getElementById('source-links');
    container.innerHTML = '';

    product.sourceLinks.forEach((url, idx) => {
        const item = document.createElement('div');
        item.className = 'source-link-item';
        item.innerHTML = `
      <span>🔗</span>
      <a href="${esc(url)}" target="_blank" rel="noopener">${esc(url)}</a>
      <span class="remove-link" title="Remove">×</span>
    `;
        item.querySelector('.remove-link').addEventListener('click', () => {
            product.sourceLinks.splice(idx, 1);
            renderSourceLinks(product);
        });
        container.appendChild(item);
    });
}

// ─── Section Toggles ──────────────────────────
function setupSectionToggles() {
    document.querySelectorAll('.section-header[data-toggle]').forEach(header => {
        header.addEventListener('click', () => {
            const body = document.getElementById(header.dataset.toggle);
            body.classList.toggle('collapsed');
            const icon = header.querySelector('.toggle-icon');
            icon.textContent = body.classList.contains('collapsed') ? '▶' : '▼';
        });
    });
}

// ════════════════════════════════════════════════
// EXPORT VIEW
// ════════════════════════════════════════════════
function setupExportView() {
    document.getElementById('export-csv-btn').addEventListener('click', () => {
        const domain = document.getElementById('export-domain').value.trim() || 'briantsofrisborough.co.uk';
        window.open(API.getExportUrl(domain), '_blank');
        toast('WooCommerce CSV downloading...', 'success');
    });

    document.getElementById('export-all-btn').addEventListener('click', async () => {
        // Mark all as complete temporarily for export
        const domain = document.getElementById('export-domain').value.trim() || 'briantsofrisborough.co.uk';
        const originalStatuses = {};
        state.products.forEach(p => {
            originalStatuses[p.sku] = p.status;
            p.status = 'complete';
        });

        // Save all as complete
        for (const p of state.products) {
            await API.updateProduct(p.sku, p);
        }

        window.open(API.getExportUrl(domain), '_blank');

        // Restore original statuses
        for (const p of state.products) {
            p.status = originalStatuses[p.sku];
            await API.updateProduct(p.sku, p);
        }

        toast('Full export downloaded (all products included)', 'info');
    });

    document.getElementById('export-images-btn').addEventListener('click', () => {
        const approvedCount = state.products.reduce((count, p) => {
            return count + (p.images ? p.images.filter(img => img.approved && img.filename).length : 0);
        }, 0);

        if (approvedCount === 0) {
            toast('No approved images to download. Approve some images first.', 'error');
            return;
        }

        window.open('/api/export-images', '_blank');
        toast('Image ZIP downloading...', 'success');
    });
}

function updateExportStats() {
    const total = state.products.length;
    const complete = state.products.filter(p => p.status === 'complete').length;

    setText('export-total', total);
    setText('export-complete', complete);
    setText('export-remaining', total - complete);
}

// ════════════════════════════════════════════════
// UTILITIES
// ════════════════════════════════════════════════
function getProduct(sku) {
    return state.products.find(p => p.sku === sku) || null;
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function show(id, el) {
    (el || document.getElementById(id)).classList.remove('hidden');
}

function hide(id, el) {
    (el || document.getElementById(id)).classList.add('hidden');
}

function esc(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Simple CSV line parser (handles quoted fields)
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

function findColIndex(headers, names) {
    const lowerHeaders = headers.map(h => h.toLowerCase().trim());
    for (const name of names) {
        const idx = lowerHeaders.indexOf(name);
        if (idx !== -1) return idx;
    }
    return -1;
}

// ─── Toast ─────────────────────────────────────
function toast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = message;
    container.appendChild(el);

    setTimeout(() => {
        el.classList.add('leaving');
        setTimeout(() => el.remove(), 300);
    }, 4000);
}

// ─── Settings Modal ───────────────────────────
function setupSettings() {
    const modal = document.getElementById('settings-modal');
    const keyInput = document.getElementById('gemini-api-key');
    const saveBtn = document.getElementById('save-settings-btn');
    const statusEl = document.getElementById('settings-status');

    document.getElementById('settings-btn').addEventListener('click', () => {
        modal.classList.remove('hidden');
    });

    document.getElementById('close-settings').addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    // Close on overlay click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.add('hidden');
    });

    saveBtn.addEventListener('click', async () => {
        const key = keyInput.value.trim();
        if (!key) {
            statusEl.textContent = 'Please enter a key';
            statusEl.className = 'settings-status';
            return;
        }

        try {
            const result = await API.saveSettings({ geminiApiKey: key });
            statusEl.textContent = `Key saved: ${result.geminiApiKey}`;
            statusEl.className = 'settings-status saved';
            keyInput.value = '';
            toast('Gemini API key saved!', 'success');

            // Auto-close after a moment
            setTimeout(() => modal.classList.add('hidden'), 1500);
        } catch (e) {
            statusEl.textContent = 'Failed to save: ' + e.message;
            statusEl.className = 'settings-status';
        }
    });

    // Load current status
    API.getSettings().then(s => {
        if (s.geminiApiKey) {
            statusEl.textContent = `Key configured: ${s.geminiApiKey}`;
            statusEl.className = 'settings-status saved';
        }
    }).catch(() => { });
}

// ─── Theme Toggle ─────────────────────────────
function setupTheme() {
    const btn = document.getElementById('theme-btn');
    if (!btn) return;

    // Check local storage or system preference
    const savedTheme = localStorage.getItem('theme');
    const systemLight = window.matchMedia('(prefers-color-scheme: light)').matches;

    const isLight = savedTheme === 'light' || (!savedTheme && systemLight);

    if (isLight) {
        document.body.setAttribute('data-theme', 'light');
        btn.textContent = '🌙';
    }

    btn.addEventListener('click', () => {
        const isCurrentlyLight = document.body.getAttribute('data-theme') === 'light';

        if (isCurrentlyLight) {
            document.body.removeAttribute('data-theme');
            localStorage.setItem('theme', 'dark');
            btn.textContent = '☀️';
            toast('Dark Mode enabled', 'info');
        } else {
            document.body.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');
            btn.textContent = '🌙';
            toast('Light Mode enabled', 'info');
        }
    });
}
