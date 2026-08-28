const express = require("express");

const {
    searchAmazon
} = require("../scrapers/search-amazon");

const router = express.Router();

router.get("/", async (req, res) => {

    const keyword =
        req.query.q ||
        req.query.keyword;


    if (!keyword || !keyword.trim()) {

        return res.status(400).json({

            success: false,
            marketplace: "amazon",
            message: "Missing search keyword.",
            products: []

        });

    }


    try {

        const result =
            await searchAmazon(keyword.trim());


        return res.json(result);

    } catch (error) {

        return res.status(500).json({

            success: false,

            marketplace: "amazon",

            keyword: keyword.trim(),

            products: [],

            error: error.message

        });

    }

});


module.exports = router;