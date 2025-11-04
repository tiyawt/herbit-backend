// src/services/gameSortingService.js
import mongoose from "mongoose";
import GameSorting from "../models/gameSorting.js";
import GameSortingReward from "../models/gameSortingReward.js";
import User from "../models/user.js";
import { bumpSortingStreak } from "./streakService.js";
import { todayBucketWIB } from "../utils/date.js";
import { recordPointsChange } from "./pointsHistoryService.js";

const DAILY_POINT = 10; 

export async function startGameSession(userId, now = new Date()) {
  const bucket = todayBucketWIB(now);
  let session = await GameSorting.findOne({
    userId,
    dayBucket: bucket,
  }).sort({ createdAt: -1 });

  if (!session) {
    session = await GameSorting.create({
      userId,
      playedDate: now,
      dayBucket: bucket,
    });
  }

  return session;
}

export async function completeGameSession(sessionId, userId, now = new Date()) {
  const session = await GameSorting.findOne({ _id: sessionId, userId });
  if (!session) throw new Error("Session not found");

  if (!session.dayBucket) session.dayBucket = todayBucketWIB(now);

  if (!session.isCompleted) {
    session.isCompleted = true;
    await session.save();
  }

  const userAfter = await bumpSortingStreak(userId, now);
  const entitledPoint = DAILY_POINT;

  const bucket = session.dayBucket;
  const existingReward = await GameSortingReward.findOne({
    userId,
    dayBucket: bucket,
  });

  return {
    session: {
      _id: session._id,
      dayBucket: session.dayBucket,
      isCompleted: session.isCompleted,
      rewardClaimed: !!existingReward, 
    },
    reward: {
      entitledPoint,
      dayBucket: session.dayBucket,
      alreadyClaimed: !!existingReward, 
    },
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

        await recordPointsChange(
          {
            userId,
            pointsAmount: rewardDoc.pointAwarded,
            source: "game",
            referenceId: rewardDoc._id?.toString() ?? null,
            createdAt: rewardDoc.claimedAt ?? now,
          },
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
