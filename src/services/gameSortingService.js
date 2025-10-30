// src/services/gameSortingService.js
import mongoose from "mongoose";
import GameSorting from "../models/gameSorting.js";
import GameSortingReward from "../models/gameSortingReward.js";
import User from "../models/user.js";
import { bumpSortingStreak } from "./streakService.js";
import { todayBucketWIB } from "../utils/date.js";

const DAILY_POINT = 10; //

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
  const session = await GameSorting.findOne({ _id: sessionId, userId });
  if (!session) throw new Error("Session not found");

  if (!session.dayBucket) session.dayBucket = todayBucketWIB(now);
  await session.save();

  const userAfter = await bumpSortingStreak(userId, now);
  const entitledPoint = DAILY_POINT;

  return {
    session,
    reward: { entitledPoint, dayBucket: session.dayBucket },
    user: {
      sortingStreak: userAfter?.sortingStreak ?? 0,
      sortingBestStreak: userAfter?.sortingBestStreak ?? 0,
      sortingLastPlayedBucket: userAfter?.sortingLastPlayedBucket ?? null,
      totalPoints: userAfter?.totalPoints ?? 0,
    },
  };
}

export async function claimGameReward(sessionId, userId, now = new Date()) {
  const session = await GameSorting.findOne({ _id: sessionId, userId });
  if (!session) throw new Error("Session not found");

  const bucket = session.dayBucket || todayBucketWIB(now);
  const point = DAILY_POINT;

  const trx = await mongoose.startSession();
  try {
    let rewardDoc;
    await trx.withTransaction(async () => {
      rewardDoc = await GameSortingReward.findOne({
        userId,
        dayBucket: bucket,
      }).session(trx);

      if (!rewardDoc) {
        const [created] = await GameSortingReward.create(
          [
            {
              userId,
              gameSortingId: session._id,
              dayBucket: bucket,
              pointAwarded: point,
              claimedAt: now,
            },
          ],
          { session: trx }
        );
        rewardDoc = created;

        if (!session.isCompleted) {
          session.isCompleted = true;
          await session.save({ session: trx });
        }

        await User.updateOne(
          { _id: userId },
          { $inc: { totalPoints: rewardDoc.pointAwarded } },
          { session: trx }
        );
      }
    });

    const user = await User.findById(userId).select(
      "totalPoints sortingStreak sortingBestStreak sortingLastPlayedBucket"
    );

    const alreadyClaimed = !!(await GameSortingReward.findOne({
      userId,
      dayBucket: bucket,
    }));
    return { alreadyClaimed, reward: rewardDoc, user };
  } finally {
    trx.endSession();
  }
}
