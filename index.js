import express from "express";
import dotenv from "dotenv";
import connectToDb from "./src/config/database.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

try {
  await connectToDb(); 
  app.get("/", (req, res) => {
    res.json({ message: "MongoDB connection success!" });
  });
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
} catch (err) {
  console.error("Startup failed:", err?.message || err);
  process.exit(1);
}
