import mongoose from "mongoose";
const { Schema } = mongoose;

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
      trim: true,
    },
    username: { type: String, required: true, unique: true, trim: true },
    phoneNumber: { type: String, default: null, trim: true },
    photoUrl: { type: String, default: null },
    prePoints: { type: Number, default: 0 },
    totalPoints: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

export default mongoose.model("User", userSchema, "users");
