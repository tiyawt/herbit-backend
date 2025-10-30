import mongoose from "mongoose";


const dailyTaskChecklistSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    dailyTaskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DailyTask",
      required: true,
    },
    treeLeafId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TreeLeaf",
     

    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Middleware otomatis isi completedAt kalau isCompleted = true
dailyTaskChecklistSchema.pre("save", function (next) {
  if (this.isModified("isCompleted") && this.isCompleted && !this.completedAt) {
    this.completedAt = new Date();
  }
  next();
});

const DailyTaskChecklist = mongoose.model(
  "DailyTaskChecklist",
  dailyTaskChecklistSchema,
  "dailyTaskChecklist"
);

export default DailyTaskChecklist;
