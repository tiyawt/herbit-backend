// src/services/accountService.js
import User from "../models/user.js";

export async function isEmailTaken(email, excludeUserId = null) {
  const query = { email };
  if (excludeUserId) {
    query._id = { $ne: excludeUserId };
  }
  const existing = await User.exists(query);
  return Boolean(existing);
}

export async function updateEmailForUser(userId, email) {
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { email },
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
