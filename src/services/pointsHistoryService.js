import PointsHistory from "../models/pointsHistory.js";

function mapHistoryEntry(entry) {
  if (!entry) return null;
  return {
    id: entry._id?.toString() ?? null,
    userId: entry.userId?.toString() ?? null,
    pointsAmount: entry.pointsAmount,
    source: entry.source,
    referenceId: entry.referenceId ?? null,
    createdAt: entry.createdAt,
  };
}

function getPagination(limit, page) {
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const skip = (safePage - 1) * safeLimit;
  return { safeLimit, safePage, skip };
}

export async function recordPointsChange(
  { userId, pointsAmount, source, referenceId = null, createdAt = new Date() },
  { session } = {}
) {
  const payload = {
    userId,
    pointsAmount,
    source,
    referenceId,
    createdAt,
  };

  const docs = await PointsHistory.create([payload], session ? { session } : {});
  return mapHistoryEntry(docs[0]);
}

export async function getUserPointsHistory(
  userId,
  { limit = 20, page = 1 } = {}
) {
  const { safeLimit, safePage, skip } = getPagination(limit, page);

  const [items, total] = await Promise.all([
    PointsHistory.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit),
    PointsHistory.countDocuments({ userId }),
  ]);

  return {
    pagination: {
      total,
      page: safePage,
      limit: safeLimit,
      pages: Math.ceil(total / safeLimit) || 1,
    },
    items: items.map(mapHistoryEntry),
  };
}
