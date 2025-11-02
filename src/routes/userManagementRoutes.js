// src/routes/userManagementRoutes.js
import { Router } from "express";
import {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
} from "../controllers/userManagementController.js";
import { authRequired, adminRequired } from "../middleware/authMiddleware.js";
import { validateUserUpdate } from "../utils/userManagementValidators.js";

const router = Router();

// GET /api/users - Get all users (Admin only)
router.get("/", adminRequired, getUsers);

// GET /api/users/:id - Get single user (Admin or own profile)
router.get("/:id", authRequired, getUser);

// PUT /api/users/:id - Update user (Admin or own profile)
router.put("/:id", authRequired, validateUserUpdate(), updateUser);

// DELETE /api/users/:id - Delete user (Admin only)
router.delete("/:id", adminRequired, deleteUser);

export default router;