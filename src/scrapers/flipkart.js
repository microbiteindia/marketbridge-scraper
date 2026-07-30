const { getBrowser } = require("../browser/browser");

async function getFlipkartProduct(pid) {

    const browser = await getBrowser();

    const page = await browser.newPage();

    const url = "https://www.flipkart.com/search?q=" + pid;

    await page.goto(url, {

        waitUntil: "domcontentloaded",

        timeout: 60000

    });

    const title = await page.title();

    await page.close();

    return {

        success: true,

        marketplace: "flipkart",

        pid,

        title,

        price: null,

        image: "",

        rating: 0,

        url

    };

}

module.exports = {

    getFlipkartProduct

};