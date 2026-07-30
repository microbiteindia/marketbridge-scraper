const express = require("express");

const router = express.Router();

const { getFlipkartProduct } = require("../scrapers/flipkart");

router.get("/:pid", async (req, res) => {

    try {

        const data = await getFlipkartProduct(req.params.pid);

        res.json(data);

    } catch (e) {

        res.json({

            success: false,

            message: e.message

        });

    }

});

module.exports = router;