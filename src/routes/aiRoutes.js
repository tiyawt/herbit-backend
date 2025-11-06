import { Router } from "express";
import { chatWithAi } from "../controllers/aiController.js";
import { authRequired } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/chat", authRequired, chatWithAi);

export default router;
