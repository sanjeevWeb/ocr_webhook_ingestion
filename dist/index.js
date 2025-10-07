import express from "express";
import dotenv from "dotenv";
import { connectDB } from "./config/database.js";
dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;
// Connect Database
connectDB();
// Init Middleware
app.use(express.json());
app.get("/", (req, res) => res.send("API Running"));
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
//# sourceMappingURL=index.js.map