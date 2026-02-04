const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// Routes
const productRoutes = require("./routes/products");
app.use("/api/products", productRoutes);

// test route
app.get("/", (req, res) => {
    res.send("DealerPro backend running");
});

module.exports = app;
