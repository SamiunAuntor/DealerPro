const express = require("express");
const {
    getCustomers,
    getCustomer,
    addCustomer,
    updateCustomer,
    deleteCustomer,
} = require("../controllers/customerController");

const router = express.Router();

router.get("/", getCustomers);
router.get("/:id", getCustomer);
router.post("/", addCustomer);
router.patch("/:id", updateCustomer);
router.delete("/:id", deleteCustomer);

module.exports = router;
