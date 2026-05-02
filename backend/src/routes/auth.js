const express = require("express");
const { login, logout, getSession } = require("../controllers/authController");

const router = express.Router();

router.post("/login", login);
router.post("/logout", logout);
router.get("/session", getSession);

module.exports = router;
