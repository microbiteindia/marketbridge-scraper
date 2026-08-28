const express = require("express");

const amazonRoute = require("./routes/amazon");
const flipkartRoutes = require("./routes/flipkart");

const searchRoute = require("./routes/search");
const amazonSearchRoute = require("./routes/search-amazon");
const flipkartSearchRoute = require("./routes/search-flipkart");

const { getBrowser } = require("./browser/browser");

const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json());


app.get("/", (req, res) => {

    res.json({
        success: true,
        message: "MarketBridge Scraper is running."
    });

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

app.listen(PORT, () => {

    console.log(`Server running on port ${PORT}`);

});