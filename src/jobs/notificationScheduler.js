// src/jobs/notificationScheduler.js
import cron from "node-cron";
import mongoose from "mongoose";
import User from "../models/user.js";
import {
  pushDailyTaskNotif,
  pushEcoenzymProgressNotif,
  pushVoucherExpiring,
  pushGameSortingInvite,
} from "../services/notificationService.js";
import {
  daysBetween,
  todayBucketWIB,
  startEndOfWIBDayUTC,
} from "../utils/date.js";
import EcoenzimProject from "../models/ecoenzimProject.js";
import VoucherRedemption from "../models/voucherReedemption.js";
import GameSorting from "../models/gameSorting.js";
import notification from "../models/notification.js";

export function initNotificationSchedulers() {
  // Daily Task — tiap hari 06:00 WIB
  cron.schedule(
    "0 6 * * *",
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

  // Ecoenzym — tiap hari 08:00 WIB
  cron.schedule(
    "0 8 * * *",
    async () => {
      console.log(
        "🕒 Ecoenzym cron:",
        new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })
      );

      const projects = await EcoenzimProject.find(
        { status: { $in: ["ongoing", "active"] } },
        "_id userId startDate endDate status"
      ).lean();

      const today = new Date();
      const milestones = [7, 14, 21, 30, 35, 42, 49, 56, 60, 70, 77, 84, 90];

      let created = 0,
        skipped = 0;

      for (const p of projects) {
        if (!p.startDate) {
          skipped++;
          continue;
        }
        if (p.endDate && today > new Date(p.endDate)) {
          skipped++;
          continue;
        }

        const dayNumber = daysBetween(new Date(p.startDate), today) + 1;

        if (!milestones.includes(dayNumber)) {
          skipped++;
          continue;
        }

        let userIdObj = null;
        try {
          userIdObj = mongoose.Types.ObjectId.createFromHexString(p.userId);
        } catch {
          console.error("❌ ecoenzym userId bukan ObjectId hex:", p.userId);
          skipped++;
          continue;
        }

        try {
          await pushEcoenzymProgressNotif(userIdObj, p._id, dayNumber);
          created++;
        } catch (e) {
          if (e.code === 11000) {
          } else {
            console.error("❌ pushEcoenzym:", e);
          }
        }
      }

      console.log(
        `✅ Ecoenzym notifications checked (created=${created}, skipped=${skipped})`
      );
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

  // Voucher — H-1 sebelum expired (12:00 WIB)
  cron.schedule(
    "0 12 * * *",
    async () => {
      const target = tomorrowDateStrWIB(); // "YYYY-MM-DD" besok (WIB)
      console.log("🕒 Voucher cron (WIB target):", target);

      const { startUTC, endUTC } = startEndOfWIBDayUTC(target);

      const cur = await VoucherRedemption.find(
        { expiresAt: { $gte: startUTC, $lte: endUTC } },
        "_id userId voucherId expiresAt"
      ).lean();

      let created = 0;
      for (const r of cur) {
        try {
          await pushVoucherExpiring(r.userId, r.voucherId || r._id);
          created++;
        } catch (e) {
          if (e.code !== 11000) console.error("❌ pushVoucher:", e);
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
    "0 10 * * *",
    async () => {
      const bucket = todayBucketWIB();
      console.log("🕒 GameReminder @12:00 WIB bucket:", bucket);

      const completedUserIds = await GameSorting.distinct("userId", {
        dayBucket: bucket,
        isCompleted: true,
      });
      const alreadyNotifiedUserIds = await notification.distinct("userId", {
        type: "game_sorting",
        dayBucket: bucket,
      });

      const exclude = new Set([
        ...completedUserIds.map(String),
        ...alreadyNotifiedUserIds.map(String),
      ]);

      const users = await User.find({}, "_id");
      let created = 0,
        skipped = 0;

      for (const u of users) {
        if (exclude.has(u._id.toString())) {
          skipped++;
          continue;
        }

        try {
          await pushGameSortingInvite(u._id, new Date());
          created++;
        } catch (e) {
          if (e.code === 11000) {
            /* dupe → aman */ skipped++;
          } else console.error("❌ pushGameDailyReminder:", e);
        }
      }

      console.log(
        `✅ Game reminders sent (created=${created}, skipped=${skipped})`
      );
    },
    { timezone: "Asia/Jakarta" }
  );

  console.log("⏰ Notification schedulers initialized (Asia/Jakarta).");
}
