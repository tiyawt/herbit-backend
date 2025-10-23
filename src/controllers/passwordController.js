import crypto from "crypto";
import bcrypt from "bcryptjs";
import User from "../models/user.js";
import AuthCredential from "../models/AuthCredential.js";
import { sendResetPasswordEmail } from "../services/emailService.js";
import { ok, fail } from "../utils/response.js";

export async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return fail(res, "USER_NOT_FOUND", "Email tidak ditemukan", 404);

    const token = crypto.randomBytes(32).toString("hex");
    const expiry = Date.now() + 15 * 60 * 1000;

    await AuthCredential.findOneAndUpdate(
      { user_id: user._id },
      { reset_token: token, reset_token_expiry: expiry }
    );

    const rawUsername = user.username || user.name || "Sahabat Herbit";
    const username =
      rawUsername.charAt(0).toUpperCase() + rawUsername.slice(1).toLowerCase();

    await sendResetPasswordEmail(user.email, username, token);
    return ok(res, {}, "Email reset password telah dikirim");
  } catch (e) {
    return fail(res, "FORGOT_PASSWORD_ERROR", e.message, 500);
  }
}

export async function resetPassword(req, res) {
  try {
    const { token, new_password } = req.body;
    const cred = await AuthCredential.findOne({
      reset_token: token,
      reset_token_expiry: { $gt: Date.now() },
    });
    if (!cred)
      return fail(
        res,
        "INVALID_OR_EXPIRED_TOKEN",
        "Token tidak valid atau kadaluarsa",
        400
      );

    const hash = await bcrypt.hash(new_password, 10);
    cred.password_hash = hash;
    cred.reset_token = null;
    cred.reset_token_expiry = null;
    await cred.save();

    return ok(res, {}, "Password berhasil direset");
  } catch (e) {
    return fail(res, "RESET_PASSWORD_ERROR", e.message, 500);
  }
}
