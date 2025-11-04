import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import path from "path";
import routes from "./routes/routes.js";
import passport from "./config/passport.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import gameRoutes from "./routes/gameRoutes.js";
import dailyTaskRoutes from "./routes/dailyTaskRoutes.js";
import dailyTaskChecklistRoutes from "./routes/dailyTaskChecklistRoutes.js";
import treeFruitsRoutes from "./routes/treeFruitsRoutes.js";
import treeTrackerRoutes from "./routes/treeTrackersRoutes.js";
import treeLeavesRoutes from "./routes/treeLeavesRoutes.js";
import ecoenzimRoutes from "./routes/ecoenzimRoutes.js";
import cron from "node-cron";
import weeklyProgressRoutes from "./routes/weeklyProgressRoutes.js";
import userManagementRoutes from "./routes/userManagementRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import dailyTaskAdminRoutes from "./routes/dailyTaskAdminRoutes.js";
import { autoCancelExpiredProjects } from "./controllers/ecoenzimController.js";

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

// Global middleware
app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));
app.use(passport.initialize());
app.use(
  "/uploads",
  express.static(path.resolve("uploads"), {
    setHeaders(res) {
      res.set("Cross-Origin-Resource-Policy", "cross-origin");
    },
  })
);

app.get("/", (req, res) => {
  res.json({ message: "Server up and running 🚀" });
});

// ✅ Tambahkan ini
app.use("/api/auth", authRoutes);

// All API routes
app.use("/api", routes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/game", gameRoutes);
app.use("/api/daily", dailyTaskRoutes);
app.use("/api/checklists", dailyTaskChecklistRoutes);
app.use("/api/fruits", treeFruitsRoutes);
app.use("/api/tree", treeTrackerRoutes);
app.use("/api/leaves", treeLeavesRoutes);
app.use("/api/progress", weeklyProgressRoutes);
app.use("/api/admin/daily", dailyTaskAdminRoutes);
app.use("/api/ecoenzim", ecoenzimRoutes);
app.use("/api/users", userManagementRoutes);

cron.schedule("0 * * * *", async () => {
  console.log("⏳ Cek project kadaluarsa...");
  await autoCancelExpiredProjects();
});

export default app;
