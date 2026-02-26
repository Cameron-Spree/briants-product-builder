import * as cheerio from 'cheerio';

/**
 * Scrape a product page for info: title, description, features, specs, images
 * Enhanced with WooCommerce-specific selectors and OG meta fallbacks
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

    // Remove scripts, styles, nav, footer, cookie banners
    $('script, style, noscript, nav, footer, header, .cookie-banner, .popup, #cookie-consent, .site-header, .site-footer, .cart-sidebar').remove();

    const result = {
        title: extractTitle($),
        description: extractDescription($),
        shortDescription: extractShortDescription($),
        features: extractFeatures($),
        specs: extractSpecs($),
        images: extractImages($, url),
        sourceUrl: url,
        metaDescription: $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || '',
        brand: extractBrand($),
        sku: extractSku($),
        price: extractPrice($),
        rawText: extractRawText($)
    };

    return result;
}

// ─── URL Exclusion List ───────────────────────────────
const URL_EXCLUSIONS = [
    'duckduckgo.com', 'yahoo.com', 'google.com', 'amazon', 'ebay', 'wikipedia.org',
    'youtube.com', 'facebook.com', 'pinterest.com',
    'instagram.com', 'twitter.com', 'linkedin.com',
    'bing.com', 'tiktok.com', 'yell.com', 'yelp.com',
    'checkatrade.com', 'trustpilot.com', 'reddit.com'
];

function isExcludedUrl(href) {
    return URL_EXCLUSIONS.some(domain => href.includes(domain));
}

/**
 * Automatically search for a product URL.
 * Strategy: Google Custom Search API (if keys provided) → DuckDuckGo with retries.
 */
export async function autoFindProductUrl(query, { googleApiKey, googleCseId } = {}) {
    // Strategy 1: Google Custom Search API (most reliable, 100 free/day)
    if (googleApiKey && googleCseId) {
        console.log(`[Search] Trying Google Custom Search for: "${query}"`);
        try {
            const url = await googleCustomSearch(query, googleApiKey, googleCseId);
            if (url) {
                console.log(`[Search] Google found: ${url}`);
                return url;
            }
        } catch (e) {
            console.warn(`[Search] Google Custom Search failed: ${e.message}. Falling back to DuckDuckGo.`);
        }
    }

    // Strategy 2: DuckDuckGo with retries and exponential backoff
    console.log(`[Search] Trying DuckDuckGo for: "${query}"`);
    const maxRetries = 3;
    const baseDelay = 5000; // 5 seconds

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const url = await duckDuckGoSearch(query);
            if (url) {
                console.log(`[Search] DDG found (attempt ${attempt}): ${url}`);
                return url;
            }
        } catch (e) {
            console.warn(`[Search] DDG attempt ${attempt}/${maxRetries} failed: ${e.message}`);
        }

        if (attempt < maxRetries) {
            const delay = baseDelay * Math.pow(2, attempt - 1); // 5s, 10s, 20s
            console.log(`[Search] Waiting ${delay / 1000}s before retry...`);
            await new Promise(r => setTimeout(r, delay));
        }
    }

    throw new Error('No valid e-commerce URL found after trying all search methods');
}

/**
 * Google Custom Search API
 * Free: 100 queries/day. Setup: https://programmablesearchengine.google.com
 */
async function googleCustomSearch(query, apiKey, cseId) {
    const fetch = (await import('node-fetch')).default;
    const params = new URLSearchParams({
        key: apiKey,
        cx: cseId,
        q: query,
        num: '5'
    });

    const response = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`, {
        headers: { 'Accept': 'application/json' },
        timeout: 10000
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Google API HTTP ${response.status}: ${body.substring(0, 200)}`);
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
        return null;
    }

    // Find first non-excluded result
    for (const item of data.items) {
        if (item.link && !isExcludedUrl(item.link)) {
            return item.link;
        }
    }

    return null;
}

/**
 * DuckDuckGo Lite search (fallback)
 */
async function duckDuckGoSearch(query) {
    const fetch = (await import('node-fetch')).default;
    const searchUrl = 'https://lite.duckduckgo.com/lite/';

    const response = await fetch(searchUrl, {
        method: 'POST',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-GB,en;q=0.9',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Origin': 'https://lite.duckduckgo.com',
            'Referer': 'https://lite.duckduckgo.com/'
        },
        body: `q=${encodeURIComponent(query)}`,
        timeout: 10000
    });

    if (!response.ok) {
        throw new Error(`DDG HTTP ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    let foundUrl = null;

    // Try multiple selectors — DDG Lite changes its HTML periodically
    const linkSelectors = ['a.result-link', 'a.result__a', '.result-link a', 'td a[href^="http"]'];

    for (const selector of linkSelectors) {
        $(selector).each((_, el) => {
            let href = $(el).attr('href');
            if (href && href.startsWith('http') && !isExcludedUrl(href)) {
                foundUrl = href;
                return false;
            }
        });
        if (foundUrl) break;
    }

    return foundUrl;
}

function extractTitle($) {
    const selectors = [
        'h1.product_title',
        'h1.product-title',
        '.product_title',
        '[itemprop="name"]',
        'h1.entry-title',
        '.product-info h1',
        '.product-detail h1',
        '.product-name h1',
        'h1'
    ];

    for (const sel of selectors) {
        const text = $(sel).first().text().trim();
        if (text && text.length > 2 && text.length < 300) return text;
    }
    return $('title').text().split('|')[0].split('-')[0].trim() || '';
}

function extractShortDescription($) {
    const selectors = [
        '.woocommerce-product-details__short-description',
        '.product-short-description',
        '.short-description',
        '[itemprop="description"]:not(.woocommerce-Tabs-panel)',
        '.product_meta + div',
        '.summary .description'
    ];

    for (const sel of selectors) {
        const el = $(sel).first();
        if (el.length) {
            const text = el.text().trim();
            if (text.length > 10) return text;
        }
    }

    // Fallback: OG description
    const ogDesc = $('meta[property="og:description"]').attr('content') || '';
    if (ogDesc.length > 10) return ogDesc;

    return '';
}

function extractDescription($) {
    // WooCommerce-specific selectors first
    const wooSelectors = [
        '.woocommerce-Tabs-panel--description',
        '#tab-description',
        '.woocommerce-Tabs-panel',
        '.product-description',
        '.product_description',
        '#product-description'
    ];

    for (const sel of wooSelectors) {
        const el = $(sel).first();
        if (el.length) {
            // Get all paragraphs and text content
            const paragraphs = [];
            el.find('p, h2, h3, h4').each((_, child) => {
                const text = $(child).text().trim();
                if (text.length > 5) {
                    paragraphs.push(text);
                }
            });
            if (paragraphs.length > 0) return paragraphs.join('\n\n');

            // Fall back to full text content
            const fullText = el.text().trim();
            if (fullText.length > 20) return fullText;
        }
    }

    // Generic selectors
    const genericSelectors = [
        '[itemprop="description"]',
        '.description',
        '.product-info .description',
        '.product-detail-description',
        '.tab-pane.active',
        '.product-detail p'
    ];

    for (const sel of genericSelectors) {
        const paragraphs = [];
        $(sel).each((_, el) => {
            $(el).find('p').each((_, child) => {
                const text = $(child).text().trim();
                if (text.length > 20 && text.length < 2000) {
                    paragraphs.push(text);
                }
            });
            const directText = $(el).text().trim();
            if (directText.length > 20 && directText.length < 2000 && !paragraphs.includes(directText)) {
                paragraphs.push(directText);
            }
        });
        if (paragraphs.length > 0) {
            return [...new Set(paragraphs)].slice(0, 5).join('\n\n');
        }
    }

    // Last resort: OG description
    return $('meta[property="og:description"]').attr('content') || '';
}

function extractFeatures($) {
    const features = [];

    // Look for feature lists in description tabs and product content
    const selectors = [
        '.woocommerce-Tabs-panel--description ul li',
        '.woocommerce-Tabs-panel--description li',
        '#tab-description ul li',
        '.product-features li',
        '.features li',
        '.feature-list li',
        '.key-features li',
        '.product-highlights li',
        '.bullets li',
        '.summary ul li',
        '.product-info ul li',
        '.product-detail ul li',
        '[class*="feature"] li',
        '[class*="specification"] li',
        '.woocommerce-product-details__short-description ul li'
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

    // If no feature lists found, try specs tables
    if (features.length === 0) {
        // WooCommerce additional info table
        const additionalInfoSelectors = [
            '.woocommerce-product-attributes',
            '#tab-additional_information table',
            '.shop_attributes',
            'table.product-attributes'
        ];

        for (const sel of additionalInfoSelectors) {
            $(sel).find('tr').each((_, row) => {
                const label = $(row).find('th').text().trim();
                const value = $(row).find('td').text().trim();
                if (label && value) {
                    features.push(`${label}: ${value}`);
                }
            });
            if (features.length > 0) break;
        }
    }

    // Generic table fallback
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

    // WooCommerce product attributes
    const selectors = [
        '.woocommerce-product-attributes',
        '.shop_attributes',
        '#tab-additional_information table',
        '.product-specifications',
        '.specifications',
        '.product-specs',
        '.technical-specs',
        '.tech-specs',
        '[class*="specification"]'
    ];

    for (const sel of selectors) {
        $(sel).find('tr').each((_, row) => {
            const key = $(row).find('th').text().trim();
            const val = $(row).find('td').text().trim();
            if (key && val) specs[key] = val;
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

    // WooCommerce gallery
    const selectors = [
        '.woocommerce-product-gallery__image img',
        '.woocommerce-product-gallery img',
        '.product-gallery img',
        '.product-images img',
        '.product-image img',
        'figure.woocommerce-product-gallery__wrapper img',
        '[itemprop="image"]',
        '.wp-post-image',
        '.product-photo img',
        '.product-media img',
        '.gallery img',
        '.product img'
    ];

    for (const sel of selectors) {
        $(sel).each((_, img) => {
            // Prioritize highest quality data attributes first
            const srcs = [
                $(img).attr('data-large_image'),
                $(img).attr('data-zoom-image'),
                $(img).attr('data-full'),
                $(img).attr('data-src'),
                $(img).attr('src')
            ].filter(Boolean);

            for (let src of srcs) {
                // Skip tiny thumbnails (WooCommerce generates many sizes)
                if (src.includes('-150x150') || src.includes('-100x100') || src.includes('-50x50')) continue;

                // Resolve relative URLs
                if (!src.startsWith('http') && !src.startsWith('data:')) {
                    try {
                        src = new URL(src, baseUrl).href;
                    } catch (e) {
                        continue;
                    }
                }

                // Filter out icons, placeholders, logos
                if (src.startsWith('http') && !src.includes('placeholder') &&
                    !src.includes('spinner') && !src.includes('logo') &&
                    !src.includes('1x1') && !src.includes('pixel') &&
                    !src.includes('woocommerce-placeholder')) {

                    // If we found a valid URL, try to remove standard WP resize bounds to get the original
                    // e.g. "-300x300.jpg" -> ".jpg"
                    src = src.replace(/-\d+x\d+(\.[a-zA-Z]+)$/, '$1');

                    images.add(src);
                    break; // Only take the highest quality src per img element
                }
            }
        });
    }

    // Also check og:image
    const ogImage = $('meta[property="og:image"]').attr('content');
    if (ogImage && ogImage.startsWith('http')) {
        images.add(ogImage);
    }

    return [...images].slice(0, 10);
}

function extractBrand($) {
    // WooCommerce brand taxonomies
    const selectors = [
        '[rel="tag"]',
        '.product_meta .brand a',
        '.product_meta .posted_in a',
        '[itemprop="brand"]',
        '.brand'
    ];

    for (const sel of selectors) {
        const text = $(sel).first().text().trim();
        if (text && text.length > 1 && text.length < 100) return text;
    }
    return '';
}

function extractSku($) {
    const selectors = [
        '.sku',
        '[itemprop="sku"]',
        '.product_meta .sku'
    ];

    for (const sel of selectors) {
        const text = $(sel).first().text().trim();
        if (text && text.length > 1) return text;
    }
    return '';
}

function extractPrice($) {
    const selectors = [
        '.price .woocommerce-Price-amount',
        '.price ins .woocommerce-Price-amount',
        '[itemprop="price"]',
        '.product-price',
        '.price'
    ];

    for (const sel of selectors) {
        const text = $(sel).first().text().trim().replace(/[£$€,]/g, '');
        const num = parseFloat(text);
        if (!isNaN(num)) return num.toString();
    }
    return '';
}

/**
 * Extract ALL readable text from the page for AI processing
 */
function extractRawText($) {
    // Get text from product-relevant areas only
    const areas = [
        '.woocommerce-Tabs-panel--description',
        '#tab-description',
        '.woocommerce-product-details__short-description',
        '.summary',
        '.product-content',
        '.product-description',
        '.product, .product-detail, .product-info, main, article'
    ];

    const texts = [];
    for (const sel of areas) {
        const text = $(sel).text().trim()
            .replace(/\s+/g, ' ')
            .replace(/\n\s*\n/g, '\n');
        if (text.length > 20) {
            texts.push(text);
        }
    }

    // Deduplicate and limit to ~3000 chars for AI context
    const combined = [...new Set(texts)].join('\n\n');
    return combined.substring(0, 3000);
}
