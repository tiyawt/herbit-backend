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
    role: { 
      type: String, 
      enum: ["user", "admin"], 
      default: "user" 
    },
    prePoints: { type: Number, default: 0 },
    totalPoints: { type: Number, default: 0 },
    sortingStreak: { type: Number, default: 0 }, // streak berjalan
    sortingBestStreak: { type: Number, default: 0 }, // rekor
    sortingLastPlayedBucket: { type: String, default: null }, // "YYYY-MM-DD" WIB
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

export default mongoose.model("User", userSchema, "users");
