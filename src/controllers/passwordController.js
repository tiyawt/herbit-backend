import crypto from "crypto";
import bcrypt from "bcryptjs";
import User from "../models/user.js";
import AuthCredential from "../models/authCredential.js";
import { sendResetPasswordEmail } from "../services/emailService.js";
import { ok, fail } from "../utils/response.js";

export async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return fail(res, "USER_NOT_FOUND", "Email tidak ditemukan", 404);

    const token = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 menit

    await AuthCredential.findOneAndUpdate(
      { userId: user._id },
      { $set: { resetToken: token, resetTokenExpiry: expiry } },
      { new: true, upsert: true }
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
      resetToken: token,
      resetTokenExpiry: { $gt: new Date() },
    }).select("+passwordHash +resetToken +resetTokenExpiry");

    if (!cred) {
      return fail(
        res,
        "INVALID_OR_EXPIRED_TOKEN",
        "Token tidak valid atau kadaluarsa",
        400
      );
    }

    const hash = await bcrypt.hash(new_password, 10);

    await AuthCredential.updateOne(
      { _id: cred._id },
      {
        $set: {
          passwordHash: hash,
          resetToken: null,
          resetTokenExpiry: null,
        },
      }
    );

    return ok(res, {}, "Password berhasil direset");
  } catch (e) {
    return fail(res, "RESET_PASSWORD_ERROR", e.message, 500);
  }
}
