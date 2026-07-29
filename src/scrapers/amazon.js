const { getBrowser } = require("../browser/browser");

async function searchAmazon(keyword) {

    const browser = await getBrowser();

    const page = await browser.newPage();

    await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
    );

    //const url = `https://www.amazon.in/s?k=${encodeURIComponent(keyword)}`;

const isAsin = /^[A-Z0-9]{10}$/i.test(keyword);

const url = isAsin
    ? `https://www.amazon.in/dp/${keyword}`
    : `https://www.amazon.in/s?k=${encodeURIComponent(keyword)}`;

    await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 60000
    });

await page.screenshot({
    path: "amazon-debug.png",
    fullPage: true
});

console.log("Loaded URL:", page.url());


    if (isAsin) {

try {

    	await page.waitForSelector("#productTitle", {
        timeout: 30000
    	});

} catch (e) {

        console.log(await page.title());
        throw e;

}


    } else {

    	await page.waitForSelector(
        	'[data-component-type="s-search-result"]',
        	{
            	timeout: 30000
        	}
    	);

	}

let products;

if (isAsin) {

    products = await page.evaluate(() => {

        const title =
            document.querySelector("#productTitle")?.innerText.trim() || "";

        const whole =
    (document.querySelector(".a-price-whole")?.innerText || "")
        .replace(/\./g, "");

        const fraction =
            document.querySelector(".a-price-fraction")?.innerText || "00";

        const priceText =
            whole ? `${whole}.${fraction}` : "";

        const price = parseFloat(
    priceText.replace(/[₹,\s]/g, "")
) || 0;

        const image =
            document.querySelector("#landingImage")?.src ||
            document.querySelector("#imgBlkFront")?.src ||
            "";

        const rating =
            parseFloat(
                document.querySelector(".a-icon-alt")?.innerText || "0"
            ) || 0;

        const reviewText =
            document.querySelector("#acrCustomerReviewText")?.innerText || "";

        const reviews =
            Number(reviewText.replace(/\D/g, "")) || 0;

        const marketplaceId =
            location.pathname.match(/\/dp\/([A-Z0-9]{10})/)?.[1] || "";

        return [{
            marketplace: "Amazon",
            marketplace_id: marketplaceId,
            title,
            price,
            price_text: priceText,
            currency: "INR",
            image,
            url: location.href,
            rating,
            reviews
        }];

    });

} else {

    products = await page.evaluate(() => {

        return Array.from(
            document.querySelectorAll(
                '[data-component-type="s-search-result"]'
            )
        )
        .slice(0, 5)
        .map(item => {

            const title =
    		Array.from(item.querySelectorAll("h2 span"))
        		.map(el => el.textContent.trim())
        		.join(" ")
    		||
    		item.querySelector("h2")?.textContent.trim()
   		||
    		"";


            let price = "";

	    price =
    		item.querySelector(".a-price-whole")?.innerText ||
    		item.querySelector(".a-price .a-offscreen")?.innerText ||
    		item.querySelector(".a-offscreen")?.innerText ||
    		"";


            const image =
                item.querySelector("img")?.src ||
                "";


            let productUrl =
    		item.querySelector(
       		 "a.a-link-normal.s-no-outline"
    		)?.href ||
    		item.querySelector("h2 a")?.href ||
    		"";

		let marketplaceId = "";

if (productUrl) {

    // Handle Sponsored (sspa) URLs
    if (productUrl.includes("/sspa/click")) {

        try {

            const parsedUrl = new URL(productUrl);

            const realUrl = parsedUrl.searchParams.get("url");

            if (realUrl) {

                productUrl = "https://www.amazon.in" + decodeURIComponent(realUrl);

            }

        } catch (e) {}

    }

    const match = productUrl.match(/\/dp\/([A-Z0-9]{10})/);

    if (match) {

        marketplaceId = match[1];

        productUrl = `https://www.amazon.in/dp/${marketplaceId}`;

    }

}


            const ratingText =
    item.querySelector(".a-icon-alt")?.innerText ||
    "";

const rating =
    parseFloat(ratingText) || 0;

let reviewText =
    item.querySelector(
        "a[href*='customerReviews'] .s-underline-text"
    )?.textContent.trim() ||

    item.querySelector(
        "a[href*='customerReviews'] span.a-size-base"
    )?.textContent.trim() ||

    item.querySelector(
        ".a-size-base.s-underline-text"
    )?.textContent.trim() ||

    item.querySelector(
        ".s-underline-text"
    )?.textContent.trim() ||

    "";

const reviews = Number(
    reviewText.replace(/[(),]/g, "").replace(/,/g, "")
) || 0;

            return {
    		marketplace: "Amazon",
    		marketplace_id: marketplaceId,
    		title,
    		price: Number(
    			price.replace(/[₹,\s]/g, "")
		) || 0,
		price_text: price.replace("₹", "").trim(),
    		currency: "INR",
    		image,
    		url: productUrl,
    		rating,
    		reviews		};

        })
        .filter(product => product.title);


    });
}

    await page.close();


    return {
        success: true,
        count: products.length,
        products
    };

}


module.exports = {
    searchAmazon
};