import cron from "node-cron";
import { updateYellowLeavesForInactiveUsers } from "../controllers/treeLeavesController.js";

// Fungsi untuk register semua cron jobs
export const initCronJobs = () => {
  // Jalankan setiap jam 00:00
  cron.schedule("0 0 0 * * *", async () => {
    console.log("⏰ Mengecek daun kuning jam 00:00...");
    try {
      await updateYellowLeavesForInactiveUsers();
    } catch (err) {
      console.error("❌ Error updateYellowLeavesForInactiveUsers:", err);
    }
  });

  console.log("✅ Cron jobs initialized");
};
