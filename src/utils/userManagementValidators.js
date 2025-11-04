// src/utils/userManagementValidators.js
import { isEmail } from "./validators.js";

export function validateUserUpdate() {
  return (req, res, next) => {
    const { email, username, role, phoneNumber } = req.body;

    // Validasi email
    if (email !== undefined) {
      if (email === "") {
        return res.status(422).json({
          success: false,
          error: { code: "VALIDATION_ERROR", details: "Email tidak boleh kosong" },
        });
      }
      if (!isEmail(email)) {
        return res.status(422).json({
          success: false,
          error: { code: "VALIDATION_ERROR", details: "Format email tidak valid" },
        });
      }
    }

    // Validasi username
    if (username !== undefined) {
      if (username === "") {
        return res.status(422).json({
          success: false,
          error: { code: "VALIDATION_ERROR", details: "Username tidak boleh kosong" },
        });
      }
      if (username.length < 3 || username.length > 30) {
        return res.status(422).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            details: "Username harus 3-30 karakter",
          },
        });
      }
    }

    // Validasi role 
    if (role !== undefined && !["user", "admin"].includes(role)) {
      return res.status(422).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          details: "Role harus 'user' atau 'admin'",
        },
      });
    }

    // Validasi phone number 
    if (phoneNumber !== undefined && phoneNumber !== null && phoneNumber !== "") {
      const phoneRegex = /^[0-9+\-\s()]+$/;
      if (!phoneRegex.test(phoneNumber)) {
        return res.status(422).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            details: "Format nomor telepon tidak valid",
          },
        });
      }
    }

    next();
  };
}