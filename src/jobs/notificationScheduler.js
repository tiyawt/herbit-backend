// src/jobs/notificationScheduler.js
import cron from "node-cron";
import mongoose from "mongoose";
import User from "../models/user.js";
import {
  pushDailyTaskNotif,
  pushEcoenzymProgressNotif,
  pushVoucherExpiring,
} from "../services/notificationService.js";
import { daysBetween } from "../utils/date.js";

const EcoenzymProjects = () =>
  mongoose.connection.collection("ecoenzym_projects");
const Vouchers = () => mongoose.connection.collection("vouchers");

export function initNotificationSchedulers() {
  if (mongoose.connection.readyState !== 1) {
    console.warn("⚠️ Mongo belum connected, scheduler belum di-init.");
    return;
  }

  // 1️⃣ Daily Task — tiap hari 08:00 WIB
  cron.schedule(
    "0 8 * * *",
    async () => {
      console.log(
        "🕒 DailyTask cron:",
        new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })
      );

      const users = await User.find({}, "_id");
      let count = 0;
      for (const u of users) {
        try {
          await pushDailyTaskNotif(u._id);
          count++;
        } catch (e) {
          if (e.code !== 11000) console.error("❌ pushDailyTaskNotif:", e);
        }
      }

      console.log(`✅ Daily task notifications done (created=${count})`);
    },
    { timezone: "Asia/Jakarta" }
  );

  // 2️⃣ Ecoenzym — tiap hari 08:00 WIB
  cron.schedule(
    "0 8 * * *",
    async () => {
      console.log(
        "🕒 Ecoenzym cron:",
        new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })
      );

      const today = new Date();
      const projects = EcoenzymProjects().find(
        { status: { $in: ["ongoing", "active"] } },
        { projection: { _id: 1, user_id: 1, start_date: 1, end_date: 1 } }
      );

      let count = 0;
      for await (const p of projects) {
        if (!p.start_date) continue;
        if (p.end_date && today > new Date(p.end_date)) continue;

        const d = daysBetween(new Date(p.start_date), today);
        const milestones = [7, 14, 21, 28, 35, 42, 49, 56, 63, 70, 77, 84, 90];
        if (!milestones.includes(d)) continue;

        try {
          await pushEcoenzymProgressNotif(p.user_id, p._id, d);
          count++;
        } catch (e) {
          if (e.code !== 11000) console.error("❌ pushEcoenzym:", e);
        }
      }

      console.log(`✅ Ecoenzym notifications checked (created=${count})`);
    },
    { timezone: "Asia/Jakarta" }
  );

  // 3️⃣ Voucher — H-1 sebelum expired (09:00 WIB)
  cron.schedule(
    "0 9 * * *",
    async () => {
      console.log(
        "🕒 Voucher cron:",
        new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })
      );

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const start = new Date(tomorrow.setHours(0, 0, 0, 0));
      const end = new Date(tomorrow.setHours(23, 59, 59, 999));

      const vouchers = Vouchers().find(
        { valid_until: { $gte: start, $lte: end } },
        { projection: { _id: 1, user_id: 1 } }
      );

      let count = 0;
      for await (const v of vouchers) {
        try {
          await pushVoucherExpiring(v.user_id, v._id);
          count++;
        } catch (e) {
          if (e.code !== 11000) console.error("❌ pushVoucher:", e);
        }
      }

      console.log(`✅ Voucher notifications checked (created=${count})`);
    },
    { timezone: "Asia/Jakarta" }
  );

  console.log("⏰ Notification schedulers initialized (Asia/Jakarta).");
}
