// src/app.js
import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";    
import routes from "./routes/routes.js";
import passport from "./config/passport.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import gameRoutes from "./routes/gameRoutes.js";
import ecoenzimRoutes from "./routes/ecoenzimRoutes.js";
import "./cronJobs.js"; 
import { autoCancelExpiredProjects } from "./controllers/ecoenzimController.js";


const app = express();

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));


// Global middleware
app.use(express.json());
app.use(cookieParser());  
app.use(morgan("dev"));
app.use(passport.initialize());

app.get("/", (req, res) => {
  res.json({ message: "Server up and running 🚀" });
});

// All API routes
app.use("/api", routes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/game", gameRoutes);
app.use("/api/ecoenzim", ecoenzimRoutes);


// cron.schedule('0 * * * *', async () => {
//   console.log('⏳ Cek project kadaluarsa...');
//   await autoCancelExpiredProjects();
// });


export default app;
