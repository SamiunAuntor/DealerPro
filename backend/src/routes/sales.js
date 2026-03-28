const express = require("express");
const {
    createSale,
    getSales,
    getSale,
    getCompanyDueSummary,
} = require("../controllers/salesController");

const router = express.Router();

router.get("/", getSales);
router.get("/company-due", getCompanyDueSummary);
router.get("/:id", getSale);
router.post("/", createSale);

module.exports = router;
