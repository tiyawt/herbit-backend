// src/controllers/ecoenzimController.js
import Project from "../models/ecoenzimProject.js";
import Upload from "../models/ecoenzimUploadProgress.js";
import { recordPointsChange } from "../services/pointsHistoryService.js";

const calculateProjectStatus = async (project) => {
  const now = new Date();
  const endDate = new Date(project.endDate);
  const isAfterEndDate = now > endDate;

  const verifiedUploads = await Upload.countDocuments({
    ecoenzimProjectId: project._id,
    status: "verified"
  });

  if (project.status === "completed") return { status: "completed", canClaim: false };
  if (isAfterEndDate) {
    return verifiedUploads >= 3 ? { status: "completed", canClaim: true } : { status: "cancelled", canClaim: false };
  }
  return { status: project.started ? "ongoing" : "not_started", canClaim: false };
};

export const getProjects = async (req, res) => {
  try {
    const userId = req.query.userId || req.user?._id;
    if (!userId) return res.status(400).json({ error: "userId required" });

    const projects = await Project.find({ userId });
    const updated = [];

    for (const p of projects) {
      const { status, canClaim } = await calculateProjectStatus(p);
      if (status !== p.status || canClaim !== p.canClaim) {
        p.status = status;
        p.canClaim = canClaim;
        await p.save();
      }
      updated.push(p);
    }

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

export const getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: "Project not found" });

    const { status, canClaim } = await calculateProjectStatus(project);
    if (status !== project.status || canClaim !== project.canClaim) {
      project.status = status;
      project.canClaim = canClaim;
      await project.save();
    }

    const uploads = await Upload.find({ ecoenzimProjectId: project._id }).sort({ uploadedDate: -1 });
    project.uploads = uploads;
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createProject = async (req, res) => {
  try {
    const { userId, organicWasteWeight, startDate, endDate } = req.body;
    const newProject = new Project({
      userId,
      organicWasteWeight: organicWasteWeight || 0,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      started: true,
      startedAt: new Date(),
      status: "ongoing",
      canClaim: false
    });
    await newProject.save();
    res.status(201).json({ project: newProject });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// new route: start project (patch)
export const startProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: "Project not found" });

    project.started = true;
    project.startedAt = new Date();
    project.status = "ongoing";
    await project.save();
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// createUpload, getUploadsByProject etc. (gunakan versi yang sudah kamu punya)
// paste/createUpload, getUploadsByProject, verifyUpload, claimPoints, deleteProject here...

// --------------------
// UPLOAD CONTROLLERS
// --------------------

// src/controllers/ecoenzimController.js

export const createUpload = async (req, res) => {
  try {
    let { ecoenzimProjectId, userId, monthNumber, photoUrl, uploadedDate, prePointsEarned } = req.body;

    // Normalisasi: treat undefined/null/"" as null for monthNumber and photoUrl
    monthNumber = monthNumber === undefined || monthNumber === null || monthNumber === "" ? null : Number(monthNumber);
    photoUrl = photoUrl === undefined || photoUrl === null || photoUrl === "" ? null : photoUrl;
    uploadedDate = uploadedDate ? new Date(uploadedDate) : new Date();

    const project = await Project.findById(ecoenzimProjectId);
    if (!project) return res.status(404).json({ error: "Project not found" });

    // Tentukan apakah ini upload harian (daily) atau upload foto bulanan (progress)
    const isDailyUpload = monthNumber === null;

    // Jika upload foto (monthNumber diberikan) -> validasi hari 30/60/90
    if (!isDailyUpload) {
      // monthNumber expected 1,2,3 (representasi 30/60/90)
      if (![1,2,3].includes(monthNumber)) {
        return res.status(400).json({ error: "monthNumber invalid" });
      }
      if (!photoUrl) {
        return res.status(400).json({ error: "Foto wajib untuk upload progress bulanan" });
      }

      const uploadDate = new Date(uploadedDate);
      if (!isValidUploadDay(project, uploadDate)) {
        return res.status(400).json({
          error: "Upload foto hanya diizinkan di hari ke-30, 60, atau 90 sejak mulai fermentasi"
        });
      }

      // Cegah duplicate monthly photo untuk tahap yang sama
      const existingUpload = await Upload.findOne({
        ecoenzimProjectId,
        monthNumber
      });
      if (existingUpload) {
        return res.status(400).json({ error: "Sudah ada upload foto untuk tahap ini" });
      }
    } else {
      // Daily upload: gunakan prePointsEarned dari body kalau ada, kalau tidak, derive dari berat (jika ada)
      // Jika prePointsEarned tidak dikirim, beri default 1 (small check-in)
      prePointsEarned = prePointsEarned !== undefined && prePointsEarned !== null ? Number(prePointsEarned) : 1;
    }

    const newUpload = new Upload({
      ecoenzimProjectId,
      userId,
      monthNumber: isDailyUpload ? null : monthNumber,
      photoUrl: isDailyUpload ? null : photoUrl,
      uploadedDate,
      prePointsEarned: isDailyUpload ? Math.round(prePointsEarned) : 50,
      status: isDailyUpload ? "verified" : "pending"
    });

    await newUpload.save();

    // Update project prePointsEarned: total verified uploads * 50 + sum of daily prePoints if you want
    const totalVerifiedCount = await Upload.countDocuments({
      ecoenzimProjectId,
      status: "verified"
    });

    // Optionally sum daily prePoints too (here we keep example: project.prePointsEarned = totalVerifiedCount * 50)
    project.prePointsEarned = totalVerifiedCount * 50;
    await project.save();

    // Setelah menyimpan upload, update project status (bila perlu)
    if (typeof project.updateProjectStatus === "function") {
      try { await project.updateProjectStatus(); } catch(e) { console.warn("updateProjectStatus failed:", e); }
    }

    res.status(201).json({ upload: newUpload });
  } catch (err) {
    console.error("createUpload error:", err);
    res.status(500).json({ error: err.message || "Server error" });
  }
};


export const getAllUploads = async (req, res) => {
  try {
    const uploads = await Upload.find();
    res.json(uploads);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getUploadsByProject = async (req, res) => {
  try {
    const uploads = await Upload.find({
      ecoenzimProjectId: req.params.projectId,
    }).sort({ uploadedDate: -1 }); // terbaru dulu

    // Kembalikan array kosong jika tidak ada upload (lebih friendly untuk frontend)
    return res.json(uploads);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


export const verifyUpload = async (req, res) => {
  try {
    const upload = await Upload.findById(req.params.id);
    if (!upload) return res.status(404).json({ error: "Upload not found" });

    upload.status = "verified";
    await upload.save();

    // Update project prePointsEarned
    const project = await Project.findById(upload.ecoenzimProjectId);
    const totalVerified = await Upload.countDocuments({
      ecoenzimProjectId: upload.ecoenzimProjectId,
      status: "verified"
    });
    project.prePointsEarned = totalVerified * 50;
    await project.save();

    res.json({ upload });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// --------------------
// CLAIM CONTROLLER
// --------------------

export const claimPoints = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: "Project not found" });

    // Ambil status terbaru
    const { status, canClaim } = await calculateProjectStatus(project);
    if (status !== project.status || canClaim !== project.canClaim) {
      project.status = status;
      project.canClaim = canClaim;
      await project.save();
    }

    if (!canClaim) {
      return res.status(400).json({ 
        error: "Syarat klaim belum terpenuhi",
        status: project.status
      });
    }

    // Proses klaim
    project.points = project.prePointsEarned;
    project.prePointsEarned = null; // Sesuai contoh data
    project.isClaimed = true;
    project.claimedAt = new Date();
    project.status = "completed";
    project.canClaim = false;

    await project.save();

    if (project.userId && project.points) {
      await recordPointsChange({
        userId: project.userId,
        pointsAmount: project.points,
        source: "ecoenzim",
        referenceId: project._id?.toString() ?? null,
        createdAt: project.claimedAt ?? new Date(),
      });
    }

    res.json({ success: true, points: project.points });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// --------------------
// CRON JOB: AUTO-CANCEL EXPIRED PROJECTS
// --------------------

export const autoCancelExpiredProjects = async () => {
  try {
    const now = new Date();
    
    // Cari proyek ongoing yang sudah lewat endDate
    const expiredProjects = await Project.find({
      status: "ongoing",
      endDate: { $lt: now }
    });

    let cancelledCount = 0;
    for (const project of expiredProjects) {
      // Cek jumlah upload verified
      const verifiedUploads = await Upload.countDocuments({
        ecoenzimProjectId: project._id,
        status: "verified"
      });

      // Jika kurang dari 3, cancel
      if (verifiedUploads < 3) {
        project.status = "cancelled";
        project.canClaim = false;
        await project.save();
        cancelledCount++;
      }
    }

    console.log(`✅ Auto-cancelled ${cancelledCount} expired projects`);
    return cancelledCount;
  } catch (err) {
    console.error("❌ Error in autoCancelExpiredProjects:", err);
    throw err;
  }
};


export const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Hapus semua upload terkait
    await Upload.deleteMany({ ecoenzimProjectId: id });
    
    // Hapus project
    const project = await Project.findByIdAndDelete(id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    res.json({ message: "Project deleted successfully" });
  } catch (err) {
    console.error("Delete project error:", err);
    res.status(500).json({ error: err.message });
  }
};
