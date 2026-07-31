const { getBrowser } = require("../browser/browser");

async function getFlipkartProduct(pid) {

    const browser = await getBrowser();

    const page = await browser.newPage();

    const url = "https://www.flipkart.com/search?q=" + pid;

    await page.setRequestInterception(true);

page.on("request", (request) => {
    request.continue();
});

page.on("response", async (response) => {

    try {

        const url = response.url();

        console.log(url);

        const text = await response.text().catch(() => "");

        if (text.length > 100) {

            require("fs").writeFileSync(

                "response-" + Date.now() + ".txt",

                text

            );

        }

    } catch (e) {}

});

await page.goto(

    "https://www.flipkart.com/item/p/itm?pid=" + pid,

    {

        waitUntil: "domcontentloaded",

        timeout: 60000

    }

);

await new Promise(resolve => setTimeout(resolve, 15000));

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