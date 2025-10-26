import {
  getVoucher,
  getVoucherBySlug,
  getVoucherSummary,
  getUserRedemptions,
  listVouchers,
  redeemVoucher,
} from "../services/voucherService.js";
import { ok, fail } from "../utils/response.js";
import User from "../models/user.js";

const errorMessages = {
  VOUCHER_NOT_FOUND: "Voucher tidak ditemukan",
  VOUCHER_INACTIVE: "Voucher sedang tidak aktif",
  VOUCHER_NOT_YET_AVAILABLE: "Voucher belum tersedia saat ini",
  VOUCHER_EXPIRED: "Voucher sudah kadaluarsa",
  VOUCHER_OUT_OF_STOCK: "Voucher sudah habis",
  INSUFFICIENT_POINTS: "Poin tidak mencukupi untuk menukar voucher",
  USER_NOT_FOUND: "Pengguna tidak ditemukan",
};

function handleVoucherError(res, error, fallbackCode, status = 400) {
  const details = errorMessages[error.message] ?? error.message;
  return fail(res, error.message || fallbackCode, details, status);
}

async function resolveTargetUserId({ username, fallbackUserId }) {
  if (!username) {
    if (fallbackUserId) {
      return fallbackUserId;
    }
    const error = new Error("USER_NOT_FOUND");
    error.status = 404;
    throw error;
  }

  const user = await User.findOne({ username }).select({ _id: 1 });
  if (!user) {
    const error = new Error("USER_NOT_FOUND");
    error.status = 404;
    throw error;
  }
  return user._id.toString();
}

export async function listVoucherHandler(req, res) {
  try {
    const { status, category, search, limit, page, username } = req.query;
    const targetUserId = await resolveTargetUserId({
      username,
      fallbackUserId: req.user?.id ?? null,
    });

    const result = await listVouchers({
      userId: targetUserId,
      status,
      category,
      search,
      limit,
      page,
    });
    return ok(res, result);
  } catch (error) {
    return handleVoucherError(res, error, "VOUCHER_LIST_ERROR");
  }
}

export async function getVoucherDetailHandler(req, res) {
  try {
    const { voucherId } = req.params;
    const { by = "id", username } = req.query;

    const targetUserId = await resolveTargetUserId({
      username,
      fallbackUserId: req.user?.id ?? null,
    });

    const voucher =
      by === "slug"
        ? await getVoucherBySlug(voucherId, targetUserId)
        : await getVoucher(voucherId, targetUserId);

    if (!voucher) {
      return fail(
        res,
        "VOUCHER_NOT_FOUND",
        errorMessages.VOUCHER_NOT_FOUND,
        404
      );
    }

    return ok(res, voucher);
  } catch (error) {
    return handleVoucherError(res, error, "VOUCHER_DETAIL_ERROR");
  }
}

export async function redeemVoucherHandler(req, res) {
  try {
    const { voucherId } = req.params;
    const redemption = await redeemVoucher({
      voucherId,
      userId: req.user.id,
    });
    return ok(res, redemption, "Voucher berhasil ditukar", 201);
  } catch (error) {
    let status = 400;
    if (
      error.message === "VOUCHER_NOT_FOUND" ||
      error.message === "USER_NOT_FOUND"
    ) {
      status = 404;
    }
    if (error.message === "INSUFFICIENT_POINTS") {
      status = 409;
    }
    return handleVoucherError(res, error, "VOUCHER_REDEEM_ERROR", status);
  }
}

export async function getVoucherHistoryHandler(req, res) {
  try {
    const { limit, page, username } = req.query;
    const targetUserId = await resolveTargetUserId({
      username,
      fallbackUserId: req.user?.id ?? null,
    });
    const history = await getUserRedemptions(targetUserId, { limit, page });
    return ok(res, history);
  } catch (error) {
    return handleVoucherError(res, error, "VOUCHER_HISTORY_ERROR");
  }
}

export async function getVoucherSummaryHandler(req, res) {
  try {
    const { username } = req.query;
    const targetUserId = await resolveTargetUserId({
      username,
      fallbackUserId: req.user?.id ?? null,
    });
    const summary = await getVoucherSummary(targetUserId);
    return ok(res, summary);
  } catch (error) {
    const status =
      error.message === "USER_NOT_FOUND" ? 404 : error.status ?? 400;
    return handleVoucherError(res, error, "VOUCHER_SUMMARY_ERROR", status);
  }
}
