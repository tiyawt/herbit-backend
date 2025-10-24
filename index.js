import dotenv from "dotenv";
dotenv.config();

import connectToDb from "./src/config/database.js";
import app from "./src/app.js";
import { initNotificationSchedulers } from "./src/jobs/notificationScheduler.js";

const PORT = process.env.PORT || 5000;

try {
  await connectToDb();
  initNotificationSchedulers();
  app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
  });
} catch (err) {
  console.error("❌ Startup failed:", err?.message || err);
  process.exit(1);
}
