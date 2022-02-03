const express = require("express");
const { join } = require("path");

const router = express.Router();

router.use(express.static(join(__dirname, "../frontend")));
router.get("/:gallery?", (req, res) => {
    res.sendFile(join(__dirname, "../frontend/index.html"));
}) ;


module.exports = router;