import mongoose from "mongoose";

const treeFruitSchema = new mongoose.Schema(
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
    harvestReadyDate: {
      type: Date,
     
    },
    isClaimed: {
      type: Boolean,
      default: false,
    },
    claimedAt: {
      type: Date,
      default: null,
    },
    pointsAwarded: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true, // otomatis bikin createdAt & updatedAt
  }
);

const TreeFruit = mongoose.model("TreeFruit", treeFruitSchema, "treeFruits");
export default TreeFruit;
