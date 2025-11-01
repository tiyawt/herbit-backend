import { fail } from "../utils/response.js";

function notImplemented(res, feature) {
  return fail(
    res,
    "NOT_IMPLEMENTED",
    `${feature} service belum tersedia`,
    501
  );
}

export function listDailyTasksHandler(req, res) {
  return notImplemented(res, "Daily task");
}

export function listDailyTaskChecklistHandler(req, res) {
  return notImplemented(res, "Daily task checklist");
}
