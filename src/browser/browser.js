const puppeteer = require("puppeteer");

let browser = null;

let amazonPage = null;
let flipkartPage = null;

async function getBrowser() {

    if (browser) {
        return browser;
    }

    browser = await puppeteer.launch({

        headless: true,

        args: [

            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--disable-extensions",
            "--disable-background-networking"

        ]

    });

    return browser;

}

async function getAmazonPage() {

    const browser = await getBrowser();

    if (!amazonPage) {

        amazonPage = await browser.newPage();

        await amazonPage.setUserAgent(

            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36"

        );

        // Block unnecessary resources only once
        await amazonPage.setRequestInterception(true);

        amazonPage.on("request", (req) => {

            const type = req.resourceType();

            if (

                type === "image" ||
                type === "stylesheet" ||
                type === "font" ||
                type === "media"

            ) {

                req.abort();

            } else {

                req.continue();

            }

        });

    }

    return amazonPage;

}

async function getFlipkartPage() {

    const browser = await getBrowser();

    if (!flipkartPage) {

        flipkartPage = await browser.newPage();

        await flipkartPage.evaluateOnNewDocument(() => {

            Object.defineProperty(navigator, "webdriver", {

                get: () => false

            });

        });

        await flipkartPage.setUserAgent(

            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36"

        );

        // Create one Flipkart session
        await flipkartPage.goto(

            "https://www.flipkart.com",

            {

                waitUntil: "domcontentloaded",

                timeout: 30000

            }

        );

    }

    return flipkartPage;

}

async function closeBrowser() {

    try {

        if (amazonPage) {

            await amazonPage.close();

        }

    } catch (e) {}

    try {

        if (flipkartPage) {

            await flipkartPage.close();

        }

    } catch (e) {}

    try {

        if (browser) {

            await browser.close();

        }

    } catch (e) {}

    amazonPage = null;
    flipkartPage = null;
    browser = null;

}

module.exports = {

    getBrowser,

    getAmazonPage,

    getFlipkartPage,

    closeBrowser

};