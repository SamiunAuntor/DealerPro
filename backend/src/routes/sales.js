const express = require("express");
const {
    createSale,
    getSales,
    getSale,
    getSalePayments,
    createSalePayment,
    getCompanyDueSummary,
    getCompanyDueSettlements,
    createCompanyDueSettlement,
    getCompanyDueSettlementReport,
} = require("../controllers/salesController");

const router = express.Router();

router.get("/", getSales);
router.get("/company-due", getCompanyDueSummary);
router.get("/company-due/settlements", getCompanyDueSettlements);
router.get("/company-due/settlements/:id/report", getCompanyDueSettlementReport);
router.post("/company-due/settlements", createCompanyDueSettlement);
router.get("/:id/payments", getSalePayments);
router.post("/:id/payments", createSalePayment);
router.get("/:id", getSale);
router.post("/", createSale);

module.exports = router;
