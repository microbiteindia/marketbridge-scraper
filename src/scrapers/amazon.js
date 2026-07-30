const { getBrowser } = require("../browser/browser");

async function getAmazonProduct(asin) {

    const browser = await getBrowser();

    const page = await browser.newPage();

    await page.goto(

        "https://www.amazon.in/dp/" + asin,

        {

            waitUntil: "domcontentloaded",

            timeout: 60000

        }

    );

    try {
        await page.waitForSelector("#productTitle, #centerCol, #ppd", { timeout: 8000 });
    } catch (e) {}


    const product = await page.evaluate(() => {

const cleanPrice = (text) => {

    if (!text) return null;

    const value = text
        .replace(/,/g, "")
        .replace(/[^\d.]/g, "");

    return value ? parseFloat(value) : null;

};

const getMeta = (prop) => {
            const el = document.querySelector(`meta[property="${prop}"], meta[name="${prop}"]`);
            return el ? el.getAttribute('content') : '';
        };


    const title =
        document.querySelector("#productTitle")?.innerText.trim() || "";

    // 2. TARGET MAIN PRODUCT CONTAINER ONLY (#ppd or #centerCol)
        // This stops selectors from grabbing prices from "Recently Viewed" or "Sponsored" sections!
        const mainContainer = document.querySelector("#ppd") || document.querySelector("#centerCol") || document;

        const primaryPriceSelectors = [
            "#corePrice_feature_div .a-price .a-offscreen",
            "#corePriceDisplay_desktop_feature_div .a-price .a-offscreen",
            "#apex_desktop .a-price .a-offscreen",
            ".apexPriceToPay .a-offscreen",
            "#priceblock_ourprice",
            "#priceblock_dealprice",
            "#priceblock_saleprice",
            "#price_inside_buybox",
            "#newBuyBoxPrice",
            ".a-price .a-offscreen"
        ];

        let priceText = "";
        for (const selector of primaryPriceSelectors) {
            const el = mainContainer.querySelector(selector);
            if (el && el.innerText.trim()) {
                priceText = el.innerText.trim();
                break;
            }
        }

        // If still no price found in main container, check if item is explicitly Out of Stock
        const isOutOfStock = !!mainContainer.querySelector("#outOfStock, #availability .a-color-state, #availability .a-color-price");




    const image =
    document.querySelector("#landingImage")?.src ||
    document.querySelector("#imgTagWrapperId img")?.src ||
    document.querySelector("#imgBlkFront")?.src ||
    "";

    const rating =
        parseFloat(
            document.querySelector("#acrPopover")
                ?.getAttribute("title")
                ?.match(/[\d.]+/)?.[0] || "0"
        ) || 0;

    const asin =
        location.pathname.match(/\/dp\/([A-Z0-9]{10})/)?.[1] || "";

    return {

        title,

        price: isOutOfStock ? null : cleanPrice(priceText),

        image,

        rating,

        asin

    };

});

    await page.close();

    return {

    success: true,

    marketplace: "amazon",

    asin: product.asin,

    title: product.title,

    price: product.price,

    image: product.image,

    rating: product.rating,

    url: `https://www.amazon.in/dp/${product.asin}`

};

}

module.exports = {

    getAmazonProduct

};