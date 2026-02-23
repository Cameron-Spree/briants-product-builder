/**
 * Gemini AI integration for product content generation
 * Uses Google's Generative AI API (Gemini 2.0 Flash)
 */

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

/**
 * Generate product content using Gemini AI
 * @param {string} apiKey - Gemini API key
 * @param {object} product - Product object with name, scraped data, etc.
 * @param {string[]} fields - Which fields to generate: 'shortDescription', 'description', 'features', 'categories'
 * @param {object} categoryTree - Available categories to choose from
 * @returns {object} Generated content for requested fields
 */
export async function generateProductContent(apiKey, product, fields, categoryTree) {
    const fetch = (await import('node-fetch')).default;

    const categoryList = flattenCategories(categoryTree);

    const prompt = buildPrompt(product, fields, categoryList);

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{
                parts: [{ text: prompt }]
            }],
            generationConfig: {
                temperature: 0.4,
                maxOutputTokens: 2000,
                responseMimeType: 'application/json'
            }
        })
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Gemini API error (${response.status}): ${err}`);
    }

    const data = await response.json();

    // Extract the text from Gemini's response
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
        throw new Error('No content returned from Gemini');
    }

    // Parse the JSON response
    try {
        return JSON.parse(text);
    } catch (e) {
        // Try extracting JSON from markdown code blocks
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[1].trim());
        }
        throw new Error(`Failed to parse Gemini response: ${text.substring(0, 200)}`);
    }
}

function buildPrompt(product, fields, categoryList) {
    const parts = [
        'You are a product copywriter for Briants of Risborough (briantsofrisborough.co.uk), a UK-based specialist retailer selling agricultural, forestry, garden, and hardware products.',
        '',
        `Product Name: ${product.name}`,
        product.sku ? `SKU: ${product.sku}` : '',
        product.price ? `Price: £${product.price}` : '',
        product.scrapedData?.metaDescription ? `Source Description: ${product.scrapedData.metaDescription}` : '',
        product.scrapedData?.rawText ? `Source Page Text:\n${product.scrapedData.rawText.substring(0, 1500)}` : '',
        product.shortDescription ? `Current Short Description: ${product.shortDescription}` : '',
        product.description ? `Current Long Description: ${product.description}` : '',
        '',
        'Generate the following fields in JSON format. Write in a professional but approachable British English tone, as if writing for a specialist retailer whose customers are tradespeople and enthusiasts:',
        ''
    ];

    const jsonFields = {};

    if (fields.includes('shortDescription')) {
        parts.push('- "shortDescription": A concise product summary (1-2 sentences, max 150 chars). Good for search results and quick scanning.');
        jsonFields.shortDescription = 'string';
    }

    if (fields.includes('description')) {
        parts.push('- "description": A detailed product description (2-4 paragraphs). Highlight key benefits, use cases, and quality. DO NOT use markdown formatting — plain text with paragraph breaks only.');
        jsonFields.description = 'string';
    }

    if (fields.includes('features')) {
        parts.push('- "features": An array of 4-8 key product features as short bullet points. Each should be a brief, factual statement about the product.');
        jsonFields.features = ['string'];
    }

    if (fields.includes('categories')) {
        parts.push('');
        parts.push(`Available categories (pick 1-3 most relevant):`);
        // Include a representative subset to avoid prompt bloat
        const subset = categoryList.slice(0, 100);
        parts.push(subset.join('\n'));
        if (categoryList.length > 100) {
            parts.push(`... and ${categoryList.length - 100} more`);
        }
        parts.push('');
        parts.push('- "categories": An array of the best matching category paths from the list above. Use the EXACT text from the list. Pick 1-3 categories.');
        jsonFields.categories = ['string'];
    }

    parts.push('');
    parts.push('Respond with ONLY valid JSON, no other text.');

    return parts.filter(p => p !== undefined).join('\n');
}

/**
 * Flatten the category tree into "Parent > Child > Grandchild" paths
 */
function flattenCategories(tree, prefix = '') {
    const paths = [];
    if (!tree) return paths;

    for (const [key, value] of Object.entries(tree)) {
        const path = prefix ? `${prefix} > ${key}` : key;
        paths.push(path);
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            // Check if the value has sub-categories (objects, not keyword arrays)
            const hasSubCategories = Object.values(value).some(v => typeof v === 'object' && !Array.isArray(v));
            if (hasSubCategories) {
                paths.push(...flattenCategories(value, path));
            } else if (value.subcategories) {
                paths.push(...flattenCategories(value.subcategories, path));
            }
        }
    }

    return paths;
}
