import ecoenzimProject from "../models/ecoenzimProject.js";
import ecoenzimUpload from "../models/ecoenzimUpload.js";

// =======================
// PROJECT CONTROLLERS
// =======================

// Get all projects
export const getProjects = async (req, res) => {
  try {
    const projects = await ecoenzimProject.find();
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get project by ID
export const getProjectById = async (req, res) => {
  try {
    const project = await ecoenzimProject.findOne({ id: req.params.id });
    if (!project) return res.status(404).json({ message: "Project not found" });
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create new project
export const createProject = async (req, res) => {
  try {
    const project = new ecoenzimProject(req.body);
    await project.save();
    res.status(201).json({ message: "Project created successfully", project });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update project (auto status update)
export const updateProject = async (req, res) => {
  try {
    const project = await ecoenzimProject.findOneAndUpdate(
      { id: req.params.id },
      req.body,
      { new: true }
    );

    if (!project) return res.status(404).json({ message: "Project not found" });

    // Check verified uploads
    const uploads = await ecoenzimUpload.find({
      ecoenzimProjectId: project.id,
      status: "verified",
    });

    const verifiedUploads = uploads.length;
    const today = new Date();

    // Auto logic
    if (verifiedUploads >= 3) {
      project.canClaim = true;
      project.status = "completed";
    } else if (today > project.endDate && verifiedUploads < 3) {
      project.canClaim = false;
      project.status = "cancelled";
    } else {
      project.canClaim = false;
      project.status = "ongoing";
    }

    project.updatedAt = new Date();
    await project.save();

    res.json({ message: "Project updated successfully", project });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete project
export const deleteProject = async (req, res) => {
  try {
    const project = await ecoenzimProject.findOneAndDelete({ id: req.params.id });
    if (!project) return res.status(404).json({ message: "Project not found" });
    res.json({ message: "Project deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =======================
// UPLOAD CONTROLLERS
// =======================

// Get all uploads
export const getUploads = async (req, res) => {
  try {
    const uploads = await ecoenzimUpload.find();
    res.json(uploads);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get uploads by project ID
export const getUploadsByProject = async (req, res) => {
  try {
    const uploads = await ecoenzimUpload.find({
      ecoenzimProjectId: req.params.projectId,
    });
    res.json(uploads);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create new upload (auto-update project)
export const createUpload = async (req, res) => {
  try {
    const upload = new ecoenzimUpload(req.body);
    await upload.save();

    const project = await ecoenzimProject.findOne({ id: upload.ecoenzimProjectId });
    if (!project) {
      return res.status(404).json({ message: "Linked project not found" });
    }

    // Recount verified uploads
    const uploads = await ecoenzimUpload.find({
      ecoenzimProjectId: project.id,
      status: "verified",
    });

    const verifiedUploads = uploads.length;

    // Auto update project claim status
    project.canClaim = verifiedUploads >= 3;
    if (verifiedUploads >= 3) project.status = "completed";
    project.updatedAt = new Date();
    await project.save();

    res.status(201).json({
      message: "Upload created successfully and project updated",
      upload,
      project,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =======================
// AUTO CANCEL CONTROLLER
// =======================
export const autoCancelExpiredProjects = async () => {
    try {
      const today = new Date();
  
      // Cari project ongoing yang endDate sudah lewat dan belum diklaim
      const expiredProjects = await ecoenzimProject.find({
        status: "ongoing",
        endDate: { $lt: today },
        isClaimed: false,
      });
  
      for (const project of expiredProjects) {
        // Jika project belum punya cukup upload verified (< 3)
        const verifiedUploads = await ecoenzimUpload.countDocuments({
          ecoenzimProjectId: project.id,
          status: "verified",
        });
  
        if (verifiedUploads < 3) {
          project.status = "cancelled";
          project.canClaim = false;
          project.updatedAt = new Date();
          await project.save();
          console.log(`🚫 Project ${project.id} otomatis dibatalkan.`);
        }
      }
  
      console.log("✅ Auto cancel check selesai.");
    } catch (error) {
      console.error("❌ Error auto-cancel:", error);
    }
  };
  
// =======================
// CLAIM CONTROLLER
// =======================

export const claimPoints = async (req, res) => {
  try {
    const project = await ecoenzimProject.findOne({ id: req.params.id });
    if (!project) return res.status(404).json({ message: "Project not found" });

    if (!project.canClaim) {
      return res.status(400).json({ message: "Project cannot be claimed yet" });
    }

    // Calculate total prePoints
    const uploads = await ecoenzimUpload.find({
      ecoenzimProjectId: project.id,
      status: "verified",
    });

    const totalPrePoints = uploads.reduce(
      (sum, u) => sum + (u.prePointsEarned || 0),
      0
    );

    // Update project data
    project.points = totalPrePoints;
    project.prePointsEarned = null;
    project.canClaim = false;
    project.isClaimed = true;
    project.status = "completed";
    project.claimedAt = new Date();
    project.updatedAt = new Date();

    await project.save();

    res.json({ message: "Points claimed successfully", project });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
