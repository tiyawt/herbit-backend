import mongoose from "mongoose";
import Reward from "../models/reward.js";
import MilestoneClaim from "../models/milestoneClaim.js";
import User from "../models/user.js";
import { recordPointsChange } from "./pointsHistoryService.js";

function mapReward(reward) {
  if (!reward) return null;
  return {
    id: reward._id?.toString() ?? null,
    code: reward.code,
    name: reward.name,
    description: reward.description,
    pointsReward: reward.pointsReward,
    targetDays: reward.targetDays,
    isActive: reward.isActive,
    createdAt: reward.createdAt,
    updatedAt: reward.updatedAt,
  };
}

function mapMilestoneClaim(claim, reward) {
  if (!claim) return null;
  const rewardDoc = reward ?? claim.rewardId;
  const hasRewardDetails =
    rewardDoc && typeof rewardDoc === "object" && ("code" in rewardDoc || "name" in rewardDoc);
  return {
    id: claim._id?.toString() ?? null,
    userId:
      claim.userId &&
      typeof claim.userId === "object" &&
      "toString" in claim.userId
        ? claim.userId.toString()
        : claim.userId?.toString() ?? null,
    rewardId:
      claim.rewardId &&
      typeof claim.rewardId === "object" &&
      "toString" in claim.rewardId
        ? claim.rewardId.toString()
        : claim.rewardId?._id?.toString() ?? null,
    code: claim.code,
    progressDays: claim.progressDays ?? 0,
    pointsAwarded: claim.pointsAwarded ?? 0,
    status: claim.status,
    claimedAt: claim.claimedAt ?? null,
    createdAt: claim.createdAt,
    updatedAt: claim.updatedAt,
    reward: hasRewardDetails ? mapReward(rewardDoc) : null,
  };
}

function getPagination(limit, page) {
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const skip = (safePage - 1) * safeLimit;
  return { safeLimit, safePage, skip };
}

export async function listRewards({
  isActive = true,
  search = null,
  limit = 20,
  page = 1,
} = {}) {
  const filter = {};
  if (typeof isActive === "boolean") {
    filter.isActive = isActive;
  }
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  const { safeLimit, safePage, skip } = getPagination(limit, page);

  const [items, total] = await Promise.all([
    Reward.find(filter).sort({ targetDays: 1 }).skip(skip).limit(safeLimit),
    Reward.countDocuments(filter),
  ]);

  return {
    pagination: {
      total,
      page: safePage,
      limit: safeLimit,
      pages: Math.ceil(total / safeLimit) || 1,
    },
    items: items.map(mapReward),
  };
}

function parseProgress(input, fallback = 0) {
  if (input === null || input === undefined) return fallback;
  const value = Number(input);
  if (Number.isNaN(value) || value < 0) {
    const error = new Error("INVALID_PROGRESS");
    error.status = 400;
    throw error;
  }
  return value;
}

export async function claimRewardMilestone({
  userId,
  rewardCode,
  progressDays = null,
}) {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const [reward, user] = await Promise.all([
      Reward.findOne({ code: rewardCode }).session(session).exec(),
      User.findById(userId).session(session).exec(),
    ]);

    if (!reward) {
      const error = new Error("REWARD_NOT_FOUND");
      error.status = 404;
      throw error;
    }
    if (!reward.isActive) {
      const error = new Error("REWARD_INACTIVE");
      error.status = 400;
      throw error;
    }
    if (!user) {
      const error = new Error("USER_NOT_FOUND");
      error.status = 404;
      throw error;
    }

    const existingClaim = await MilestoneClaim.findOne({
      userId,
      rewardId: reward._id,
    })
      .session(session)
      .exec();

    const baselineProgress = existingClaim?.progressDays ?? 0;
    const nextProgress = Math.max(parseProgress(progressDays, baselineProgress), baselineProgress);
    let claim = existingClaim;
    let claimChanged = false;

    if (!claim) {
      const docs = await MilestoneClaim.create(
        [
          {
            userId,
            rewardId: reward._id,
            code: reward.code,
            progressDays: nextProgress,
          },
        ],
        { session }
      );
      claim = docs[0];
    } else if (nextProgress !== claim.progressDays) {
      claim.progressDays = nextProgress;
      claimChanged = true;
    }

    const meetsTarget = nextProgress >= reward.targetDays;
    let awardedNow = 0;
    let userChanged = false;

    if (meetsTarget && (claim.pointsAwarded ?? 0) === 0) {
      claim.pointsAwarded = reward.pointsReward;
      claim.status = "completed";
      claim.claimedAt = new Date();
      claimChanged = true;

      user.totalPoints = (user.totalPoints ?? 0) + reward.pointsReward;
      userChanged = true;

      await recordPointsChange(
        {
          userId: user._id,
          pointsAmount: reward.pointsReward,
          source: "reward",
          referenceId: reward.code,
          createdAt: claim.claimedAt,
        },
        { session }
      );

      awardedNow = reward.pointsReward;
    }

    if (claimChanged) {
      await claim.save({ session });
    }
    if (userChanged) {
      await user.save({ session });
    }

    await session.commitTransaction();

    return {
      reward: mapReward(reward),
      claim: mapMilestoneClaim(claim, reward),
      pointsAwarded: awardedNow,
    };
  } catch (error) {
    await session.abortTransaction().catch(() => {});
    throw error;
  } finally {
    session.endSession();
  }
}

export async function getUserMilestoneClaims(
  userId,
  { limit = 20, page = 1 } = {}
) {
  const { safeLimit, safePage, skip } = getPagination(limit, page);

  const [items, total] = await Promise.all([
    MilestoneClaim.find({ userId })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .populate("rewardId"),
    MilestoneClaim.countDocuments({ userId }),
  ]);

  return {
    pagination: {
      total,
      page: safePage,
      limit: safeLimit,
      pages: Math.ceil(total / safeLimit) || 1,
    },
    items: items.map((claim) => mapMilestoneClaim(claim, claim.rewardId)),
  };
}
