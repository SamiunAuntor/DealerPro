const express = require("express");
const { createSale, getSales, getSale } = require("../controllers/salesController");

const router = express.Router();

router.get("/", getSales);
router.get("/:id", getSale);
router.post("/", createSale);

module.exports = router;
