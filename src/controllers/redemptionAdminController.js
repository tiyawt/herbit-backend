import {
  listRedemptions,
  getRedemptionById,
} from "../services/voucherService.js";
import { ok } from "../utils/response.js";

function respondError(res, error, fallbackMessage, status = 400) {
  const message =
    (typeof error?.message === "string" && error.message.trim()) ||
    fallbackMessage;
  const httpStatus =
    Number.isInteger(error?.status) && error.status > 0
      ? error.status
      : status;
  return res.status(httpStatus).json({
    success: false,
    message,
  });
}

export async function listRedemptionsAdminHandler(req, res) {
  try {
    const { userId, voucherId, status, limit, page } = req.query;
    const result = await listRedemptions({
      userId,
      voucherId,
      status,
      limit,
      page,
    });
    return ok(res, result);
  } catch (error) {
    return respondError(res, error, "Gagal memuat riwayat penukaran");
  }
}

export async function getRedemptionDetailAdminHandler(req, res) {
  try {
    const { redemptionId } = req.params;
    const redemption = await getRedemptionById(redemptionId);
    return ok(res, redemption);
  } catch (error) {
    return respondError(res, error, "Gagal mengambil detail penukaran");
  }
}
