import dotenv from "dotenv";
dotenv.config();

import connectToDb from "./src/config/database.js";
import app from "./src/app.js";
import { initNotificationSchedulers } from "./src/jobs/notificationScheduler.js";
import { initCronJobs } from "./src/jobs/taskScheduler.js";
import { initProfilePhotoBucket } from "./src/utils/gridfs.js";

const PORT = process.env.PORT || 5001;

try {
  await connectToDb();
  initProfilePhotoBucket();


  initNotificationSchedulers();
  initCronJobs();
  app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
  });
} catch (err) {
  console.error("❌ Startup failed:", err?.message || err);
  process.exit(1);
}
