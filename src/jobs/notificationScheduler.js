// src/jobs/notificationScheduler.js
import cron from "node-cron";
import mongoose from "mongoose";
import User from "../models/user.js";
import {
  pushDailyTaskNotif,
  pushEcoenzymProgressNotif,
  pushVoucherExpiring,
} from "../services/notificationService.js";
import { daysBetween, todayBucketWIB } from "../utils/date.js";
import { pushGameSortingInvite } from "../services/notificationService.js";


const EcoenzymProjects = () =>
  mongoose.connection.collection("ecoenzymProjects");
const VoucherRedemptions = () =>
  mongoose.connection.collection("voucherRedemptions");
const GameSortings = () => mongoose.connection.collection("gameSortings");

export function initNotificationSchedulers() {
  if (mongoose.connection.readyState !== 1) {
    console.warn("⚠️ Mongo belum connected, scheduler belum di-init.");
    return;
  }

  // 1️⃣ Daily Task — tiap hari 06:00 WIB
  cron.schedule(
    "35 8 * * *",
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
    "47 8 * * *",
    async () => {
      console.log( 
        "🕒 Ecoenzym cron:",
        new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })
      );

      const today = new Date();
      const projects = EcoenzymProjects().find(
        { status: { $in: ["ongoing", "active"] } },
        {
          projection: {
            _id: 1,
            userId: 1,
            startDate: 1,
            endDate: 1,
            status: 1,
          },
        }
      );

      let count = 0;
      for await (const p of projects) {
        if (!p.startDate) continue;
        if (p.endDate && today > new Date(p.endDate)) continue;

        const d = daysBetween(new Date(p.startDate), today);
        const milestones = [7, 14, 21, 30, 35, 42, 49, 56, 60, 70, 77, 84, 90];
        if (!milestones.includes(d)) continue;

        try {
          await pushEcoenzymProgressNotif(p.userId, p._id, d);
          count++;
        } catch (e) {
          if (e.code !== 11000) console.error("❌ pushEcoenzym:", e);
        }
      }

      console.log(`✅ Ecoenzym notifications checked (created=${count})`);
    },
    { timezone: "Asia/Jakarta" }
  );

  
  function tomorrowDateStrWIB() {
    const fmt = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const nowWIB = fmt.format(new Date()); // hari ini WIB
    const [y, m, d] = nowWIB.split("-").map(Number);
    const todayWIB = new Date(Date.UTC(y, m - 1, d)); // 00:00 WIB dalam UTC
    const tmrWIB = new Date(todayWIB.getTime() + 24 * 60 * 60 * 1000);
    const y2 = tmrWIB.getUTCFullYear(),
      m2 = String(tmrWIB.getUTCMonth() + 1).padStart(2, "0"),
      d2 = String(tmrWIB.getUTCDate()).padStart(2, "0");
    return `${y2}-${m2}-${d2}`;
  }

  // 3️⃣ Voucher — H-1 sebelum expired (09:00 WIB)
  cron.schedule(
    "48 8 * * *",
    async () => {
      const target = tomorrowDateStrWIB();
      console.log("🕒 Voucher cron (WIB target):", target);

      // Mencari redemption yang expiresAt jatuh di BESOK (WIB) pakai $expr
      const cur = VoucherRedemptions().find(
        {
          $expr: {
            $eq: [
              {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$expiresAt",
                  timezone: "Asia/Jakarta",
                },
              },
              target,
            ],
          },
        },
        { projection: { _id: 1, userId: 1, voucherId: 1, expiresAt: 1 } }
      );

      let created = 0,
        seen = 0;
      for await (const r of cur) {
        seen++;
        try {
          await pushVoucherExpiring(r.userId, r.voucherId || r._id);
          created++;
        } catch (e) {
          if (e.code === 11000) {
            console.log("⚠️ duplicate skipped", {
              userId: r.userId?.toString?.(),
              ref: (r.voucherId || r._id)?.toString?.(),
            });
          } else {
            console.error("❌ pushVoucher:", e);
          }
        }
      }


      console.log(
        `✅ Voucher expiry notifications checked (created=${created})`
      );
    },
    { timezone: "Asia/Jakarta" }
  );

  console.log("⏰ Notification schedulers initialized (Asia/Jakarta).");

  // Game Sorting — tiap hari 10:00 WIB
  cron.schedule(
    "38 8 * * *",
    async () => {
      const bucket = todayBucketWIB();
      console.log("🕒 GameSorting notif cron (bucket WIB):", bucket);

      const completers = await GameSortings().distinct("userId", {
        dayBucket: bucket,
        isCompleted: true,
      });
      const completedSet = new Set(
        completers.map((x) => x.toString?.() ?? String(x))
      );

      const users = await User.find({}, "_id");
      let created = 0,
        skipped = 0;

      for (const u of users) {
        const uid = u._id.toString();
        if (completedSet.has(uid)) {
          skipped++;
          continue;
        }

        try {
          const res = await pushGameSortingInvite(u._id, new Date());
          if (res) created++;
        } catch (e) {
          if (e.code === 11000) skipped++;
          else console.error("❌ pushGameSortingInvite:", e);
        }
      }

      console.log(
        `✅ GameSorting invites done (created=${created}, skipped=${skipped})`
      );
    },
    { timezone: "Asia/Jakarta" }
  );

  console.log("⏰ Notification schedulers initialized (Asia/Jakarta).");
}
