const { getBrowser } = require("../browser/browser");

async function searchAmazon(keyword) {
    const browser = await getBrowser();
    let page = null;

    try {
        page = await browser.newPage();

        // ---------------------------------------------------------
        // 1. Stealth Setup
        // ---------------------------------------------------------
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, "webdriver", {
                get: () => false
            });
        });

        await page.setUserAgent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        );

        // ---------------------------------------------------------
        // 2. Request Interception (Optimized for speed & memory)
        // ---------------------------------------------------------
        await page.setRequestInterception(true);

        page.on("request", (req) => {
            if (req.isInterceptResolutionHandled && req.isInterceptResolutionHandled()) {
                return;
            }

            try {
                const url = req.url().toLowerCase();
                const resourceType = req.resourceType();

                if (
                    ["image", "stylesheet", "font", "media", "other"].includes(resourceType) ||
                    url.includes("analytics") || url.includes("ads") || url.includes("tracker") || url.includes("telemetry")
                ) {
                    req.abort();
                } else {
                    req.continue();
                }
            } catch (e) {}
        });

        // ---------------------------------------------------------
        // 3. Amazon Initial Search Page Execution
        // ---------------------------------------------------------
        const searchKeyword = keyword.trim();
        const targetUrl = `https://www.amazon.in/s?k=${encodeURIComponent(searchKeyword)}`;

        await page.goto(targetUrl, {
            waitUntil: "domcontentloaded",
            timeout: 15000
        });

        await page.waitForSelector('div[data-component-type="s-search-result"]', {
            timeout: 5000
        }).catch(() => {});

        // ---------------------------------------------------------
        // 4. Detect the Most Relevant Amazon Brand
        // ---------------------------------------------------------
        const detectedBrand = await page.evaluate((keyword) => {
            const normalize = (text) => {
                return (text || "").toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
            };

            const queryNormalized = normalize(keyword);
            const queryWords = keyword
                .toLowerCase()
                .split(/\s+/)
                .map((word) => word.replace(/[^a-z0-9]/g, ""))
                .filter((word) => word.length >= 2);

            // Get organic titles
            const cards = Array.from(
                document.querySelectorAll('div[data-component-type="s-search-result"]')
            );
            const titles = [];

            for (const card of cards) {
                const sponsored = card.querySelector(
                    ".puis-sponsored-label-text, .s-sponsored-label-info, [data-component-type='s-impression-logger']"
                );
                if (sponsored) continue;

                const titleEl =
                    card.querySelector("h2 a.a-link-normal span") ||
                    card.querySelector(".a-size-medium.a-color-base.a-text-normal") ||
                    card.querySelector(".a-size-base-plus.a-color-base.a-text-normal") ||
                    card.querySelector("h2 a span") ||
                    card.querySelector("h2");

                if (!titleEl) continue;

                const title = (titleEl.textContent || titleEl.innerText || "")
                    .replace(/\s+/g, " ")
                    .trim();

                if (title) titles.push(title);
            }

            if (!titles.length) return "";

            // Find brand filter links in sidebar
            const links = Array.from(document.querySelectorAll("a"));
            const candidates = [];

            for (const link of links) {
                const text = (link.innerText || link.textContent || "").replace(/\s+/g, " ").trim();
                if (!text || text.length > 40) continue;

                const brand = normalize(text);
                if (!brand || brand.length < 2) continue;

                const href = link.getAttribute("href");
                if (!href) continue;

                const hrefLower = href.toLowerCase();
                if (!hrefLower.includes("p_89") && !hrefLower.includes("brand") && !hrefLower.includes("rh=")) {
                    continue;
                }

                const blocked = [
                    "all", "delivery", "availability", "price", "rating",
                    "discount", "seller", "sortby", "featured", "newarrivals", "subscription"
                ];

                if (blocked.includes(brand)) continue;

                candidates.push({ brand, display: text, href });
            }

            const unique = new Map();
            for (const candidate of candidates) {
                if (!unique.has(candidate.brand)) {
                    unique.set(candidate.brand, candidate);
                }
            }

            const brandCandidates = Array.from(unique.values());
            if (!brandCandidates.length) return "";

            // Score candidate brands
            const scored = [];
            for (const candidate of brandCandidates) {
                let titleMatches = 0;
                let queryMatch = false;

                for (const word of queryWords) {
                    if (candidate.brand === normalize(word)) queryMatch = true;
                }

                if (queryNormalized.includes(candidate.brand)) queryMatch = true;

                for (const title of titles) {
                    if (normalize(title).includes(candidate.brand)) titleMatches++;
                }

                const percentage = titles.length ? titleMatches / titles.length : 0;
                let score = 0;

                if (queryMatch) score += 100;
                score += percentage * 100;
                score += Math.min(titleMatches, 10);

                scored.push({ ...candidate, titleMatches, percentage, queryMatch, score });
            }

            scored.sort((a, b) => b.score - a.score);
            const best = scored[0];
            if (!best) return "";

            if (best.queryMatch) {
                return JSON.stringify({ brand: best.display, href: best.href });
            }

            if (best.titleMatches >= 3 && best.percentage >= 0.40) {
                return JSON.stringify({ brand: best.display, href: best.href });
            }

            return "";
        }, searchKeyword);

        // ---------------------------------------------------------
        // 5. Apply Detected Brand Filter
        // ---------------------------------------------------------
        if (detectedBrand) {
            const brandData = JSON.parse(detectedBrand);
            const absoluteBrandUrl = new URL(brandData.href, "https://www.amazon.in").href;

            if (absoluteBrandUrl && absoluteBrandUrl !== page.url()) {
                await page.goto(absoluteBrandUrl, {
                    waitUntil: "domcontentloaded",
                    timeout: 15000
                });

                await page.waitForSelector('div[data-component-type="s-search-result"]', {
                    timeout: 5000
                }).catch(() => {});
            }
        }

        // ---------------------------------------------------------
        // 6. Extract Products with Native Position Tracking
        // ---------------------------------------------------------
        const cleanKeyword = keyword.trim().toLowerCase();
        const tokens = cleanKeyword.split(/\s+/).filter(Boolean);

        const products = await page.evaluate((searchTokens) => {
            const cleanPrice = (text) => {
                if (!text) return null;
                const match = text.match(/[\d,]+(?:\.\d+)?/);
                if (!match) return null;
                const number = parseFloat(match[0].replace(/,/g, ""));
                return isNaN(number) ? null : number;
            };

            const extractPrice = (card) => {
                const activePriceEl = card.querySelector('.a-price:not([data-a-stripe="true"]):not(.a-text-price)');
                if (activePriceEl) {
                    const offscreen = activePriceEl.querySelector('.a-offscreen');
                    if (offscreen && offscreen.textContent) {
                        const price = cleanPrice(offscreen.textContent);
                        if (price) return price;
                    }

                    const whole = activePriceEl.querySelector('.a-price-whole');
                    if (whole && whole.textContent) {
                        const fraction = activePriceEl.querySelector('.a-price-fraction');
                        const priceText = whole.textContent + (fraction ? '.' + fraction.textContent : '');
                        const price = cleanPrice(priceText);
                        if (price) return price;
                    }
                }

                const fallbackSelectors = [
                    '.a-price .a-offscreen',
                    '.a-color-price',
                    'span.a-price-whole',
                    '.a-price-range .a-price:first-child .a-offscreen'
                ];

                for (const selector of fallbackSelectors) {
                    const el = card.querySelector(selector);
                    if (el && el.textContent) {
                        const price = cleanPrice(el.textContent);
                        if (price) return price;
                    }
                }

                return null;
            };

            const results = [];
            const seenAsins = new Set();
            const cards = document.querySelectorAll('div[data-component-type="s-search-result"]');
            let nativeRank = 1;

            cards.forEach((el) => {
                const asin = el.getAttribute("data-asin");
                if (!asin || asin.length !== 10 || seenAsins.has(asin)) return;

                // Exclude Sponsored Products without breaking rank index
                const sponsored = el.querySelector(".puis-sponsored-label-text, .s-sponsored-label-info, [data-component-type='s-impression-logger']");
                const containsAdText = el.textContent.toLowerCase().includes("sponsored");
                if (sponsored || (containsAdText && !el.querySelector("h2"))) return;

                const currentRank = nativeRank++;

                const brandBadge = el.querySelector(".a-size-mini, .s-line-clamp-1, h5, .a-color-secondary");
                const brandText = brandBadge ? brandBadge.textContent : "";
                const titleEl = el.querySelector("h2");
                const rawTitleText = titleEl ? titleEl.textContent : "";

                if (!rawTitleText && !brandText) return;

                const combinedText = `${brandText} ${rawTitleText}`.toLowerCase().replace(/\s+/g, " ");

                // Ensure matches query tokens
                const matchesTokens = searchTokens.every(token => {
                    const altToken = token === "oneplus" ? "one plus" : token;
                    return combinedText.includes(token) || combinedText.includes(altToken);
                });

                if (!matchesTokens) return;

                const title = rawTitleText.replace(/\s+/g, " ").trim();
                const price = extractPrice(el);

                let rating = 0;
                const ratingElement = el.querySelector("i.a-icon-star-small span, i.a-icon-star span, .a-icon-alt");
                if (ratingElement) {
                    const match = (ratingElement.textContent || "").match(/([0-9.]+)/);
                    if (match) rating = parseFloat(match[1]);
                }

                seenAsins.add(asin);
                results.push({
                    position: currentRank,
                    marketplace: "amazon",
                    id: asin,
                    asin,
                    title,
                    price,
                    image: "",
                    rating,
                    url: `https://www.amazon.in/dp/${asin}`
                });
            });

            return results;
        }, tokens);

        return {
            success: true,
            marketplace: "amazon",
            keyword,
            products: products.slice(0, 50)
        };

    } catch (error) {
        return {
            success: false,
            marketplace: "amazon",
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
    searchAmazon
};