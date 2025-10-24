import jwt from "jsonwebtoken";

export function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ success:false, error:{ code:"UNAUTHORIZED", details:"Missing token" } });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.id, role: payload.role || "user" };
    next();
  } catch (e) {
    return res.status(401).json({ success:false, error:{ code:"INVALID_TOKEN", details:e.message } });
  }
}
