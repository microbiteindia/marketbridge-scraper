const express = require("express");

const app = express();

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "MarketBridge Scraper is running."
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});