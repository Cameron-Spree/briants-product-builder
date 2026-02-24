const fetch = require('node-fetch');
const cheerio = require('cheerio');

(async () => {
    try {
        const query = 'briants fence panel';
        // DuckDuckGo Lite using form POST
        const res = await fetch('https://lite.duckduckgo.com/lite/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-GB,en;q=0.9',
                'Origin': 'https://lite.duckduckgo.com',
                'Referer': 'https://lite.duckduckgo.com/'
            },
            body: `q=${encodeURIComponent(query)}&kl=&df=`
        });
        const text = await res.text();
        const $ = cheerio.load(text);

        let foundUrl = null;

        $('a.result-url').each((_, el) => {
            const href = $(el).attr('href');
            if (href && href.startsWith('http') && !href.includes('duckduckgo.com')) {
                // Filter out common aggregators
                const exclusions = [
                    'amazon', 'ebay', 'wikipedia.org',
                    'youtube.com', 'facebook.com', 'pinterest.com',
                    'tiktok.com', 'instagram.com', 'twitter.com'
                ];
                if (!exclusions.some(domain => href.includes(domain))) {
                    foundUrl = href;
                    return false;
                }
            }
        });

        console.log('Found URL:', foundUrl);
    } catch (e) {
        console.error(e);
    }
})();
