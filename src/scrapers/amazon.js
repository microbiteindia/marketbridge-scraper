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

    const product = await page.evaluate(() => {

    const title =
        document.querySelector("#productTitle")?.innerText.trim() || "";

    let price = null;

const selectors = [
    "#corePrice_feature_div .a-price .a-offscreen",
    "#corePriceDisplay_desktop_feature_div .a-price .a-offscreen",
    ".priceToPay .a-offscreen",
    "#apex_desktop .a-price .a-offscreen"
];

for (const selector of selectors) {

    const el = document.querySelector(selector);

    if (el) {

        const text = el.innerText.trim();

        const match = text.match(/[\d,]+(?:\.\d+)?/);

        if (match) {

            price = parseFloat(match[0].replace(/,/g, ""));

            break;
        }
    }
}



    const image =
        document.querySelector("#landingImage")?.src ||
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

        price,

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