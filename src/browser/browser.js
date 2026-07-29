const puppeteer = require("puppeteer");

let browser = null;

async function getBrowser() {

    if (browser) {
        return browser;
    }

    browser = await puppeteer.launch({

        headless: true,

        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox"
        ]

    });

    return browser;

}

async function closeBrowser() {

    if (browser) {

        await browser.close();

        browser = null;

    }

}

module.exports = {
    getBrowser,
    closeBrowser
};