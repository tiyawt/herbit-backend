import PointsHistory from "../models/pointsHistory.js";
import User from "../models/user.js";

function mapHistoryEntry(entry) {
  if (!entry) return null;
  const referenceId =
    typeof entry.referenceId === "string" && entry.referenceId.trim().length > 0
      ? entry.referenceId
      : null;

  return {
    id: entry._id.toString(),
    userId: entry.userId.toString(),
    pointsAmount: entry.pointsAmount,
    source: entry.source,
    referenceId,
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

  const options = session ? { session } : undefined;
  const docs = await PointsHistory.create([payload], options);
  return mapHistoryEntry(docs[0]);
}

export async function getUserPointsHistory(
  userId,
  { limit = 20, page = 1 } = {}
) {
  return searchPointsHistory({ userId, limit, page });
}

function coerceDate(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  const raw = typeof value === "number" ? value : String(value);
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

function normalizeSources(input) {
  if (!input) return [];
  const raw = Array.isArray(input) ? input : [input];
  return raw
    .flatMap((item) =>
      typeof item === "string"
        ? item
            .split(",")
            .map((part) => part.trim())
            .filter((part) => part.length > 0)
        : []
    )
    .map((item) => item.toLowerCase())
    .filter((item, index, array) => array.indexOf(item) === index);
}

function coerceNumber(value) {
  if (value === null || value === undefined) return null;
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return null;
  return numeric;
}

export async function searchPointsHistory({
  userId = null,
  sources = null,
  from = null,
  to = null,
  minPoints = null,
  maxPoints = null,
  direction = null,
  withUser = false,
  limit = 20,
  page = 1,
} = {}) {
  const { safeLimit, safePage, skip } = getPagination(limit, page);

  const filter = {};

  if (userId) {
    filter.userId = userId;
  }

  const sourceList = normalizeSources(sources);
  if (sourceList.length === 1) {
    filter.source = sourceList[0];
  } else if (sourceList.length > 1) {
    filter.source = { $in: sourceList };
  }

  const fromDate = coerceDate(from);
  const toDate = coerceDate(to);
  if (fromDate || toDate) {
    filter.createdAt = {};
    if (fromDate) filter.createdAt.$gte = fromDate;
    if (toDate) filter.createdAt.$lte = toDate;
  }

  const min = coerceNumber(minPoints);
  const max = coerceNumber(maxPoints);
  const pointsFilter = {};
  if (min !== null) pointsFilter.$gte = min;
  if (max !== null) pointsFilter.$lte = max;

  const normalizedDirection =
    typeof direction === "string" ? direction.trim().toLowerCase() : null;
  if (normalizedDirection === "credit") {
    const threshold =
      typeof pointsFilter.$gte === "number"
        ? Math.max(pointsFilter.$gte, 0)
        : 0;
    pointsFilter.$gte = threshold;
  } else if (normalizedDirection === "debit") {
    const ceiling =
      typeof pointsFilter.$lte === "number"
        ? Math.min(pointsFilter.$lte, 0)
        : 0;
    pointsFilter.$lte = ceiling;
  }

  if (Object.keys(pointsFilter).length > 0) {
    filter.pointsAmount = pointsFilter;
  }

  const query = PointsHistory.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(safeLimit);

  const [items, total] = await Promise.all([
    query.lean(),
    PointsHistory.countDocuments(filter),
  ]);

  const entries = items.map(mapHistoryEntry);

  if (!withUser) {
    return {
      pagination: {
        total,
        page: safePage,
        limit: safeLimit,
        pages: Math.ceil(total / safeLimit) || 1,
      },
      items: entries,
    };
  }

  const userIds = [
    ...new Set(
      entries
        .map((entry) => entry.userId)
        .filter((value) => typeof value === "string" && value.length > 0)
    ),
  ];

  let userMap = new Map();
  if (userIds.length) {
    const users = await User.find({ _id: { $in: userIds } })
      .select({ username: 1, email: 1, photoUrl: 1 })
      .lean();
    userMap = new Map(
      users.map((user) => [
        user._id.toString(),
        {
          id: user._id.toString(),
          username: user.username ?? null,
          email: user.email ?? null,
          photoUrl: user.photoUrl ?? null,
        },
      ])
    );
  }

  return {
    pagination: {
      total,
      page: safePage,
      limit: safeLimit,
      pages: Math.ceil(total / safeLimit) || 1,
    },
    items: entries.map((entry) => ({
      ...entry,
      user: userMap.get(entry.userId) ?? null,
    })),
  };
}
