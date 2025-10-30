import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.js";
import AuthCredential from "../models/authCredential.js";

export async function registerUser({
  email,
  username,
  phone_number,
  password,
}) {
  const taken = await User.findOne({ $or: [{ email }, { username }] });
  if (taken) throw new Error("EMAIL_OR_USERNAME_TAKEN");

  const passwordHash = await bcrypt.hash(password, 10);

  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    const [user] = await User.create(
      [{ email, username, phoneNumber: phone_number ?? null }],
      { session }
    );
    await AuthCredential.create(
      [{ userId: user._id, passwordHash, provider: null, providerId: null }],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return {
      id: user._id,
      email: user.email,
      username: user.username,
      phoneNumber: user.phoneNumber ?? null,
      photoUrl: user.photoUrl ?? null,
      prePoints: user.prePoints,
      totalPoints: user.totalPoints,
      createdAt: user.createdAt,
    };
  } catch (err) {
    if (session) {
      try {
        await session.abortTransaction();
        session.endSession();
      } catch {}
    }
    let user;
    try {
      user = await User.create({
        email,
        username,
        phoneNumber: phone_number ?? null,
      });
      await AuthCredential.create({
        userId: user._id,
        passwordHash,
        provider: null,
        providerId: null,
      });

      return {
        id: user._id,
        email: user.email,
        username: user.username,
        phoneNumber: user.phoneNumber ?? null,
        photoUrl: user.photoUrl ?? null,
        prePoints: user.prePoints,
        totalPoints: user.totalPoints,
        createdAt: user.createdAt,
      };
    } catch (e) {
      if (user?._id) {
        try {
          await User.findByIdAndDelete(user._id);
        } catch {}
      }
      throw e;
    }
  }
}

export async function loginUser({ email, password }) {
  const user = await User.findOne({ email });
  if (!user) throw new Error("INVALID_CREDENTIALS");

  const cred = await AuthCredential.findOne({ userId: user._id }).select(
    "+passwordHash"
  );
  if (!cred?.passwordHash) throw new Error("INVALID_CREDENTIALS");

  const ok = await bcrypt.compare(password, cred.passwordHash);
  if (!ok) throw new Error("INVALID_CREDENTIALS");

  const token = jwt.sign(
    { id: user._id, role: "user" },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );

  return {
    token,
    user: {
      id: user._id,
      email: user.email,
      username: user.username,
      photoUrl: user.photoUrl,
    },
  };
}

export async function me(userId) {
  const user = await User.findById(userId).lean(); 
  
  if (!user) {
    throw new Error("User not found");
  }

  return {
    id: user._id,
    email: user.email,
    username: user.username,
    phoneNumber: user.phoneNumber,
    photoUrl: user.photoUrl,
    prePoints: user.prePoints || 0,
    totalPoints: user.totalPoints || 0,
    sortingStreak: user.sortingStreak || 0, 
    sortingBestStreak: user.sortingBestStreak || 0,
    sortingLastPlayedBucket: user.sortingLastPlayedBucket,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}