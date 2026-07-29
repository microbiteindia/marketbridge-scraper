const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
    res.json({ status: 'online', message: 'ASIN & PID Price Scraper Service' });
});

app.get('/scrape', async (req, res) => {
    // 1. Capture query parameters
    const asin = req.query.asin ? req.query.asin.trim() : null;
    const pid = req.query.pid ? req.query.pid.trim() : null;
    let url = req.query.url ? req.query.url.trim() : null;

    // Handle full URLs with query strings if passed directly
    if (!url && req.originalUrl.includes('/scrape?url=')) {
        url = req.originalUrl.split('/scrape?url=')[1];
        if (url) url = decodeURIComponent(url);
    }

    // Determine target platform & construct URL if ASIN or PID are provided
    let targetUrl = '';
    let isFlipkart = false;
    let identifier = '';

    if (asin) {
        targetUrl = `https://www.amazon.in/dp/${asin}`;
        identifier = asin;
    } else if (pid) {
        targetUrl = `https://www.flipkart.com/product/p/item?pid=${pid}`;
        isFlipkart = true;
        identifier = pid;
    } else if (url) {
        targetUrl = url;
        isFlipkart = url.includes('flipkart.com');
        identifier = url;
    } else {
        return res.status(400).json({
            success: false,
            keyword: "",
            amazon: [],
            flipkart: [],
            error: "Please provide an 'asin', 'pid', or 'url' parameter."
        });
    }

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-blink-features=AutomationControlled',
                '--window-size=1920,1080'
            ]
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });

        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
        );

        // 2. Navigate to generated URL
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });

        if (isFlipkart) {
            try {
                await page.waitForSelector('span.VU-516, span.B_NuT2, div.Nx9qGe, h1', { timeout: 6000 });
            } catch (e) {
                // Continue if selector times out
            }
        }

        // 3. Extract data from DOM / Meta tags
        const data = await page.evaluate((isFlipkart) => {
            const cleanPrice = (text) => {
                if (!text) return 0;
                const matches = text.replace(/[^0-9.]/g, '');
                return parseFloat(matches) || 0;
            };

            const getMeta = (prop) => {
                const el = document.querySelector(`meta[property="${prop}"], meta[name="${prop}"]`);
                return el ? el.getAttribute('content') : '';
            };

            let title = '';
            let priceText = '';
            let image = '';

            if (isFlipkart) {
                // Flipkart Selectors
                const titleSelectors = ['span.VU-516', 'span.B_NuT2', 'h1._6ERy96', 'h1.yhR1f2', 'h1'];
                for (const s of titleSelectors) {
                    const el = document.querySelector(s);
                    if (el && el.innerText.trim()) {
                        title = el.innerText.trim();
                        break;
                    }
                }
                if (!title) title = getMeta('og:title');

                const priceSelectors = ['div.Nx9qGe', 'div._30jeq3', 'div._16J9Bu', 'div.hl25yM'];
                for (const s of priceSelectors) {
                    const el = document.querySelector(s);
                    if (el && el.innerText.trim()) {
                        priceText = el.innerText.trim();
                        break;
                    }
                }
                if (!priceText) priceText = getMeta('product:price:amount') || getMeta('og:price:amount');

                const imgSelectors = ['img._396cs4', 'img.DCY3L0', 'img._2r_T1I'];
                for (const s of imgSelectors) {
                    const el = document.querySelector(s);
                    if (el && el.src) {
                        image = el.src;
                        break;
                    }
                }
                if (!image) image = getMeta('og:image');

            } else {
                // Amazon Selectors
                const titleEl = document.querySelector('#productTitle') || document.querySelector('h1 span');
                title = titleEl ? titleEl.innerText.trim() : (getMeta('title') || getMeta('og:title'));

                const priceSelectors = [
                    '.a-price .a-offscreen',
                    '#priceblock_ourprice',
                    '#priceblock_dealprice',
                    '.a-price-whole',
                    '#corePrice_feature_div .a-offscreen'
                ];
                for (const selector of priceSelectors) {
                    const el = document.querySelector(selector);
                    if (el && el.innerText.trim()) {
                        priceText = el.innerText.trim();
                        break;
                    }
                }

                const imgEl = document.querySelector('#landingImage') || document.querySelector('#imgBlkFront');
                image = imgEl ? imgEl.src : getMeta('og:image');
            }

            return { title, price: cleanPrice(priceText), image };
        }, isFlipkart);

        await browser.close();

        // 4. Construct JSON output format
        const productData = {
            id: identifier,
            title: data.title,
            price: data.price,
            image: data.image,
            url: targetUrl
        };

        const isSuccess = data.price > 0 || data.title !== '';

        return res.json({
            success: isSuccess,
            keyword: identifier,
            amazon: isFlipkart ? [] : (isSuccess ? [productData] : []),
            flipkart: isFlipkart ? (isSuccess ? [productData] : []) : []
        });

    } catch (err) {
        if (browser) await browser.close();
        return res.status(500).json({
            success: false,
            keyword: identifier,
            amazon: [],
            flipkart: [],
            error: err.message
        });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});