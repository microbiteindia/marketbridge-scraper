const { getBrowser } = require("../browser/browser");

async function getAmazonProduct(asin) {
    const browser = await getBrowser();
    let page = null;

    const canonicalUrl = `https://www.amazon.in/dp/${asin}`;

    console.time(`amazon-total-${asin}`);

    try {
        page = await browser.newPage();

        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
        });

        await page.setUserAgent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        );

        // Intercept network requests to speed up page load & conserve memory
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (req.isInterceptResolutionHandled && req.isInterceptResolutionHandled()) return;

            const url = req.url().toLowerCase();
            const resourceType = req.resourceType();

            if (
                ['image', 'stylesheet', 'font', 'media', 'other'].includes(resourceType) ||
                url.includes('analytics') || url.includes('ads') || url.includes('tracker') || url.includes('telemetry')
            ) {
                req.abort();
            } else {
                req.continue();
            }
        });

        console.time(`amazon-goto-${asin}`);

        await page.goto(canonicalUrl, {
            waitUntil: "domcontentloaded",
            timeout: 15000
        });

        console.timeEnd(`amazon-goto-${asin}`);

        console.time(`amazon-extract-${asin}`);

        const product = await page.evaluate((targetAsin) => {
            const cleanPrice = (text) => {
                if (!text) return null;
                const match = text.match(/[\d,]+(?:\.\d+)?/);
                if (!match) return null;
                const num = parseFloat(match[0].replace(/,/g, ""));
                return isNaN(num) ? null : num;
            };

            let title = "";
            const titleEl = document.querySelector("#productTitle");
            if (titleEl) {
                title = titleEl.textContent ? titleEl.textContent.trim() : "";
            }

            let priceText = "";
            const priceSelectors = [
                "#corePrice_feature_div .a-price .a-offscreen",
                "#corePriceDisplay_desktop_feature_div .a-price .a-offscreen",
                ".priceToPay .a-offscreen",
                "#apex_desktop .a-price .a-offscreen",
                "#priceblock_ourprice",
                "#priceblock_dealprice",
                "#priceblock_saleprice",
                "#price_inside_buybox",
                "#newBuyBoxPrice",
                "span.a-price .a-offscreen",
                "span.a-price-whole"
            ];

            for (const selector of priceSelectors) {
                const el = document.querySelector(selector);
                if (el && el.textContent && el.textContent.trim()) {
                    priceText = el.textContent.trim();
                    break;
                }
            }

            let image = "";
            const imgEl = document.querySelector("#landingImage, #imgBlkFront");
            if (imgEl) {
                image =
                    imgEl.getAttribute("data-old-hires") ||
                    imgEl.getAttribute("src") ||
                    "";
            }

            let rating = 0;
            const ratingEl =
                document.querySelector("#acrPopover") ||
                document.querySelector(".a-icon-alt");

            if (ratingEl) {
                const text =
                    ratingEl.getAttribute("title") ||
                    ratingEl.textContent ||
                    "";
                const match = text.match(/([0-9.]+)/);
                if (match) {
                    rating = parseFloat(match[1]);
                }
            }

            return {
                asin: targetAsin,
                title,
                price: cleanPrice(priceText),
                image,
                rating
            };
        }, asin);

        console.timeEnd(`amazon-extract-${asin}`);
        console.timeEnd(`amazon-total-${asin}`);

        return {
            success: !!(product && product.title),
            marketplace: "amazon",
            asin,
            title: product ? product.title : "",
            price: product ? product.price : null,
            image: product ? product.image : "",
            rating: product ? product.rating : 0,
            url: canonicalUrl
        };

    } catch (err) {
        console.timeEnd(`amazon-total-${asin}`);

        return {
            success: false,
            marketplace: "amazon",
            asin,
            title: "",
            price: null,
            image: "",
            rating: 0,
            url: canonicalUrl,
            error: err.message
        };
    } finally {
        if (page && !page.isClosed()) {
            await page.close().catch(() => {});
        }
    }
}

module.exports = {
    getAmazonProduct
};