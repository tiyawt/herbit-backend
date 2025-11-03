// src/controllers/userManagementController.js
import { ok, fail } from "../utils/response.js";
import {
  getAllUsers,
  getUserById,
  updateUserById,
  deleteUserById,
} from "../services/userManagementService.js";

// GET all users 
export async function getUsers(req, res) {
  try {
    const { page = 1, limit = 10, role, search } = req.query;
    
    const filters = {};
    if (role) filters.role = role;
    if (search) {
      filters.$or = [
        { email: { $regex: search, $options: "i" } },
        { username: { $regex: search, $options: "i" } },
      ];
    }

    const result = await getAllUsers({
      filters,
      page: parseInt(page),
      limit: parseInt(limit),
    });

    return ok(res, result, "Users retrieved successfully");
  } catch (e) {
    return fail(res, "GET_USERS_ERROR", e.message, 400);
  }
}

// GET single user by ID
export async function getUser(req, res) {
  try {
    const { id } = req.params;
    
    if (req.user.role !== "admin" && req.user.id !== id) {
      return fail(res, "FORBIDDEN", "Anda tidak memiliki akses ke profil ini", 403);
    }

    const user = await getUserById(id);

    if (!user) {
      return fail(res, "USER_NOT_FOUND", "User tidak ditemukan", 404);
    }

    return ok(res, user, "User retrieved successfully");
  } catch (e) {
    return fail(res, "GET_USER_ERROR", e.message, 400);
  }
}

// UPDATE user by ID
export async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if user can update this profile
    if (req.user.role !== "admin" && req.user.id !== id) {
      return fail(res, "FORBIDDEN", "Anda tidak memiliki akses untuk update profil ini", 403);
    }

    // Only admin can change role
    if (updateData.role && req.user.role !== "admin") {
      delete updateData.role;
    }

    // Prevent updating sensitive fields
    delete updateData.password;
    delete updateData.passwordHash;
    delete updateData._id;
    delete updateData.createdAt;

    const user = await updateUserById(id, updateData);

    if (!user) {
      return fail(res, "USER_NOT_FOUND", "User tidak ditemukan", 404);
    }

    return ok(res, user, "User updated successfully");
  } catch (e) {
    if (e.message === "EMAIL_OR_USERNAME_TAKEN") {
      return fail(res, e.message, "Email atau username sudah dipakai", 409);
    }
    return fail(res, "UPDATE_USER_ERROR", e.message, 400);
  }
}

// DELETE user by ID
export async function deleteUser(req, res) {
  try {
    const { id } = req.params;

    if (req.user.id === id) {
      return fail(
        res,
        "CANNOT_DELETE_SELF",
        "Tidak bisa menghapus akun sendiri",
        400
      );
    }

    const result = await deleteUserById(id);

    if (!result) {
      return fail(res, "USER_NOT_FOUND", "User tidak ditemukan", 404);
    }

    return ok(res, null, "User deleted successfully");
  } catch (e) {
    return fail(res, "DELETE_USER_ERROR", e.message, 400);
  }
}