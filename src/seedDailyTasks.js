import mongoose from "mongoose";
import dotenv from "dotenv";
import DailyTask from "./models/dailyTasks.js";
import tasks from "./data/dailyTasksData.js"; // file berisi array 100 task

dotenv.config();

console.log("MONGO_URI:", process.env.MONGODB_URI);


await mongoose.connect(process.env.MONGODB_URI);

await DailyTask.deleteMany();
await DailyTask.insertMany(tasks);

console.log("✅ Daily tasks seeded successfully");
process.exit();
