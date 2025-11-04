import validator from "validator";

export function isEmail(value = "") {
  return validator.isEmail(String(value || ""));
}

// field required
export function requireBody(fields = []) {
  return (req, res, next) => {
    for (const f of fields) {
      const v = req.body?.[f];
      if (v === undefined || v === null || v === "") {
        return res.status(422).json({
          success: false,
          error: { code: "VALIDATION_ERROR", details: `${f} is required` },
        });
      }
    }
    next();
  };
}

export function validateRegister() {
  return (req, res, next) => {
    const { email, password, confirm_password, username } = req.body;

    // ✅ Normalize email & username ke lowercase
    if (email) {
      req.body.email = email.toLowerCase().trim();
    }
    if (username) {
      req.body.username = username.toLowerCase().trim();
    }

    if (!isEmail(req.body.email)) {
      return res.status(422).json({
        success: false,
        error: { code: "VALIDATION_ERROR", details: "Invalid email format" },
      });
    }
    if (password.length < 8) {
      return res.status(422).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          details: "Password minimal 8 karakter",
        },
      });
    }
    if (password !== confirm_password) {
      return res.status(422).json({
        success: false,
        error: { code: "PASSWORD_NOT_MATCH", details: "Password tidak sama" },
      });
    }
    delete req.body.confirm_password;
    next();
  };
}
