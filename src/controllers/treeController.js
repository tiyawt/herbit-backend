import { fail } from "../utils/response.js";

function notImplemented(res, feature) {
  return fail(
    res,
    "NOT_IMPLEMENTED",
    `${feature} service belum tersedia`,
    501
  );
}

export function listTreeTrackersHandler(req, res) {
  return notImplemented(res, "Tree tracker");
}

export function listTreeLeavesHandler(req, res) {
  return notImplemented(res, "Tree leaves");
}

export function listTreeFruitsHandler(req, res) {
  return notImplemented(res, "Tree fruits");
}
