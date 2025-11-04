// src/services/usernameService.js
import User from "../models/user.js";
import {
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
} from "../utils/usernameUtils.js";

const DEFAULT_SUGGESTION_COUNT = 5;
const MAX_SUGGESTION_ATTEMPTS = 60;
const FALLBACK_BASE = "user";

function buildCandidate(base, attempt) {
  const trimmedBase = base.slice(0, USERNAME_MAX_LENGTH);

  if (attempt === 0 && trimmedBase.length >= USERNAME_MIN_LENGTH) {
    return trimmedBase;
  }

  const randomSuffix = Math.floor(100 + Math.random() * 900).toString();
  const altSuffixes = ["eco", "green", "hero", "leaf", "earth"];
  let candidate = trimmedBase;

  if (!candidate || candidate.length < USERNAME_MIN_LENGTH) {
    candidate = FALLBACK_BASE;
  }

  if (attempt % 5 === 0) {
    const word = altSuffixes[attempt % altSuffixes.length];
    candidate = `${candidate}${word}`;
  } else {
    candidate = `${candidate}${randomSuffix}`;
  }

  if (candidate.length > USERNAME_MAX_LENGTH) {
    candidate = candidate.slice(0, USERNAME_MAX_LENGTH);
  }

  if (candidate.length < USERNAME_MIN_LENGTH) {
    candidate = `${FALLBACK_BASE}${randomSuffix}`.slice(0, USERNAME_MAX_LENGTH);
  }

  return candidate;
}

export async function isUsernameTaken(username, excludeUserId = null) {
  const query = { username };
  if (excludeUserId) {
    query._id = { $ne: excludeUserId };
  }
  const existing = await User.exists(query);
  return Boolean(existing);
}

export async function updateUsernameForUser(userId, username) {
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { username },
    { new: true, runValidators: true }
  )
    .select({
      _id: 1,
      username: 1,
      email: 1,
      photoUrl: 1,
      totalPoints: 1,
      prePoints: 1,
      sortingStreak: 1,
      sortingBestStreak: 1,
      sortingLastPlayedBucket: 1,
      updatedAt: 1,
    })
    .lean();

  return updatedUser;
}

export async function generateUsernameSuggestions(
  base,
  count = DEFAULT_SUGGESTION_COUNT
) {
  const normalizedBase =
    base && base.length >= USERNAME_MIN_LENGTH
      ? base.slice(0, USERNAME_MAX_LENGTH)
      : FALLBACK_BASE;

  const attempted = new Set();
  let attempts = 0;

  while (attempts < MAX_SUGGESTION_ATTEMPTS && attempted.size < count * 3) {
    const candidate = buildCandidate(normalizedBase, attempts);
    attempted.add(candidate);
    attempts += 1;
  }

  let candidates = Array.from(attempted);

  if (!candidates.length) {
    candidates = [
      buildCandidate(FALLBACK_BASE, Math.floor(Math.random() * 10)),
    ];
  }

  const existing = await User.find({
    username: { $in: candidates },
  })
    .select({ username: 1 })
    .lean();

  const taken = new Set(existing.map((doc) => doc.username));

  const available = candidates.filter((candidate) => !taken.has(candidate));

  while (available.length < count && attempts < MAX_SUGGESTION_ATTEMPTS) {
    const candidate = buildCandidate(normalizedBase, attempts);
    attempts += 1;
    if (taken.has(candidate) || available.includes(candidate)) {
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    const exists = await User.exists({ username: candidate });
    if (!exists) {
      available.push(candidate);
    } else {
      taken.add(candidate);
    }
  }

  if (!available.length) {
    available.push(
      buildCandidate(FALLBACK_BASE, Math.floor(Math.random() * 100))
    );
  }

  return available.slice(0, count);
}
