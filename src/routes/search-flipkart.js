const express = require("express");

const {
    searchFlipkart
} = require("../scrapers/search-flipkart");

const router = express.Router();

router.get("/", async (req, res) => {

    const keyword =
        req.query.q ||
        req.query.keyword;


    if (!keyword || !keyword.trim()) {

        return res.status(400).json({

            success: false,
            marketplace: "flipkart",
            message: "Missing search keyword.",
            products: []

        });

    }


    try {

        const result =
            await searchFlipkart(keyword.trim());


        return res.json(result);

    } catch (error) {

        return res.status(500).json({

            success: false,

            marketplace: "flipkart",

            keyword: keyword.trim(),

            products: [],

            error: error.message

        });

    }

});


module.exports = router;