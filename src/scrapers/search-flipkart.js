const { getBrowser } = require("../browser/browser");

async function searchFlipkart(keyword) {

    const browser = await getBrowser();
    const page = await browser.newPage();

    try {
        // 1. Anti-detection Setup
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
        });

        await page.setUserAgent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        );

        // 2. Safe Request Interception
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (req.isInterceptResolutionHandled && req.isInterceptResolutionHandled()) {
                return;
            }

            try {
                if (['font', 'media'].includes(req.resourceType())) {
                    req.abort();
                } else {
                    req.continue();
                }
            } catch (err) {
                // Prevent runtime crashes on concurrent request processing
            }
        });

        // 3. Navigation
        const targetUrl = `https://www.flipkart.com/search?q=${encodeURIComponent(keyword)}`;
        await page.goto(targetUrl, {
            waitUntil: "domcontentloaded",
            timeout: 30000
        });

        await page.waitForSelector('a[href*="/p/"]', { timeout: 10000 }).catch(() => {});

        // 4. Extraction Logic
        const products = await page.evaluate((keyword) => {
            const stopWords = ["for", "with", "the", "a", "an", "of", "in", "and", "or", "by", "to"];
            const allTerms = keyword.toLowerCase().trim().split(/\s+/).filter(w => w.length > 0);
            const meaningfulTerms = allTerms.filter(w => !stopWords.includes(w));

            const blockedWords = [
                "case", "cover", "charger", "cable", "screen",
                "protector", "glass", "holder", "stand", "back cover", "skin"
            ];

            const userIsSearchingForAccessory = allTerms.some(term => blockedWords.includes(term));

            const cleanPrice = (text) => {
                if (!text) return null;
                const match = text.match(/₹?\s*([\d,]+)/);
                if (!match) return null;
                const num = parseFloat(match[1].replace(/,/g, ""));
                return isNaN(num) ? null : num;
            };

            const cleanPid = (urlStr) => {
                if (!urlStr) return "";
                const match = urlStr.match(/pid=([A-Z0-9]+)/i);
                return match ? match[1] : "";
            };

            const sanitizeTitle = (rawTitle) => {
                if (!rawTitle) return "";
                let clean = rawTitle;
                clean = clean.replace(/^Add to Compare/i, "").trim();
                clean = clean.replace(/(\d\.\d)[\d,]+ Ratings.*/, "").trim();
                clean = clean.replace(/₹.*/, "").trim();
                return clean;
            };

            const results = [];
            const seenPids = new Set();
            const productLinks = Array.from(document.querySelectorAll('a[href*="/p/"]'));

            productLinks.forEach((linkEl) => {
                const href = linkEl.getAttribute("href") || "";
                const pid = cleanPid(href);

                if (!pid || seenPids.has(pid)) return;

                // Find card container element
                let container = linkEl;
                let current = linkEl;
                for (let i = 0; i < 6; i++) {
                    if (current.parentElement && current.parentElement.tagName !== "BODY") {
                        current = current.parentElement;
                        if (
                            current.getAttribute("data-id") ||
                            current.classList.contains("_1AtVbE") ||
                            current.classList.contains("cPH3B6") ||
                            current.classList.contains("_2kHMtA") ||
                            current.classList.contains("_75nlfW")
                        ) {
                            container = current;
                            break;
                        }
                    }
                }

                // 1. Exclude Ads
                const containerText = (container.textContent || "").toLowerCase();
                const isAd = containerText.includes("sponsored") ||
                             Array.from(container.querySelectorAll("span, div")).some(el => el.textContent.trim() === "Ad");
                if (isAd) return;

                // 2. Extract Clean Title
                let rawTitle = linkEl.getAttribute("title") || "";

                if (!rawTitle) {
                    const titleNode = container.querySelector("._4rR01T, .s1QR8W, .IRyMuX, .Wj24N_, a.title, ._2WkL22, h2");
                    if (titleNode) {
                        rawTitle = titleNode.textContent || titleNode.innerText || "";
                    }
                }

                if (!rawTitle) {
                    const rawLinkText = (linkEl.textContent || "").trim();
                    if (rawLinkText.length > 10 && meaningfulTerms.some(t => rawLinkText.toLowerCase().includes(t))) {
                        rawTitle = rawLinkText;
                    }
                }

                const title = sanitizeTitle(rawTitle);
                if (!title) return;
                const titleLower = title.toLowerCase();

                // 3. Accessory Filter
                if (!userIsSearchingForAccessory) {
                    const isAccessory = blockedWords.some(word => titleLower.includes(word));
                    if (isAccessory) return;
                }

                // 4. Flexible Term Matching
                let matchCount = 0;
                meaningfulTerms.forEach(word => {
                    if (titleLower.includes(word)) matchCount++;
                });

                const matchRatio = meaningfulTerms.length > 0 ? matchCount / meaningfulTerms.length : 0;
                if (matchRatio < 0.6) return;

                const score = matchCount;

                // 5. Price Extraction
                let price = null;
                const primaryPriceNode = container.querySelector("div.Nx9bqj, div._30jeq3, div._1_WHN1");
                if (primaryPriceNode) {
                    price = cleanPrice(primaryPriceNode.textContent || primaryPriceNode.innerText || "");
                }

                if (!price) {
                    const candidates = Array.from(container.querySelectorAll("div, span")).filter(el => {
                        const txt = (el.textContent || "").trim();
                        if (!/^₹\s*[\d,]+$/.test(txt)) return false;

                        const isStrikethrough = window.getComputedStyle(el).textDecoration.includes("line-through");
                        const hasStrikeClass = el.classList.contains("_27ZgL4") || el.classList.contains("_3I9_wc") || el.classList.contains("_3auL10");
                        const parentTxt = (el.parentElement ? el.parentElement.textContent : "").toLowerCase();
                        const isDiscount = parentTxt.includes("off") || parentTxt.includes("exchange");

                        return !isStrikethrough && !hasStrikeClass && !isDiscount;
                    });

                    if (candidates.length > 0) {
                        price = cleanPrice(candidates[0].textContent);
                    }
                }

                if (!price) {
                    const matches = (container.textContent || "").match(/₹\s*[\d,]+/g);
                    if (matches && matches.length > 0) {
                        price = cleanPrice(matches[0]);
                    }
                }

                // 6. Image Extraction
                const imgEl = container.querySelector("img");
                let image = "";
                if (imgEl) {
                    image = imgEl.getAttribute("src") || imgEl.getAttribute("data-src") || "";
                }

                // 7. Clean Short URL Output
                const url = `https://www.flipkart.com/product/p/item?pid=${pid}`;

                // 8. Rating Extraction
                let rating = 0;
                const ratingEl = container.querySelector("._3LWZlK, ._1lR392, .XqA3y2, ._3LWZlK._1BLNfl");
                if (ratingEl) {
                    const match = (ratingEl.textContent || "").match(/([0-9.]+)/);
                    if (match) rating = parseFloat(match[1]);
                }

                if (!rating) {
                    const ratingCandidate = Array.from(container.querySelectorAll("div, span")).find(el => {
                        const txt = (el.textContent || "").trim();
                        return /^[1-5](\.[0-9])?$/.test(txt);
                    });
                    if (ratingCandidate) {
                        rating = parseFloat(ratingCandidate.textContent.trim());
                    }
                }

                if (title && price) {
                    seenPids.add(pid);
                    results.push({
                        marketplace: "flipkart",
                        pid,
                        title,
                        price,
                        image,
                        rating,
                        url,
                        score
                    });
                }
            });

            return results
                .sort((a, b) => b.score !== a.score ? b.score - a.score : b.rating - a.rating)
                .slice(0, 50);
        }, keyword);

        return {
            success: true,
            marketplace: "flipkart",
            keyword,
            products
        };

    } catch (error) {
        return {
            success: false,
            marketplace: "flipkart",
            keyword,
            products: [],
            error: error.message
        };

    } finally {
        if (page && !page.isClosed()) {
            await page.close().catch(() => {});
        }
    }
}

module.exports = {
    searchFlipkart
};