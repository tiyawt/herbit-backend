// src/utils/gridfs.js
import mongoose from "mongoose";

let profilePhotoBucket = null;

export function initProfilePhotoBucket() {
  const connection = mongoose.connection;

  if (!connection || !connection.db) {
    throw new Error("MongoDB connection is not ready for GridFS initialization");
  }

  profilePhotoBucket = new mongoose.mongo.GridFSBucket(connection.db, {
    bucketName: "profilePhotos",
  });
}

export function getProfilePhotoBucket() {
  if (!profilePhotoBucket) {
    throw new Error("PROFILE_PHOTO_BUCKET_NOT_INITIALIZED");
  }
  return profilePhotoBucket;
}
