import mongoose from "mongoose";

const treeLeafSchema = new mongoose.Schema(
  {
    treeTrackerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TreeTracker",
      
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    dailyTaskChecklistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DailyTaskChecklist",
    //   required: true,
    },
    status: {
      type: String,
      enum: ["green", "yellow"],
      default: "green",
    },
    dayNumber: {
      type: Number,
    //   required: true,
    },
    needRecovery: {
      type: Boolean,
      default: false,
    },
    createdDate: {
      type: Date,
      default: () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return today;
      },
    },
    statusChangedDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // otomatis createdAt & updatedAt
  }
);

// Middleware otomatis ubah statusChangedDate kalau status berubah
treeLeafSchema.pre("save", function (next) {
  if (this.isModified("status")) {
    this.statusChangedDate = new Date();
  }
  next();
});

const TreeLeaf = mongoose.model("TreeLeaf", treeLeafSchema, "treeLeaves");

export default TreeLeaf;
