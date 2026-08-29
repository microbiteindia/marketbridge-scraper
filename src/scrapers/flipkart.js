const { getBrowser } = require("../browser/browser");

async function getFlipkartProduct(pid) {

    const browser = await getBrowser();
    let page = null;

    const fallbackUrl = `https://www.flipkart.com/product/p/item?pid=${pid}`;

    try {

	page = await browser.newPage();

await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
        });

        await page.setUserAgent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        );

        // Intercept network requests to speed up page loads and conserve RAM
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (req.isInterceptResolutionHandled && req.isInterceptResolutionHandled()) return;

            const url = req.url().toLowerCase();
            const resourceType = req.resourceType();

            if (
                    ["stylesheet", "font", "media", "other"].includes(resourceType) ||
                    url.includes("analytics") || url.includes("ads") || url.includes("tracker") || url.includes("telemetry")
            ) {
                req.abort();
            } else {
                req.continue();
            }
        });

await page.goto(fallbackUrl, {
            waitUntil: "domcontentloaded",
            timeout: 15000
        });

        const result = await page.evaluate(async (targetPid) => {

            try {

                const response = await fetch(

                    "https://www.flipkart.com/api/4/page/fetch",

                    {

                        method: "POST",

                        credentials: "include",

                        headers: {

                            "Content-Type": "application/json",

                            "X-User-Agent":

                                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) FKUA/website/42/website/Desktop"

                        },

                        body: JSON.stringify({

                            pageUri: `/product/p/item?pid=${targetPid}`

                        })

                    }

                );

                if (!response.ok) {

                    return null;

                }

                const data = await response.json();

                const pageContext =

                    data?.RESPONSE?.pageData?.pageContext ||

                    data?.RESPONSE?.slots?.[0]?.widget?.data?.pageContext ||

                    null;

                if (!pageContext) {

                    return null;

                }

                const title =

                    pageContext.titles?.title ||

                    pageContext.titles?.subtitle ||

                    pageContext.title ||

                    "";

                const pricing = pageContext.pricing || {};

                let price =

                    pricing.finalPrice?.decimalValue ??

                    pricing.specialPrice?.decimalValue ??

                    pricing.salePrice?.decimalValue ??

                    pricing.currentPrice?.decimalValue ??

                    pricing.mrp?.decimalValue ??

                    null;

                if (price !== null) {

                    price = parseFloat(price);

                }

                let image =
    pageContext.imageUrl ||
    "";

if (
    !image &&
    Array.isArray(pageContext.multimedia?.images)
) {
    image =
        pageContext.multimedia.images[0]?.url ||
        "";
}

if (
    !image &&
    Array.isArray(pageContext.media?.images)
) {
    image =
        pageContext.media.images[0]?.url ||
        "";
}

if (
    !image &&
    Array.isArray(pageContext.productImages)
) {
    image =
        pageContext.productImages[0]?.url ||
        "";
}


                const rating =

                    parseFloat(

                        pageContext.rating?.average ||

                        pageContext.rating?.averageRating ||

                        pageContext.rating?.overallRating ||

                        0

                    ) || 0;

                const productUrl =

                    pageContext.shareUrl ||

                    pageContext.url ||

                    pageContext.productUrl ||

                    `https://www.flipkart.com/product/p/item?pid=${targetPid}`;

                return {

                    title,

                    price,

                    image,

                    rating,

                    url: productUrl

                };

            } catch (e) {}

                // Attempt 2: Fallback to DOM Selectors if internal API response fails
            const cleanPrice = (text) => {
                if (!text) return null;
                const match = text.match(/[\d,]+/);
                if (!match) return null;
                const num = parseFloat(match[0].replace(/,/g, ""));
                return isNaN(num) ? null : num;
            };

            const titleEl = document.querySelector("span.B_NuT2, h1._2xm1JU, span.VU-VGg");
            const title = titleEl ? titleEl.textContent.trim() : "";

            const priceEl = document.querySelector("div._30jeq3._16J30T, div._30jeq3, div.Nx9bqj._4b5PhR");
            const price = priceEl ? cleanPrice(priceEl.textContent) : null;

            const imgEl = document.querySelector("img._396cs4._2amL9g, img._2r_T1I, img.DHM5Ju");
            const image = imgEl ? (imgEl.getAttribute("src") || "") : "";

            const ratingEl = document.querySelector("div._3LWZlK, div.X18h85");
            let rating = 0;
            if (ratingEl) {
                const parsed = parseFloat(ratingEl.textContent.trim());
                if (!isNaN(parsed)) rating = parsed;
            }

            return {
                title,
                price,
                image,
                rating,
                url: `https://www.flipkart.com/product/p/item?pid=${targetPid}`
            };

        }, pid);

        return {

            success: !!(result && result.title),

            marketplace: "flipkart",

            pid,

            title: result?.title || "",

            price: result?.price,

            image: result?.image || "",

            rating: result?.rating || 0,

            url: result?.url || fallbackUrl

        };

    } catch (err) {

        return {

            success: false,

            marketplace: "flipkart",

            pid,

            title: "",

            price: null,

            image: "",

            rating: 0,

            url: fallbackUrl,

            error: err.message

        };

    } finally {
        if (page && !page.isClosed()) {
            await page.close().catch(() => {});
        }
    }
}

module.exports = {

    getFlipkartProduct

};