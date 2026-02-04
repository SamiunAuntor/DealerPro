require("dotenv").config();
const app = require("./app");
const { connectDB } = require("./db/mongo");

const PORT = process.env.PORT || 5000;

async function startServer() {
    await connectDB();
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
}

startServer();
