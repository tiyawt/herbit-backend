import mongoose from "mongoose";
const { Schema, Types } = mongoose;

const authCredentialSchema = new Schema(
  {
    userId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // 1 credential per user
      index: true,
    },
    // Local auth
    passwordHash: {
      type: String,
      default: null,
      select: false,
    },

    // OAuth fields
    provider: {
      type: String,
      enum: [null, "google"],
      default: null,
    },
    providerId: {
      type: String,
      default: null,
      index: true,
      sparse: true,
    },

    // Forgot password fields
    resetToken: {
      type: String,
      default: null,
      select: false,
    },
    resetTokenExpiry: {
      type: Date,
      default: null,
      select: false,
    },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
  }
);

export default mongoose.model(
  "AuthCredential",
  authCredentialSchema,
  "authCredentials"
);
