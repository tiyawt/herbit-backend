import mongoose from "mongoose";

const dailyTaskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      enum: ["eco-action", "health", "learning", "mindfulness"],
      default: "eco-action",
    },
    taskDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const DailyTask =
  mongoose.models.DailyTask ||
  mongoose.model("DailyTask", dailyTaskSchema, "dailyTasks");

export default DailyTask;
