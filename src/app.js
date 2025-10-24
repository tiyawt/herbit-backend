// src/app.js
import express from "express";
import cors from "cors";
import morgan from "morgan";
import routes from "./routes/routes.js";
import passport from "./config/passport.js";
import notificationRoutes from "./routes/notificationRoutes.js";

const app = express();

// Global middleware
app.use(express.json());
app.use(cors());
app.use(morgan("dev"));
app.use(passport.initialize());

app.get("/", (req, res) => {
  res.json({ message: "Server up and running 🚀" });
});

// All API routes
app.use("/api", routes);
app.use("/api/notifications", notificationRoutes);

export default app;
