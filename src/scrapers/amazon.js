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

    const title = await page.title();

    await page.close();

    return {

        success: true,

        asin,

        title

    };

}

module.exports = {

    getAmazonProduct

};