import crypto from "crypto";
import Voucher from "../models/voucher.js";
import VoucherRedemption from "../models/voucherRedemption.js";
import User from "../models/user.js";
import { recordPointsChange } from "./pointsHistoryService.js";

function createError(message, status) {
  const error = new Error(message);
  if (status) {
    error.status = status;
  }
  return error;
}

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

function applyStatusSideEffects(voucher) {
  if (!voucher || typeof voucher !== "object") return;
  const status = voucher.status;
  if (!status) return;
  if (status === "inactive" || status === "expired") {
    voucher.isActive = false;
  } else if (status === "active" || status === "upcoming") {
    voucher.isActive = true;
  }
}

function determineVoucherStatus(voucher, now = new Date()) {
  if (!voucher?.isActive) {
    return "inactive";
  }
  if (voucher.validFrom && voucher.validFrom > now) {
    return "upcoming";
  }
  if (voucher.validUntil && voucher.validUntil < now) {
    return "expired";
  }
  if (typeof voucher.stock === "number" && voucher.stock <= 0) {
    return "expired";
  }
  return "active";
}

function mapVoucher(voucher, user) {
  if (!voucher) return null;
  const pointsRequired = voucher.pointsRequired;
  const currentPoints =
    user && typeof user.totalPoints === "number" ? user.totalPoints : 0;
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
    status: determineVoucherStatus(voucher),
    validFrom: voucher.validFrom,
    validUntil: voucher.validUntil,
    terms: voucher.terms,
    instructions: voucher.instructions,
    progress: user
      ? {
          current: currentPoints,
          target: progressTarget,
          percent: progressPercent,
        }
      : undefined,
    createdAt: voucher.createdAt,
    updatedAt: voucher.updatedAt,
  };
}

export async function createVoucher(payload) {
  const { slug } = payload || {};
  if (!slug) {
    throw createError("Slug voucher wajib diisi", 400);
  }

  const slugExists = await Voucher.exists({ slug });
  if (slugExists) {
    throw createError("Slug voucher sudah digunakan", 409);
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
    status: payload.status,
    validFrom: payload.validFrom,
    validUntil: payload.validUntil,
    imageUrl: payload.imageUrl,
    bannerUrl: payload.bannerUrl,
    partnerName: payload.partnerName,
    discountValue: payload.discountValue,
    landingUrl: payload.landingUrl,
    terms: normalizeStringArray(payload.terms),
    instructions: normalizeStringArray(payload.instructions),
  });

  if (typeof doc.isActive !== "boolean") {
    doc.isActive = true;
  }

  if (!doc.status) {
    doc.status = determineVoucherStatus(doc);
  }
  applyStatusSideEffects(doc);

  const created = await doc.save();
  return mapVoucher(created, null);
}

export async function updateVoucher(voucherId, updates = {}) {
  const voucher = await Voucher.findById(voucherId);
  if (!voucher) {
    throw createError("Voucher tidak ditemukan", 404);
  }

  if (updates.slug && updates.slug !== voucher.slug) {
    const slugExists = await Voucher.exists({
      slug: updates.slug,
      _id: { $ne: voucherId },
    });
    if (slugExists) {
      throw createError("Slug voucher sudah digunakan", 409);
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
    "validFrom",
    "validUntil",
    "imageUrl",
    "bannerUrl",
    "partnerName",
    "discountValue",
    "landingUrl",
  ];

  fields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(updates, field)) {
      voucher[field] = updates[field];
    }
  });

  if (updates.valid && typeof updates.valid === "object") {
    if (Object.prototype.hasOwnProperty.call(updates.valid, "from")) {
      voucher.validFrom = updates.valid.from;
    }
    if (Object.prototype.hasOwnProperty.call(updates.valid, "until")) {
      voucher.validUntil = updates.valid.until;
    }
  }

  if (Object.prototype.hasOwnProperty.call(updates, "status")) {
    voucher.status = updates.status;
  }

  if (!voucher.status) {
    voucher.status = determineVoucherStatus(voucher);
  }
  applyStatusSideEffects(voucher);

  if (Object.prototype.hasOwnProperty.call(updates, "isActive")) {
    voucher.isActive = updates.isActive;
    // If isActive toggled manually, ensure status remains consistent.
    if (!voucher.isActive && voucher.status === "active") {
      voucher.status = "inactive";
    }
    if (voucher.isActive && voucher.status === "inactive") {
      voucher.status = determineVoucherStatus(voucher);
    }
  }

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
    throw createError("Voucher tidak ditemukan", 404);
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
  const userDocument =
    redemption.userId &&
    typeof redemption.userId === "object" &&
    !("toHexString" in redemption.userId)
      ? redemption.userId
      : null;
  const userId =
    redemption.userId &&
    typeof redemption.userId === "object" &&
    "toHexString" in redemption.userId
      ? redemption.userId.toHexString()
      : redemption.userId?._id?.toString() ??
        redemption.userId?.toString() ??
        null;
  const user =
    userDocument && typeof userDocument === "object"
      ? {
          id: userDocument._id?.toString() ?? userId,
          username: userDocument.username ?? null,
          email: userDocument.email ?? null,
        }
      : null;
  return {
    id: redemption._id?.toString() ?? null,
    voucherId,
    userId,
    user,
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
  audience = "public",
} = {}) {
  const now = new Date();
  let normalizedStatus =
    typeof status === "string" ? status.trim().toLowerCase() : null;
  if (audience !== "admin" && !normalizedStatus) {
    normalizedStatus = "active";
  }

  const filter = {};
  const andConditions = [];

  if (category) {
    filter.category = category;
  }

  if (search) {
    filter.name = { $regex: search, $options: "i" };
  }

  if (normalizedStatus === "active") {
    filter.isActive = true;
    andConditions.push(
      { $or: [{ validFrom: null }, { validFrom: { $lte: now } }] },
      { $or: [{ validUntil: null }, { validUntil: { $gte: now } }] },
      { $or: [{ stock: null }, { stock: { $gt: 0 } }] }
    );
  } else if (normalizedStatus === "upcoming") {
    filter.isActive = true;
    andConditions.push({ validFrom: { $gt: now } });
  } else if (normalizedStatus === "expired") {
    andConditions.push({
      $or: [{ isActive: false }, { validUntil: { $lt: now } }],
    });
  } else if (normalizedStatus === "inactive") {
    filter.isActive = false;
  }

  if (andConditions.length > 0) {
    filter.$and = andConditions;
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

export async function getVoucher(
  voucherId,
  userId = null,
  { includeInactive = true } = {}
) {
  const query = { _id: voucherId };
  if (!includeInactive) {
    query.isActive = true;
  }
  const voucher = await Voucher.findOne(query);
  if (!voucher) return null;
  const user = userId
    ? await User.findById(userId).select({ totalPoints: 1 })
    : null;
  return mapVoucher(voucher, user);
}

export async function getVoucherBySlug(
  slug,
  userId = null,
  { includeInactive = true } = {}
) {
  const query = { slug };
  if (!includeInactive) {
    query.isActive = true;
  }
  const voucher = await Voucher.findOne(query);
  if (!voucher) return null;
  const user = userId
    ? await User.findById(userId).select({ totalPoints: 1 })
    : null;
  return mapVoucher(voucher, user);
}

function evaluateVoucherEligibility(voucher, userPoints) {
  const reasons = [];
  const now = new Date();
  if (!voucher.isActive) {
    reasons.push("Voucher sedang tidak aktif");
  }
  if (voucher.validFrom && voucher.validFrom > now) {
    reasons.push("Voucher belum tersedia saat ini");
  }
  if (voucher.validUntil && voucher.validUntil < now) {
    reasons.push("Voucher sudah kadaluarsa");
  }
  let stockLeft = null;
  if (typeof voucher.stock === "number") {
    stockLeft = Math.max(voucher.stock, 0);
    if (voucher.stock <= 0) {
      reasons.push("Voucher sudah habis");
    }
  }
  const currentPoints = userPoints ?? 0;
  const pointsRequired = voucher.pointsRequired ?? 0;
  if (currentPoints < pointsRequired) {
    reasons.push("Poin tidak mencukupi untuk menukar voucher");
  }
  return {
    eligible: reasons.length === 0,
    reasons,
    currentPoints,
    pointsRequired,
    stockLeft,
  };
}

function ensureVoucherAvailability(voucher) {
  if (!voucher) throw createError("Voucher tidak ditemukan", 404);
  if (!voucher.isActive) throw createError("Voucher sedang tidak aktif", 400);
  const now = new Date();
  if (voucher.validFrom && voucher.validFrom > now) {
    throw createError("Voucher belum tersedia saat ini", 400);
  }
  if (voucher.validUntil && voucher.validUntil < now) {
    throw createError("Voucher sudah kadaluarsa", 400);
  }
  if (typeof voucher.stock === "number" && voucher.stock <= 0) {
    throw createError("Voucher sudah habis", 400);
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

export async function previewVoucher({ voucherId, userId }) {
  const voucher = await Voucher.findById(voucherId).lean();
  if (!voucher) {
    throw createError("Voucher tidak ditemukan", 404);
  }
  const user = await User.findById(userId).select({ totalPoints: 1 }).lean();
  if (!user) {
    throw createError("Pengguna tidak ditemukan", 404);
  }
  return evaluateVoucherEligibility(voucher, user.totalPoints);
}

export async function redeemVoucher({ voucherId, userId, note = null }) {
  const voucher = await Voucher.findById(voucherId).exec();
  ensureVoucherAvailability(voucher);

  const user = await User.findById(userId).exec();
  if (!user) throw createError("Pengguna tidak ditemukan", 404);

  if (user.totalPoints < voucher.pointsRequired) {
    throw createError("Poin tidak mencukupi untuk menukar voucher", 409);
  }

  if (voucher.stock !== null && voucher.stock !== undefined) {
    voucher.stock = Math.max(voucher.stock - 1, 0);
  }
  voucher.redeemedCount += 1;

  user.totalPoints = Math.max(user.totalPoints - voucher.pointsRequired, 0);

  await Promise.all([voucher.save(), user.save()]);

  const redemption = await VoucherRedemption.create({
    voucherId: voucher._id,
    userId: user._id,
    pointsDeducted: voucher.pointsRequired,
    code: generateRedemptionCode(voucher),
    status: "unused",
    redeemedAt: new Date(),
    expiresAt: voucher.validUntil ?? null,
    notes: typeof note === "string" ? note.trim() || null : null,
  });

  await redemption.populate("userId", "_id username email");

  await recordPointsChange({
    userId: user._id,
    pointsAmount: -voucher.pointsRequired,
    source: "voucher",
    referenceId: redemption._id?.toString() ?? null,
    createdAt: redemption.redeemedAt ?? new Date(),
  });

  return mapRedemption(redemption, voucher);
}

export async function getUserRedemptions(
  userId,
  { status = null, limit = 20, page = 1 } = {}
) {
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const skip = (safePage - 1) * safeLimit;

  const match = { userId };
  const normalizedStatus =
    typeof status === "string" ? status.trim().toLowerCase() : null;
  if (normalizedStatus) {
    const allowedStatuses = ["unused", "used", "cancelled"];
    if (!allowedStatuses.includes(normalizedStatus)) {
      throw createError("Status riwayat tidak valid", 400);
    }
    match.status = normalizedStatus;
  }

  const [items, total] = await Promise.all([
    VoucherRedemption.find(match)
      .sort({ redeemedAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .populate("voucherId"),
    VoucherRedemption.countDocuments(match),
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

export async function getRedemptionByIdForUser(redemptionId, userId) {
  const redemption = await VoucherRedemption.findOne({
    _id: redemptionId,
    userId,
  })
    .populate("voucherId")
    .lean();
  if (!redemption) {
    throw createError("Riwayat penukaran tidak ditemukan", 404);
  }
  return mapRedemption(redemption, redemption.voucherId);
}

export async function getRedemptionById(redemptionId) {
  const redemption = await VoucherRedemption.findById(redemptionId)
    .populate("voucherId")
    .populate("userId", "_id username email")
    .lean();
  if (!redemption) {
    throw createError("Riwayat penukaran tidak ditemukan", 404);
  }
  return mapRedemption(redemption, redemption.voucherId);
}

export async function listRedemptions({
  userId = null,
  voucherId = null,
  status = null,
  limit = 20,
  page = 1,
} = {}) {
  const match = {};
  if (userId) {
    match.userId = userId;
  }
  if (voucherId) {
    match.voucherId = voucherId;
  }
  const normalizedStatus =
    typeof status === "string" ? status.trim().toLowerCase() : null;
  if (normalizedStatus) {
    const allowedStatuses = ["unused", "used", "cancelled"];
    if (!allowedStatuses.includes(normalizedStatus)) {
      throw createError("Status riwayat tidak valid", 400);
    }
    match.status = normalizedStatus;
  }

  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const skip = (safePage - 1) * safeLimit;

  const [items, total] = await Promise.all([
    VoucherRedemption.find(match)
      .sort({ redeemedAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .populate("voucherId")
      .populate("userId", "_id username email"),
    VoucherRedemption.countDocuments(match),
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

export async function getVoucherRedemptions(
  voucherId,
  { status = null, limit = 20, page = 1 } = {}
) {
  return listRedemptions({ voucherId, status, limit, page });
}

export async function setVoucherActiveStatus(voucherId, isActive) {
  const voucher = await Voucher.findById(voucherId);
  if (!voucher) {
    throw createError("Voucher tidak ditemukan", 404);
  }
  voucher.isActive = Boolean(isActive);
  voucher.updatedAt = new Date();
  await voucher.save();
  return mapVoucher(voucher, null);
}
