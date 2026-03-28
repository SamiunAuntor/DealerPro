const express = require("express");
const {
    createSale,
    getSales,
    getSale,
    getCompanyDueSummary,
    getCompanyDueSettlements,
    createCompanyDueSettlement,
} = require("../controllers/salesController");

const router = express.Router();

router.get("/", getSales);
router.get("/company-due", getCompanyDueSummary);
router.get("/company-due/settlements", getCompanyDueSettlements);
router.post("/company-due/settlements", createCompanyDueSettlement);
router.get("/:id", getSale);
router.post("/", createSale);

module.exports = router;
