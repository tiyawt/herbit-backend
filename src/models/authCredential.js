// src/models/authCredential.js
import mongoose from "mongoose";
const { Schema, Types } = mongoose;

const authCredentialSchema = new Schema(
  {
    userId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    passwordHash: { type: String, default: null, select: false },
    provider: { type: String, enum: ["google"], default: null },
    providerId: { type: String, default: null, index: true, sparse: true },
    resetToken: { type: String, default: null, select: false },
    resetTokenExpiry: { type: Date, default: null, select: false },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

const AuthCredential =
  mongoose.models.AuthCredential ||
  mongoose.model("AuthCredential", authCredentialSchema, "authCredentials");

export default AuthCredential;
