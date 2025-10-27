// src/middleware/authMiddleware.js
import jwt from "jsonwebtoken";

export function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const tokenHeader = header.startsWith("Bearer ") ? header.slice(7).trim() : null;

  const tokenCookie = req.cookies?.access_token || null;

  const token = tokenHeader || tokenCookie;

  if (!token) {
    return res.status(401).json({
      success: false,
      error: { code: "UNAUTHORIZED", details: "Missing token (Bearer or cookie)" },
    });
  }

  try {
    // Verifikasi token
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.id, role: payload.role || "user" };

    next();
  } catch (e) {
    return res.status(401).json({
      success: false,
      error: { code: "INVALID_TOKEN", details: e.message },
    });
  }
}
