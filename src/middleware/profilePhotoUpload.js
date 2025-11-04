// src/middleware/profilePhotoUpload.js
import multer, { memoryStorage, MulterError } from "multer";

const storage = memoryStorage();

function fileFilter(_req, file, callback) {
  const allowed = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/svg+xml",
  ];

  if (allowed.includes(file.mimetype)) {
    callback(null, true);
  } else {
    const error = new MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname);
    error.message = "Format file tidak didukung";
    error.code = "UNSUPPORTED_FILE_TYPE";
    callback(error);
  }
}

const MAX_PROFILE_PHOTO_SIZE = 3 * 1024 * 1024; // 3 MB

export const profilePhotoUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_PROFILE_PHOTO_SIZE,
    files: 1,
  },
});

export default profilePhotoUpload;
