const express = require("express");
const { createReturn, getReturns, getReturn } = require("../controllers/returnsController");

const router = express.Router();

router.get("/", getReturns);
router.get("/:id", getReturn);
router.post("/", createReturn);

module.exports = router;
