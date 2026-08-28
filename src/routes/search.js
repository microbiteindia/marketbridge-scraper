const express = require("express");

const { searchAmazon } = require("../scrapers/search-amazon");
const { searchFlipkart } = require("../scrapers/search-flipkart");

const router = express.Router();

router.get("/", async (req, res) => {

    const keyword =
        req.query.q ||
        req.query.keyword;


    if (!keyword || !keyword.trim()) {

        return res.status(400).json({

            success: false,
            message: "Missing search keyword."

        });

    }


    const cleanKeyword =
        keyword.trim();


    const amazonPromise =
        searchAmazon(cleanKeyword)
            .catch(error => ({

                success: false,
                marketplace: "amazon",
                keyword: cleanKeyword,
                products: [],
                error: error.message

            }));


    const flipkartPromise =
        searchFlipkart(cleanKeyword)
            .catch(error => ({

                success: false,
                marketplace: "flipkart",
                keyword: cleanKeyword,
                products: [],
                error: error.message

            }));


    const [
        amazon,
        flipkart
    ] = await Promise.all([
        amazonPromise,
        flipkartPromise
    ]);


    const errors = [];


    if (!amazon.success) {

        errors.push({

            marketplace: "Amazon",
            message: amazon.error || "Amazon search failed."

        });

    }


    if (!flipkart.success) {

        errors.push({

            marketplace: "Flipkart",
            message: flipkart.error || "Flipkart search failed."

        });

    }


    return res.json({

        success: true,

        keyword: cleanKeyword,

        amazon: amazon.success
            ? amazon.products
            : [],

        flipkart: flipkart.success
            ? flipkart.products
            : [],

        errors

    });

});


module.exports = router;