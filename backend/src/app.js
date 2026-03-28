const express = require("express");
const cors = require("cors");

const productRoutes = require("./routes/products");
const customerRoutes = require("./routes/customers");
const salesRoutes = require("./routes/sales");
const returnRoutes = require("./routes/returns");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/products", productRoutes);
app.use("/customers", customerRoutes);
app.use("/sales", salesRoutes);
app.use("/returns", returnRoutes);

app.get("/", (req, res) => {
    res.send("DealerPro backend running");
});

module.exports = app;
