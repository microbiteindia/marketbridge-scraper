const express = require("express");
const cors = require("cors");
const NodeCache = require("node-cache");

const amazonRoute = require("./routes/amazon");
const flipkartRoutes = require("./routes/flipkart");

const searchRoute = require("./routes/search");
const amazonSearchRoute = require("./routes/search-amazon");
const flipkartSearchRoute = require("./routes/search-flipkart");

const { getBrowser } = require("./browser/browser");

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize cache with 1-hour TTL (Time-To-Live)
const routeCache = new NodeCache({ stdTTL: 3600, checkperiod: 120 });

// Middlewares
app.use(cors());
app.use(express.json());

// In-Memory Response Caching Middleware
const cacheMiddleware = (req, res, next) => {
    // Only cache GET requests
    if (req.method !== "GET") return next();

    const cacheKey = req.originalUrl || req.url;
    const cachedResponse = routeCache.get(cacheKey);

    if (cachedResponse) {
        return res.json({
            ...cachedResponse,
            cached: true
        });
    }

// Intercept res.json to store payload before sending
    const originalJson = res.json.bind(res);
    res.json = (body) => {
        if (res.statusCode === 200 && body && body.success !== false) {
            routeCache.set(cacheKey, body);
        }
        return originalJson(body);
    };

    next();
};

// Apply cache to all scraping routes
app.use(cacheMiddleware);


app.get("/", (req, res) => {

    res.json({
        success: true,
        message: "MarketBridge Scraper is running."
    });

});

// Health Check Endpoint (For Uptime Monitoring & Keep-Alive)
app.get("/health", (req, res) => {
    res.status(200).send("OK");
});

app.get("/browser", async (req, res) => {

    try {

        await getBrowser();

        res.json({
            success: true,
            message: "Browser started successfully."
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

});

app.use("/amazon", amazonRoute);
app.use("/flipkart", flipkartRoutes);

app.use("/search", searchRoute);

// /search-amazon?q=iphone+15
app.use("/search-amazon", amazonSearchRoute);

// /search-flipkart?q=iphone+15
app.use("/search-flipkart", flipkartSearchRoute);

// Global 404 Handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Endpoint not found"
    });
});

const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

process.on("SIGTERM", () => {
    console.log("SIGTERM received. Shutting down gracefully...");
    server.close(() => {
        console.log("Process terminated.");
        process.exit(0); // Exits cleanly so Docker registers code 0 (no error)
    });
});