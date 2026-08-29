const { getAmazonPage } = require("../browser/browser");

async function getAmazonProduct(asin) {

    const page = await getAmazonPage();

    const canonicalUrl = `https://www.amazon.in/dp/${asin}`;

console.time(`amazon-total-${asin}`);

    try {

console.time(`amazon-goto-${asin}`);

        await page.goto(

            canonicalUrl,

            {

                waitUntil: "domcontentloaded",

                timeout: 30000

            }

        );

console.timeEnd(`amazon-goto-${asin}`);

        console.time(`amazon-extract-${asin}`);

        const product = await page.evaluate((targetAsin) => {

            const cleanPrice = (text) => {

                if (!text) return null;

                const match = text.match(/[\d,]+(?:\.\d+)?/);

                if (!match) return null;

                return parseFloat(

                    match[0].replace(/,/g, "")

                );

            };

            let title = "";

            const titleEl = document.querySelector("#productTitle");

            if (titleEl) {

                title = titleEl.innerText.trim();

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

                if (el && el.innerText.trim()) {

                    priceText = el.innerText.trim();

                    break;

                }

            }

            let image = "";

            const imgEl = document.querySelector(

                "#landingImage, #imgBlkFront"

            );

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

                    ratingEl.innerText ||

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

            title: product.title || "",

            price: product.price,

            image: product.image || "",

            rating: product.rating || 0,

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

    }

}

module.exports = {

    getAmazonProduct

};