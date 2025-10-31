import express from "express";
import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  getUploads,
  getUploadsByProject,
  createUpload,
  claimPoints,          
} from "../controllers/ecoenzimController.js";

const router = express.Router();

// PROJECT ROUTES

router.get("/projects", getProjects);
router.get("/projects/:id", getProjectById);
router.post("/projects", createProject);
router.put("/projects/:id", updateProject);
router.delete("/projects/:id", deleteProject);

// UPLOAD ROUTES

router.get("/uploads", getUploads);
router.get("/uploads/:projectId", getUploadsByProject);
router.post("/uploads", createUpload);

// CLAIM ROUTE
router.post("/projects/:id/claim", claimPoints);  

export default router;
