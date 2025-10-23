import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.js";
import AuthCredential from "../models/AuthCredential.js";

const signToken = (user) =>
  jwt.sign({ id: user._id, role: "user" }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

export async function registerUser({
  email,
  username,
  phone_number,
  password,
}) {
  const exists = await User.findOne({ $or: [{ email }, { username }] });
  if (exists) throw new Error("EMAIL_OR_USERNAME_TAKEN");

  const user = await User.create({ email, username, phone_number });
  const hash = await bcrypt.hash(password, 10);
  await AuthCredential.create({ user_id: user._id, password_hash: hash });

  const token = signToken(user);
  return { token, user: sanitizeUser(user) };
}

export async function loginUser({ email, password }) {
  const user = await User.findOne({ email });
  if (!user) throw new Error("INVALID_CREDENTIALS");

  const cred = await AuthCredential.findOne({ user_id: user._id }).select(
    "+password_hash"
  );
  if (!cred) throw new Error("INVALID_CREDENTIALS");

  const ok = await bcrypt.compare(password, cred.password_hash);
  if (!ok) throw new Error("INVALID_CREDENTIALS");

  const token = signToken(user);
  return { token, user: sanitizeUser(user) };
}

export async function me(userId) {
  const user = await User.findById(userId);
  if (!user) throw new Error("USER_NOT_FOUND");
  return sanitizeUser(user);
}

function sanitizeUser(u) {
  return {
    id: u._id,
    email: u.email,
    username: u.username,
    phone_number: u.phone_number,
    photo_url: u.photo_url,
    pre_points: u.pre_points,
    total_points: u.total_points,
    created_at: u.created_at,
    updated_at: u.updated_at,
  };
}
