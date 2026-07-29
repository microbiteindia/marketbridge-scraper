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

    const priceContainer =
    document.querySelector("#corePrice_feature_div");

let price = null;

if (priceContainer) {

    const whole =
        (priceContainer.querySelector(".a-price-whole")?.innerText || "")
            .replace(/\./g, "");

    const fraction =
        priceContainer.querySelector(".a-price-fraction")?.innerText || "00";

    if (whole) {

        price = parseFloat(`${whole}.${fraction}`);

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