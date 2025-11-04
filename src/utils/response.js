// utils/response.js
export function ok(res, data, message = "Success", status = 200) {
  return res.status(status).json({
    success: true,
    data: data,
    message,
  });
}

export function fail(res, codeOrMessage, messageOrStatus, statusCode = 400) {
  let code = codeOrMessage;
  let message = messageOrStatus;
  let status = statusCode;

  if (typeof messageOrStatus === "number" && statusCode === 400) {
    status = messageOrStatus;
    message = codeOrMessage;
    code = null;
  }

  return res.status(status).json({
    success: false,
    code,
    message,
  });
}
