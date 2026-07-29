const express = require("express");

const router = express.Router();

router.get("/", async (req, res) => {

    const keyword = req.query.q;

    if (!keyword) {

        return res.status(400).json({

            success: false,
            message: "Missing search keyword."

        });

    }

    res.json({

        success: true,

        keyword,

        amazon: [],

        flipkart: []

    });

});

module.exports = router;