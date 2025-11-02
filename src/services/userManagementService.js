// src/services/userManagementService.js
import User from "../models/user.js";
import AuthCredential from "../models/authCredential.js";
import mongoose from "mongoose";

export async function getAllUsers({ filters = {}, page = 1, limit = 10 }) {
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    User.find(filters)
      .select("-__v")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filters),
  ]);

  return {
    users: users.map((user) => ({
      id: user._id,
      email: user.email,
      username: user.username,
      phoneNumber: user.phoneNumber,
      photoUrl: user.photoUrl,
      role: user.role,
      prePoints: user.prePoints || 0,
      totalPoints: user.totalPoints || 0,
      sortingStreak: user.sortingStreak || 0,
      sortingBestStreak: user.sortingBestStreak || 0,
      sortingLastPlayedBucket: user.sortingLastPlayedBucket,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// Get user by ID
export async function getUserById(userId) {
  const user = await User.findById(userId).select("-__v").lean();

  if (!user) {
    return null;
  }

  return {
    id: user._id,
    email: user.email,
    username: user.username,
    phoneNumber: user.phoneNumber,
    photoUrl: user.photoUrl,
    role: user.role,
    prePoints: user.prePoints || 0,
    totalPoints: user.totalPoints || 0,
    sortingStreak: user.sortingStreak || 0,
    sortingBestStreak: user.sortingBestStreak || 0,
    sortingLastPlayedBucket: user.sortingLastPlayedBucket,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

// Update user by ID
export async function updateUserById(userId, updateData) {
  if (updateData.email || updateData.username) {
    const query = { _id: { $ne: userId } };
    const conditions = [];

    if (updateData.email) {
      conditions.push({ email: updateData.email });
    }
    if (updateData.username) {
      conditions.push({ username: updateData.username });
    }

    if (conditions.length > 0) {
      query.$or = conditions;
      const existing = await User.findOne(query);
      if (existing) {
        throw new Error("EMAIL_OR_USERNAME_TAKEN");
      }
    }
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: updateData },
    { new: true, runValidators: true }
  )
    .select("-__v")
    .lean();

  if (!user) {
    return null;
  }

  return {
    id: user._id,
    email: user.email,
    username: user.username,
    phoneNumber: user.phoneNumber,
    photoUrl: user.photoUrl,
    role: user.role,
    prePoints: user.prePoints || 0,
    totalPoints: user.totalPoints || 0,
    sortingStreak: user.sortingStreak || 0,
    sortingBestStreak: user.sortingBestStreak || 0,
    sortingLastPlayedBucket: user.sortingLastPlayedBucket,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function deleteUserById(userId) {
  let session;

  try {
    session = await mongoose.startSession();
    session.startTransaction();

    // Delete user
    const user = await User.findByIdAndDelete(userId, { session });

    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return null;
    }

    // Delete auth credentials
    await AuthCredential.deleteOne({ userId }, { session });

    await session.commitTransaction();
    session.endSession();

    return { id: userId };
  } catch (err) {
    if (session) {
      try {
        await session.abortTransaction();
        session.endSession();
      } catch {}
    }
    
    try {
      const user = await User.findByIdAndDelete(userId);
      if (!user) return null;

      await AuthCredential.deleteOne({ userId });
      return { id: userId };
    } catch (e) {
      throw e;
    }
  }
}