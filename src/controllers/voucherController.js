import {
  listVouchers,
  getVoucher,
  getVoucherBySlug,
  previewVoucher,
  redeemVoucher,
} from "../services/voucherService.js";
import { ok, fail } from "../utils/response.js";

function handleVoucherError(res, error, fallbackMessage, status = 400) {
  const message =
    (typeof error?.message === "string" && error.message.trim()) ||
    fallbackMessage;
  const httpStatus =
    Number.isInteger(error?.status) && error.status > 0 ? error.status : status;
  return fail(res, message, message, httpStatus);
}

export async function listVoucherHandler(req, res) {
  try {
    const { status, category, search, limit, page } = req.query;
    const result = await listVouchers({
      status,
      category,
      search,
      limit,
      page,
      audience: "public",
    });
    return ok(res, result);
  } catch (error) {
    return handleVoucherError(res, error, "Gagal memuat daftar voucher");
  }
}

export async function getVoucherDetailHandler(req, res) {
  try {
    const { voucherId } = req.params;
    const voucher = await getVoucher(voucherId, null, {
      includeInactive: false,
    });
    if (!voucher) {
      return fail(res, "Voucher tidak ditemukan", 404);
    }
    return ok(res, voucher);
  } catch (error) {
    return handleVoucherError(res, error, "Gagal mengambil detail voucher");
  }
}

export async function getVoucherBySlugHandler(req, res) {
  try {
    const { slug } = req.params;
    const voucher = await getVoucherBySlug(slug, null, {
      includeInactive: false,
    });
    if (!voucher) {
      return fail(res, "Voucher tidak ditemukan", 404);
    }
    return ok(res, voucher);
  } catch (error) {
    return handleVoucherError(res, error, "Gagal mengambil detail voucher");
  }
}

export async function previewVoucherHandler(req, res) {
  try {
    const { voucherId } = req.params;
    const preview = await previewVoucher({ voucherId, userId: req.user.id });
    return ok(res, preview);
  } catch (error) {
    return handleVoucherError(res, error, "Gagal melakukan pratinjau voucher");
  }
}

export async function claimVoucherHandler(req, res) {
  try {
    const { voucherId } = req.params;
    const { note } = req.body;
    const redemption = await redeemVoucher({
      voucherId,
      userId: req.user.id,
      note: note ?? null,
    });
    return ok(res, redemption, "Voucher berhasil ditukar", 201);
  } catch (error) {
    const status = error?.status ?? 400;
    return handleVoucherError(res, error, "Gagal menukar voucher", status);
  }
}
