export const ok = (res, data = {}, message = null, status = 200) =>
  res.status(status).json({ success: true, data, message });

export const fail = (res, code = "ERROR", details = null, status = 400) =>
  res.status(status).json({ success: false, error: { code, details } });
