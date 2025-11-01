import cron from "node-cron";
import User from "../models/user.js";
import { todayBucketWIB, addDaysBucket } from "../utils/date.js";

cron.schedule(
  "5 0 * * *",
  async () => {
    try {
      const today = todayBucketWIB(new Date());
      const yesterday = addDaysBucket(today, -1);

      const res = await User.updateMany(
        {
          $or: [
            { sortingLastPlayedBucket: { $exists: false } },
            { sortingLastPlayedBucket: { $lt: yesterday } },
          ],
          sortingStreak: { $gt: 0 },
        },
        { $set: { sortingStreak: 0 } }
      );

      console.log("🔁 Streak reset:", res);
    } catch (e) {
      console.error("Streak reset cron error:", e);
    }
  },
  { timezone: "Asia/Jakarta" }
);
