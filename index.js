import dotenv from "dotenv";
dotenv.config();

import connectToDb from "./src/config/database.js";
import app from "./src/app.js";
import cron from "node-cron";
import { initNotificationSchedulers } from "./src/jobs/notificationScheduler.js";
import { updateYellowLeavesForInactiveUsers } from "./src/controllers/treeLeavesController.js";

const PORT = process.env.PORT || 5000;

try {
  await connectToDb();
  initNotificationSchedulers();
  app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
  
    // Jalankan setiap jam 00:00
    cron.schedule("* * * * *", async () => {
      console.log("⏰ Mengecek daun kuning jam 00:00...");
      await updateYellowLeavesForInactiveUsers();
    });
  });

} catch (err) {
  console.error("❌ Startup failed:", err?.message || err);
  process.exit(1);
}


