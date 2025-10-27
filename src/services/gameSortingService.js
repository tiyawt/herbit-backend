import GameSorting from "../models/gameSorting.js";
import GameSortingReward from "../models/gameSortingReward.js";
import { bumpSortingStreak } from "./streakService.js";
import { todayBucketWIB } from "../utils/date.js";

/** buat sesi baru setiap kali user klik "Main" */
export async function startGameSession(userId, now = new Date()) {
  const bucket = todayBucketWIB(now);
  const session = await GameSorting.create({
    userId,
    playedDate: now,
    dayBucket: bucket,
  });
  return session;
}

export async function completeGameSession(sessionId, userId, now = new Date()) {
  const session = await GameSorting.findByIdAndUpdate(
    sessionId,
    { $set: { isCompleted: true } },
    { new: true }
  );
  if (!session) throw new Error("Session not found");

  if (!session.dayBucket) {
    session.dayBucket = todayBucketWIB(now);
    await session.save();
  }

  await bumpSortingStreak(userId, now);
  const reward = await claimDailyReward(userId, { points: 10 }, now);
  return { session, reward };
}

export async function claimDailyReward(
  userId,
  { points = 10 } = {},
  now = new Date()
) {
  const bucket = todayBucketWIB(now);

  try {
    const reward = await GameSortingReward.create({
      userId,
      pointAwarded: points,
      claimedAt: now,
      dayBucket: bucket,
    });
    return reward;
  } catch (e) {
    if (e.code === 11000) {
      const existing = await GameSortingReward.findOne({
        userId,
        dayBucket: bucket,
      });
      return Object.assign(existing, { _alreadyClaimed: true });
    }
    throw e;
  }
}
