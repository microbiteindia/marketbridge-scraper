const { getFlipkartPage } = require("../browser/browser");

async function getFlipkartProduct(pid) {

    const page = await getFlipkartPage();

    const fallbackUrl = `https://www.flipkart.com/product/p/item?pid=${pid}`;

    try {

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

const formatImageUrl = (src) => {
                if (!src) return "";
                return src
                    .replace(/{@width}/g, "200")
                    .replace(/{@height}/g, "200")
                    .replace(/{@quality}/g, "70");
            };

// 6. Image Extraction & Formatting
                const imgEl = container.querySelector("img");
                let image = "";
                if (imgEl) {
                    const rawImg = imgEl.getAttribute("src") || imgEl.getAttribute("data-src") || "";
                    image = formatImageUrl(rawImg);
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

            } catch (e) {

                return null;

            }

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

    }

}

module.exports = {

    getFlipkartProduct

};