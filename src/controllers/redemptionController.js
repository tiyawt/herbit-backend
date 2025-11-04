import {
  getUserRedemptions,
  getRedemptionByIdForUser,
} from "../services/voucherService.js";
import { ok, fail } from "../utils/response.js";

function handleError(res, error, fallbackMessage, status = 400) {
  const message =
    (typeof error?.message === "string" && error.message.trim()) ||
    fallbackMessage;
  const httpStatus =
    Number.isInteger(error?.status) && error.status > 0 ? error.status : status;
  return fail(res, message, message, httpStatus);
}

export async function getMyRedemptionsHandler(req, res) {
  try {
    const userId = req.user?.id ?? null;
    if (!userId) {
      return fail(res, "Pengguna tidak ditemukan", 401);
    }
    const { status, limit, page } = req.query;
    const history = await getUserRedemptions(userId, {
      status,
      limit,
      page,
    });
    return ok(res, history);
  } catch (error) {
    return handleError(res, error, "Gagal mengambil riwayat penukaran");
  }
}

export async function getMyRedemptionDetailHandler(req, res) {
  try {
    const userId = req.user?.id ?? null;
    if (!userId) {
      return fail(res, "Pengguna tidak ditemukan", 401);
    }
    const { redemptionId } = req.params;
    const redemption = await getRedemptionByIdForUser(redemptionId, userId);
    return ok(res, redemption);
  } catch (error) {
    return handleError(res, error, "Gagal mengambil detail penukaran");
  }
}
