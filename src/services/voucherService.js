import mongoose from "mongoose";
import crypto from "crypto";
import Voucher from "../models/voucher.js";
import VoucherRedemption from "../models/voucherRedemption.js";
import User from "../models/user.js";

function mapVoucher(voucher, user) {
  if (!voucher) return null;
  const pointsRequired = voucher.pointsRequired ?? 0;
  const currentPoints = user?.totalPoints ?? 0;
  const progressTarget = Math.max(pointsRequired, 1);
  const progressPercent = Math.min(
    100,
    Math.round((currentPoints / progressTarget) * 100)
  );

  return {
    id: voucher._id?.toString() ?? null,
    slug: voucher.slug,
    name: voucher.name,
    description: voucher.description,
    category: voucher.category,
    partnerName: voucher.partnerName,
    imageUrl: voucher.imageUrl,
    bannerUrl: voucher.bannerUrl,
    image: voucher.imageUrl,
    banner: voucher.bannerUrl,
    discountValue: voucher.discountValue,
    landingUrl: voucher.landingUrl,
    pointsRequired,
    stock: voucher.stock,
    redeemedCount: voucher.redeemedCount,
    isActive: voucher.isActive,
    validFrom: voucher.validFrom,
    validUntil: voucher.validUntil,
    terms: voucher.terms,
    instructions: voucher.instructions,
    metadata: voucher.metadata,
    canRedeem: currentPoints >= pointsRequired,
    progress: {
      current: currentPoints,
      target: progressTarget,
      percent: progressPercent,
    },
    createdAt: voucher.createdAt,
    updatedAt: voucher.updatedAt,
  };
}

function mapRedemption(redemption, voucher) {
  if (!redemption) return null;
  const source = voucher || redemption.voucherId;
  const voucherId =
    redemption.voucherId &&
    typeof redemption.voucherId === "object" &&
    "toHexString" in redemption.voucherId
      ? redemption.voucherId.toHexString()
      : redemption.voucherId?._id?.toString() ??
        redemption.voucherId?.toString() ??
        null;
  return {
    id: redemption._id?.toString() ?? null,
    voucherId,
    name: source?.name ?? null,
    imageUrl: source?.imageUrl ?? null,
    image: source?.imageUrl ?? null,
    category: source?.category ?? null,
    pointsDeducted: redemption.pointsDeducted,
     points: redemption.pointsDeducted,
    code: redemption.code,
    status: redemption.status,
    redeemedAt: redemption.redeemedAt,
    expiresAt: redemption.expiresAt,
    notes: redemption.notes,
  };
}

export async function listVouchers({
  userId = null,
  status = "active",
  category = null,
  search = null,
  limit = 20,
  page = 1,
} = {}) {
  const filter = {};

  if (status === "active") {
    filter.isActive = true;
    const now = new Date();
    filter.$and = [
      { $or: [{ validFrom: null }, { validFrom: { $lte: now } }] },
      { $or: [{ validUntil: null }, { validUntil: { $gte: now } }] },
    ];
  } else if (status === "inactive") {
    filter.isActive = false;
  }

  if (category) {
    filter.category = category;
  }

  if (search) {
    filter.name = { $regex: search, $options: "i" };
  }

  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const skip = (safePage - 1) * safeLimit;

  const [items, total, user] = await Promise.all([
    Voucher.find(filter).sort({ createdAt: -1 }).skip(skip).limit(safeLimit),
    Voucher.countDocuments(filter),
    userId ? User.findById(userId).select({ totalPoints: 1 }) : null,
  ]);

  return {
    pagination: {
      total,
      page: safePage,
      limit: safeLimit,
      pages: Math.ceil(total / safeLimit) || 1,
    },
    items: items.map((voucher) => mapVoucher(voucher, user)),
  };
}

export async function getVoucher(voucherId, userId = null) {
  const voucher = await Voucher.findOne({
    _id: voucherId,
    isActive: true,
  });
  if (!voucher) return null;
  const user = userId
    ? await User.findById(userId).select({ totalPoints: 1 })
    : null;
  return mapVoucher(voucher, user);
}

export async function getVoucherBySlug(slug, userId = null) {
  const voucher = await Voucher.findOne({ slug, isActive: true });
  if (!voucher) return null;
  const user = userId
    ? await User.findById(userId).select({ totalPoints: 1 })
    : null;
  return mapVoucher(voucher, user);
}

function ensureVoucherAvailability(voucher) {
  if (!voucher) throw new Error("VOUCHER_NOT_FOUND");
  if (!voucher.isActive) throw new Error("VOUCHER_INACTIVE");
  const now = new Date();
  if (voucher.validFrom && voucher.validFrom > now) {
    throw new Error("VOUCHER_NOT_YET_AVAILABLE");
  }
  if (voucher.validUntil && voucher.validUntil < now) {
    throw new Error("VOUCHER_EXPIRED");
  }
  if (typeof voucher.stock === "number" && voucher.stock <= 0) {
    throw new Error("VOUCHER_OUT_OF_STOCK");
  }
}

function generateRedemptionCode(voucher) {
  const prefix = voucher.slug
    ?.slice(0, 3)
    ?.replace(/[^a-zA-Z0-9]/g, "")
    ?.toUpperCase() || "HER";
  const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}-${suffix}`;
}

export async function redeemVoucher({ voucherId, userId }) {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const [voucher, user] = await Promise.all([
      Voucher.findById(voucherId).session(session).exec(),
      User.findById(userId).session(session).exec(),
    ]);

    ensureVoucherAvailability(voucher);
    if (!user) throw new Error("USER_NOT_FOUND");

    if ((user.totalPoints ?? 0) < voucher.pointsRequired) {
      throw new Error("INSUFFICIENT_POINTS");
    }

    if (typeof voucher.stock === "number") {
      voucher.stock -= 1;
    }
    voucher.redeemedCount += 1;

    user.totalPoints = Math.max(
      (user.totalPoints ?? 0) - voucher.pointsRequired,
      0
    );

    const code = generateRedemptionCode(voucher);
    const redemptionDoc = await VoucherRedemption.create(
      [
        {
          voucherId: voucher._id,
          userId: user._id,
          pointsDeducted: voucher.pointsRequired,
          code,
          status: "completed",
          redeemedAt: new Date(),
          expiresAt: voucher.validUntil ?? null,
        },
      ],
      { session }
    );

    await voucher.save({ session });
    await user.save({ session });

    await session.commitTransaction();
    const redemption = redemptionDoc[0];

    return mapRedemption(redemption, voucher);
  } catch (error) {
    await session.abortTransaction().catch(() => {});
    throw error;
  } finally {
    session.endSession();
  }
}

export async function getUserRedemptions(userId, { limit = 20, page = 1 } = {}) {
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const skip = (safePage - 1) * safeLimit;

  const [items, total] = await Promise.all([
    VoucherRedemption.find({ userId })
      .sort({ redeemedAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .populate("voucherId"),
    VoucherRedemption.countDocuments({ userId }),
  ]);

  return {
    pagination: {
      total,
      page: safePage,
      limit: safeLimit,
      pages: Math.ceil(total / safeLimit) || 1,
    },
    items: items.map((redemption) =>
      mapRedemption(redemption, redemption.voucherId)
    ),
  };
}

export async function getVoucherSummary(userId) {
  const [user, vouchers, redemptions] = await Promise.all([
    User.findById(userId).select({
      username: 1,
      email: 1,
      totalPoints: 1,
      photoUrl: 1,
    }),
    Voucher.find({ isActive: true })
      .sort({ pointsRequired: 1 })
      .limit(10),
    VoucherRedemption.find({ userId })
      .sort({ redeemedAt: -1 })
      .limit(10)
      .populate("voucherId"),
  ]);

  if (!user) throw new Error("USER_NOT_FOUND");

  const mappedVouchers = vouchers.map((voucher) => mapVoucher(voucher, user));
  const mappedHistory = redemptions.map((redemption) =>
    mapRedemption(redemption, redemption.voucherId)
  );

  return {
    user: {
      id: user._id?.toString() ?? null,
      username: user.username ?? user.email,
      name: user.username || user.email,
      photoUrl: user.photoUrl,
      totalPoints: user.totalPoints ?? 0,
    },
    available: mappedVouchers,
    history: mappedHistory,
  };
}
