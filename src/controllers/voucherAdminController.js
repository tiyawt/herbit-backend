import {
  createVoucher,
  updateVoucher,
  deleteVoucher,
  listVouchers,
  setVoucherActiveStatus,
  getVoucherRedemptions,
} from "../services/voucherService.js";
import { ok } from "../utils/response.js";

function responseError(res, error, fallbackMessage, status = 400) {
  const message =
    (typeof error?.message === "string" && error.message.trim()) ||
    fallbackMessage;
  const httpStatus =
    Number.isInteger(error?.status) && error.status > 0 ? error.status : status;
  return res.status(httpStatus).json({
    success: false,
    message,
  });
}

export async function createVoucherAdminHandler(req, res) {
  try {
    const voucher = await createVoucher(req.body);
    return ok(res, voucher, "Voucher berhasil dibuat", 201);
  } catch (error) {
    return responseError(res, error, "Gagal membuat voucher");
  }
}

export async function updateVoucherAdminHandler(req, res) {
  try {
    const { voucherId } = req.params;
    const voucher = await updateVoucher(voucherId, req.body);
    return ok(res, voucher, "Voucher berhasil diperbarui");
  } catch (error) {
    return responseError(res, error, "Gagal memperbarui voucher");
  }
}

export async function deleteVoucherAdminHandler(req, res) {
  try {
    const { voucherId } = req.params;
    const result = await deleteVoucher(voucherId);
    return ok(res, result, "Voucher berhasil dihapus");
  } catch (error) {
    return responseError(res, error, "Gagal menghapus voucher");
  }
}

export async function activateVoucherHandler(req, res) {
  try {
    const { voucherId } = req.params;
    const voucher = await setVoucherActiveStatus(voucherId, true);
    return ok(res, voucher, "Voucher berhasil diaktifkan");
  } catch (error) {
    return responseError(res, error, "Gagal mengaktifkan voucher");
  }
}

export async function deactivateVoucherHandler(req, res) {
  try {
    const { voucherId } = req.params;
    const voucher = await setVoucherActiveStatus(voucherId, false);
    return ok(res, voucher, "Voucher berhasil dinonaktifkan");
  } catch (error) {
    return responseError(res, error, "Gagal menonaktifkan voucher");
  }
}

export async function listVoucherAdminHandler(req, res) {
  try {
    const { status, category, search, limit, page } = req.query;
    const result = await listVouchers({
      status,
      category,
      search,
      limit,
      page,
      audience: "admin",
    });
    return ok(res, result);
  } catch (error) {
    return responseError(res, error, "Gagal memuat daftar voucher");
  }
}

export async function getVoucherRedemptionsHandler(req, res) {
  try {
    const { voucherId } = req.params;
    const { status, limit, page } = req.query;
    const redemptions = await getVoucherRedemptions(voucherId, {
      status,
      limit,
      page,
    });
    return ok(res, redemptions);
  } catch (error) {
    return responseError(res, error, "Gagal memuat riwayat penukaran");
  }
}
