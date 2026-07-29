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

    const price =
        document.querySelector(".a-price .a-offscreen")?.innerText.trim() || "";

    return {
        title,
        price
    };

});

    await page.close();

    return {

    success: true,

    asin,

    title: product.title,

    price: product.price

};

}

module.exports = {

    getAmazonProduct

};