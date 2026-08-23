const { searchFlipkart } = require("../scrapers/flipkart");

const express = require("express");

const router = express.Router();

router.get("/", async (req, res) => {

    const keyword = req.query.q || req.query.keyword;

    if (!keyword) {

        return res.status(400).json({

            success: false,
            message: "Missing search keyword."

        });

    }

const results = [];
	const errors = [];
try {

    		const flipkart = await searchFlipkart(keyword);

		if (flipkart.success) {

    			results.push(...flipkart.products);

		}

	} catch (error) {

    		errors.push({
        		marketplace: "Flipkart",
        		message: error.message
    		});

	}


    res.json({

        success: true,

        keyword,

        amazon: [],

        flipkart: []
results,

    		errors


    });

});

module.exports = router;