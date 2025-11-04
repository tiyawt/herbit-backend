// src/cronJobs.js
import cron from "node-cron";
import { autoCancelExpiredProjects } from "./controllers/ecoenzimController.js";

// Jalankan setiap jam 00:00
cron.schedule('0 0 * * *', autoCancelExpiredProjects);

console.log("⏰ Cron job auto-cancel expired projects aktif");