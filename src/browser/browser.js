const puppeteer = require("puppeteer");

let browser = null;
let amazonPage = null;
let flipkartPage = null;

async function getBrowser() {
    // Re-launch browser if closed or disconnected unexpectedly
    if (browser) {
        return browser;
    }

    browser = await puppeteer.launch({
        headless: "new",
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage", // Forces RAM usage into /tmp rather than limited /dev/shm
            "--disable-accelerated-2d-canvas",
            "--disable-canvas-aa",
            "--disable-2d-canvas-clip-utils",
            "--disable-gl-drawing-for-tests",
            "--disable-gpu",
            "--disable-extensions",
            "--disable-background-networking",
            "--disable-background-timer-throttling",
            "--disable-backgrounding-occluded-windows",
            "--disable-breakpad",
            "--disable-component-extensions-with-background-pages",
            "--disable-ipc-flooding-protection",
            "--disable-renderer-backgrounding",
            "--disable-sync",
            "--metrics-recording-only",
            "--no-first-run",
            "--single-process", // Highly reduces Chrome RAM overhead in containerized environments
            "--no-zygote"
        ]
    });

    // Handle unexpected browser disconnects
    browser.on("disconnected", () => {
        browser = null;
        amazonPage = null;
        flipkartPage = null;
    });

    return browser;
}

async function getAmazonPage() {
    const b = await getBrowser();

    if (amazonPage && !amazonPage.isClosed()) {
        return amazonPage;
    }

    amazonPage = await b.newPage();

    await amazonPage.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36"
    );

    // Block heavy assets to save bandwidth and RAM
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

    amazonPage.on("close", () => {
        amazonPage = null;
    });

    return amazonPage;
}

async function getFlipkartPage() {
    const b = await getBrowser();

    if (flipkartPage && !flipkartPage.isClosed()) {
        return flipkartPage;
    }

    flipkartPage = await b.newPage();

    await flipkartPage.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, "webdriver", {
            get: () => false
        });
    });

    await flipkartPage.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36"
    );

    await flipkartPage.goto("https://www.flipkart.com", {
        waitUntil: "domcontentloaded",
        timeout: 30000
    });

    flipkartPage.on("close", () => {
        flipkartPage = null;
    });

    return flipkartPage;
}

async function closeBrowser() {
    try {
        if (amazonPage && !amazonPage.isClosed()) {
            await amazonPage.close();
        }
    } catch (e) {}

    try {
        if (flipkartPage && !flipkartPage.isClosed()) {
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