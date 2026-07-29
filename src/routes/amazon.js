const express = require("express");
const router = express.Router();

const { getAmazonProduct } = require("../scrapers/amazon");

router.get("/:asin", async (req, res) => {

    try {

        const product = await getAmazonProduct(req.params.asin);

        res.json(product);

    } catch (err) {

        res.status(500).json({

            success: false,
            message: err.message

        });

    }

});

module.exports = router;