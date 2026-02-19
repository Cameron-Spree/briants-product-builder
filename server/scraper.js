import * as cheerio from 'cheerio';

/**
 * Scrape a product page for info: title, description, features, specs, images
 */
export async function scrapeProductPage(url) {
    const fetch = (await import('node-fetch')).default;

    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-GB,en;q=0.9'
        },
        timeout: 15000
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove scripts, styles, nav, footer
    $('script, style, nav, footer, header, .cookie-banner, .popup, #cookie-consent').remove();

    const result = {
        title: extractTitle($),
        description: extractDescription($),
        features: extractFeatures($),
        specs: extractSpecs($),
        images: extractImages($, url),
        sourceUrl: url
    };

    return result;
}

function extractTitle($) {
    // Try structured data first
    const selectors = [
        '[itemprop="name"]',
        'h1.product-title',
        'h1.product_title',
        'h1.product-name',
        '.product-info h1',
        '.product-detail h1',
        'h1'
    ];

    for (const sel of selectors) {
        const text = $(sel).first().text().trim();
        if (text && text.length > 2 && text.length < 300) return text;
    }
    return '';
}

function extractDescription($) {
    const selectors = [
        '[itemprop="description"]',
        '.product-description',
        '.product_description',
        '#product-description',
        '.woocommerce-product-details__short-description',
        '.product-detail-description',
        '.description',
        '.product-info .description',
        '.tab-pane.active',
        '.product-detail p'
    ];

    const paragraphs = [];

    for (const sel of selectors) {
        $(sel).each((_, el) => {
            // Get all text paragraphs
            const $el = $(el);
            $el.find('p, div').each((_, child) => {
                const text = $(child).text().trim();
                if (text.length > 20 && text.length < 2000) {
                    paragraphs.push(text);
                }
            });
            // Also get direct text
            const directText = $el.text().trim();
            if (directText.length > 20 && directText.length < 2000 && !paragraphs.includes(directText)) {
                paragraphs.push(directText);
            }
        });
        if (paragraphs.length > 0) break;
    }

    // Deduplicate and limit
    const unique = [...new Set(paragraphs)];
    return unique.slice(0, 5).join('\n\n');
}

function extractFeatures($) {
    const features = [];
    const selectors = [
        '.product-features li',
        '.features li',
        '.feature-list li',
        '.product-specs li',
        '.key-features li',
        '.product-highlights li',
        '.bullets li',
        '.product-info ul li',
        '.product-detail ul li',
        '[class*="feature"] li',
        '[class*="specification"] li'
    ];

    for (const sel of selectors) {
        $(sel).each((_, el) => {
            const text = $(el).text().trim();
            if (text.length > 3 && text.length < 500) {
                features.push(text);
            }
        });
        if (features.length > 0) break;
    }

    // If no feature lists found, try to extract from description tables
    if (features.length === 0) {
        $('table').each((_, table) => {
            $(table).find('tr').each((_, row) => {
                const cells = $(row).find('td, th');
                if (cells.length === 2) {
                    const label = $(cells[0]).text().trim();
                    const value = $(cells[1]).text().trim();
                    if (label && value && label.length < 100 && value.length < 200) {
                        features.push(`${label}: ${value}`);
                    }
                }
            });
        });
    }

    return [...new Set(features)].slice(0, 20);
}

function extractSpecs($) {
    const specs = {};
    const selectors = [
        '.product-specifications',
        '.specifications',
        '.product-specs',
        '.technical-specs',
        '.tech-specs',
        '[class*="specification"]'
    ];

    for (const sel of selectors) {
        $(sel).find('tr').each((_, row) => {
            const cells = $(row).find('td, th');
            if (cells.length >= 2) {
                const key = $(cells[0]).text().trim();
                const val = $(cells[1]).text().trim();
                if (key && val) specs[key] = val;
            }
        });

        // Also try dl > dt/dd pairs
        $(sel).find('dt').each((i, dt) => {
            const key = $(dt).text().trim();
            const dd = $(dt).next('dd');
            if (dd.length) {
                specs[key] = dd.text().trim();
            }
        });

        if (Object.keys(specs).length > 0) break;
    }

    return specs;
}

function extractImages($, baseUrl) {
    const images = new Set();
    const selectors = [
        '.product-image img',
        '.product-gallery img',
        '.woocommerce-product-gallery img',
        '[itemprop="image"]',
        '.product-photo img',
        '.product-media img',
        '.gallery img',
        '.product img'
    ];

    for (const sel of selectors) {
        $(sel).each((_, img) => {
            let src = $(img).attr('data-src') || $(img).attr('data-large') ||
                $(img).attr('data-zoom-image') || $(img).attr('src') || '';

            // Resolve relative URLs
            if (src && !src.startsWith('http') && !src.startsWith('data:')) {
                try {
                    src = new URL(src, baseUrl).href;
                } catch (e) {
                    return;
                }
            }

            // Filter out tiny icons, placeholders
            if (src && src.startsWith('http') && !src.includes('placeholder') &&
                !src.includes('spinner') && !src.includes('logo') &&
                !src.includes('1x1') && !src.includes('pixel')) {
                images.add(src);
            }
        });
    }

    return [...images].slice(0, 10);
}
