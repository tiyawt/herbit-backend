// src/routes/profileRoutes.js
import { Router } from "express";
import { checkUsernameAvailabilityHandler } from "../controllers/usernameController.js";

const router = Router();

router.get("/username-availability", checkUsernameAvailabilityHandler);

export default router;
