import mongoose from "mongoose";

const WeeklyProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    weekStart: { type: Date, required: true },
    weekEnd: { type: Date, required: true },

    progress: [
      {
        dayName: String,     // contoh: "Sen"
        date: String,        // contoh: "2025-10-28"
        total: Number,       // jumlah task (biasanya 5)
        completed: Number,   // checklist selesai
        progress: Number,    // persen harian
      },
    ],

    totalCompleted: { type: Number, default: 0 },
    avgProgress: { type: Number, default: 0 },
  },
  { timestamps: true }
);

WeeklyProgressSchema.index({ userId: 1, weekStart: 1, weekEnd: 1 }, { unique: true });

const WeeklyProgress = mongoose.model("WeeklyProgress", WeeklyProgressSchema, "weeklyProgress");

export default WeeklyProgress;
