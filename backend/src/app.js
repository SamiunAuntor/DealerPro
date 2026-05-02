const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const customerRoutes = require("./routes/customers");
const salesRoutes = require("./routes/sales");
const returnRoutes = require("./routes/returns");
const dashboardRoutes = require("./routes/dashboard");
const { requireAuth } = require("./middleware/auth");

const app = express();
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

app.use(
    cors({
        origin: frontendUrl,
        credentials: true,
    })
);
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/products", requireAuth, productRoutes);
app.use("/customers", requireAuth, customerRoutes);
app.use("/sales", requireAuth, salesRoutes);
app.use("/returns", requireAuth, returnRoutes);
app.use("/dashboard", requireAuth, dashboardRoutes);

app.get("/", (req, res) => {
    res.send("DealerPro backend running");
});

module.exports = app;
