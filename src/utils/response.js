// utils/response.js
export function ok(res, data = null, message = "Success", statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

export function fail(res, code, message, statusCode = 400) {
  return res.status(statusCode).json({
    success: false,
    code,
    message,
  });
}