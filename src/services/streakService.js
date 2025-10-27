// src/services/streakService.js
import User from "../models/user.js";
import { todayBucketWIB, yesterdayBucketFrom } from "../utils/date.js";

/**
 * Increment streak sorting kalau:
 * - belum pernah main hari ini (WIB), dan
 * - terakhir main = kemarin -> +1, selain itu reset ke 1
 * Jika sudah main hari ini, tidak ada perubahan.
 */
export async function bumpSortingStreak(userId, now = new Date()) {
  const today = todayBucketWIB(now);
  const yesterday = yesterdayBucketFrom(now);

  const user = await User.findById(userId, {
    sortingStreak: 1,
    sortingBestStreak: 1,
    sortingLastPlayedBucket: 1,
  });

  if (!user) return null;

  if (user.sortingLastPlayedBucket === today) return user;

  let nextStreak = 1;
  if (user.sortingLastPlayedBucket === yesterday) {
    nextStreak = (user.sortingStreak || 0) + 1;
  }

  const best = Math.max(user.sortingBestStreak || 0, nextStreak);

  user.sortingStreak = nextStreak;
  user.sortingBestStreak = best;
  user.sortingLastPlayedBucket = today;

  await user.save();
  return user;
}
