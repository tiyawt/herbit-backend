// src/controllers/profilePhotoController.js
import mongoose from "mongoose";
import User from "../models/user.js";
import { ok, fail } from "../utils/response.js";
import { getProfilePhotoBucket } from "../utils/gridfs.js";

function buildPhotoUrl(fileId) {
  return `/api/users/profile-photo/${fileId}`;
}

function asObjectId(value) {
  if (!value) return null;
  if (typeof value === "string") {
    return new mongoose.Types.ObjectId(value);
  }
  if (value instanceof mongoose.Types.ObjectId) {
    return value;
  }
  // Attempt to coerce objects with _id or id
  if (value._id instanceof mongoose.Types.ObjectId) {
    return value._id;
  }
  if (value.id) {
    return new mongoose.Types.ObjectId(value.id);
  }
  return new mongoose.Types.ObjectId(value);
}

async function deletePreviousPhoto(photoFileId) {
  const objectId = asObjectId(photoFileId);
  if (!objectId) return;
  try {
    const bucket = getProfilePhotoBucket();
    await bucket.delete(objectId);
  } catch (error) {
    if (error?.code !== "ENOENT" && error?.message !== "FileNotFound") {
      console.warn("Failed to delete previous profile photo:", error?.message);
    }
  }
}

export async function uploadProfilePhotoHandler(req, res) {
  const authUserId = req.user?.id;
  if (!authUserId) {
    return fail(res, "UNAUTHORIZED", "User harus login", 401);
  }

  const file = req.file;
  if (!file) {
    return fail(res, "VALIDATION_ERROR", "File foto tidak ditemukan", 422);
  }

  try {
    const user = await User.findById(authUserId)
      .select({
        photoFileId: 1,
        username: 1,
        email: 1,
        totalPoints: 1,
        prePoints: 1,
        sortingStreak: 1,
        sortingBestStreak: 1,
        sortingLastPlayedBucket: 1,
      })
      .lean();

    if (!user) {
      return fail(res, "USER_NOT_FOUND", "User tidak ditemukan", 404);
    }

    const bucket = getProfilePhotoBucket();
    const uploadStream = bucket.openUploadStream(
      file.originalname || `profile-photo-${authUserId}`,
      {
        contentType: file.mimetype,
        metadata: { userId: authUserId },
      }
    );

    await new Promise((resolve, reject) => {
      uploadStream.on("finish", resolve);
      uploadStream.on("error", reject);

      if (file.buffer && file.buffer.length) {
        uploadStream.end(file.buffer);
      } else if (file.stream && typeof file.stream.pipe === "function") {
        file.stream.on("error", reject);
        file.stream.pipe(uploadStream);
      } else {
        uploadStream.end();
      }
    });

    const newPhotoId = uploadStream.id;
    const newPhotoUrl = buildPhotoUrl(newPhotoId.toString());

    const updatedUser = await User.findByIdAndUpdate(
      authUserId,
      { photoUrl: newPhotoUrl, photoFileId: newPhotoId },
      { new: true, runValidators: true }
    )
      .select({
        _id: 1,
        username: 1,
        email: 1,
        photoUrl: 1,
        totalPoints: 1,
        prePoints: 1,
        sortingStreak: 1,
        sortingBestStreak: 1,
        sortingLastPlayedBucket: 1,
        updatedAt: 1,
        photoFileId: 1,
      })
      .lean();

    if (!updatedUser) {
      await deletePreviousPhoto(newPhotoId);
      return fail(
        res,
        "UPDATE_FAILED",
        "Tidak dapat memperbarui foto profil",
        500
      );
    }

    await deletePreviousPhoto(user.photoFileId);

    return ok(
      res,
      {
        user: {
          id: updatedUser._id,
          username: updatedUser.username,
          email: updatedUser.email,
          photoUrl: updatedUser.photoUrl,
          totalPoints: updatedUser.totalPoints,
          prePoints: updatedUser.prePoints,
          sortingStreak: updatedUser.sortingStreak,
          sortingBestStreak: updatedUser.sortingBestStreak,
          sortingLastPlayedBucket: updatedUser.sortingLastPlayedBucket,
          updatedAt: updatedUser.updatedAt,
        },
      },
      "Foto profil berhasil diperbarui"
    );
  } catch (error) {
    console.error("[UPLOAD_PROFILE_PHOTO_FAILED]", {
      userId: req.user?.id,
      filename: req.file?.originalname,
      error: error?.message,
    });
    return fail(
      res,
      "UPLOAD_PROFILE_PHOTO_FAILED",
      "Gagal mengunggah foto profil",
      500
    );
  }
}

export async function getProfilePhotoHandler(req, res) {
  const { fileId } = req.params;
  if (!fileId) {
    return res.status(400).json({
      success: false,
      message: "Parameter fileId diperlukan",
    });
  }

  let objectId;
  try {
    objectId = new mongoose.Types.ObjectId(fileId);
  } catch {
    return res.status(400).json({
      success: false,
      message: "ID foto tidak valid",
    });
  }

  try {
    const bucket = getProfilePhotoBucket();
    const downloadStream = bucket.openDownloadStream(objectId);

    downloadStream.on("file", (file) => {
      res.setHeader("Content-Type", file.contentType || "application/octet-stream");
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    });

    downloadStream.on("error", (error) => {
      if (res.headersSent) {
        res.end();
        return;
      }
      if (error?.code === "ENOENT" || error?.message === "FileNotFound") {
        res.status(404).json({ success: false, message: "Foto tidak ditemukan" });
      } else {
        res
          .status(500)
          .json({ success: false, message: "Gagal mengambil foto profil" });
      }
    });

    downloadStream.pipe(res);
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Gagal mengambil foto profil" });
  }
}
