import crypto from "crypto";
import Voucher from "../models/voucher.js";
import VoucherRedemption from "../models/voucherRedemption.js";
import User from "../models/user.js";

function normalizeStringArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === "string" ? entry.trim() : null))
      .filter((entry) => entry);
  }
  if (typeof value === "string") {
    return value
      .split("\n")
      .map((entry) => entry.trim())
      .filter((entry) => entry);
  }
  return [];
}

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

export async function createVoucher(payload) {
  const { slug } = payload || {};
  if (!slug) {
    throw new Error("VOUCHER_SLUG_REQUIRED");
  }

  const slugExists = await Voucher.exists({ slug });
  if (slugExists) {
    throw new Error("VOUCHER_SLUG_EXISTS");
  }

  const doc = new Voucher({
    slug: slug.trim(),
    name: payload.name,
    description: payload.description,
    category: payload.category,
    pointsRequired: payload.pointsRequired,
    stock: payload.stock,
    redeemedCount: payload.redeemedCount,
    isActive: payload.isActive,
    validFrom: payload.validFrom,
    validUntil: payload.validUntil,
    imageUrl: payload.imageUrl,
    bannerUrl: payload.bannerUrl,
    partnerName: payload.partnerName,
    discountValue: payload.discountValue,
    landingUrl: payload.landingUrl,
    terms: normalizeStringArray(payload.terms),
    instructions: normalizeStringArray(payload.instructions),
    metadata: payload.metadata ?? null,
  });

  const created = await doc.save();
  return mapVoucher(created, null);
}

export async function updateVoucher(voucherId, updates = {}) {
  const voucher = await Voucher.findById(voucherId);
  if (!voucher) {
    throw new Error("VOUCHER_NOT_FOUND");
  }

  if (updates.slug && updates.slug !== voucher.slug) {
    const slugExists = await Voucher.exists({
      slug: updates.slug,
      _id: { $ne: voucherId },
    });
    if (slugExists) {
      throw new Error("VOUCHER_SLUG_EXISTS");
    }
    voucher.slug = updates.slug.trim();
  }

  const fields = [
    "name",
    "description",
    "category",
    "pointsRequired",
    "stock",
    "redeemedCount",
    "isActive",
    "validFrom",
    "validUntil",
    "imageUrl",
    "bannerUrl",
    "partnerName",
    "discountValue",
    "landingUrl",
    "metadata",
  ];

  fields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(updates, field)) {
      voucher[field] = updates[field];
    }
  });

  if (Object.prototype.hasOwnProperty.call(updates, "terms")) {
    voucher.terms = normalizeStringArray(updates.terms);
  }
  if (Object.prototype.hasOwnProperty.call(updates, "instructions")) {
    voucher.instructions = normalizeStringArray(updates.instructions);
  }

  const saved = await voucher.save();
  return mapVoucher(saved, null);
}

export async function deleteVoucher(voucherId) {
  const removed = await Voucher.findByIdAndDelete(voucherId);
  if (!removed) {
    throw new Error("VOUCHER_NOT_FOUND");
  }
  return { id: removed._id?.toString() ?? null };
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
    category: source?.category ?? null,
    pointsDeducted: redemption.pointsDeducted,
    points: redemption.pointsDeducted,
    code: redemption.code,
    status: redemption.status,
    redeemedAt: redemption.redeemedAt,
    expiresAt: redemption.expiresAt,
    landingUrl: source?.landingUrl ?? null,
    instructions: Array.isArray(source?.instructions)
      ? source.instructions
      : [],
    terms: Array.isArray(source?.terms) ? source.terms : [],
    notes: redemption.notes,
  };
}

export async function listVouchers({
  userId = null,
  status = null,
  category = null,
  search = null,
  limit = 20,
  page = 1,
  includeInactive = false,
} = {}) {
  const filter = {};

  if (!includeInactive && status === null) {
    filter.isActive = true;
  } else if (status === "active") {
    filter.isActive = true;
    const now = new Date();
    filter.$and = [
      { $or: [{ validFrom: null }, { validFrom: { $lte: now } }] },
      { $or: [{ validUntil: null }, { validUntil: { $gte: now } }] },
      { $or: [{ stock: null }, { stock: { $gt: 0 } }] },
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
  const prefix =
    voucher.slug
      ?.slice(0, 3)
      ?.replace(/[^a-zA-Z0-9]/g, "")
      ?.toUpperCase() || "HER";
  const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}-${suffix}`;
}

export async function redeemVoucher({ voucherId, userId }) {
  const voucher = await Voucher.findById(voucherId).exec();
  ensureVoucherAvailability(voucher);

  const user = await User.findById(userId).exec();
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

  await Promise.all([voucher.save(), user.save()]);

  const redemption = await VoucherRedemption.create({
    voucherId: voucher._id,
    userId: user._id,
    pointsDeducted: voucher.pointsRequired,
    code: generateRedemptionCode(voucher),
    status: "completed",
    redeemedAt: new Date(),
    expiresAt: voucher.validUntil ?? null,
  });

  return mapRedemption(redemption, voucher);
}

export async function getUserRedemptions(
  userId,
  { limit = 20, page = 1 } = {}
) {
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
