// src/config/database.js
import mongoose from "mongoose";
mongoose.set('bufferCommands', false);

let isConnected = false;

const connectToDb = async () => {
  if (isConnected && mongoose.connection.readyState === 1) {
    console.log("✅ Using existing MongoDB connection");
    return;
  }

  try {
    const options = {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 2,
    };

    await mongoose.connect(process.env.MONGODB_URI, options);
    
    isConnected = true;
    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    isConnected = false;
    console.error("❌ MongoDB connection failed:", error.message);
    throw new Error(`Database connection failed: ${error.message}`);
  }
};

export default connectToDb;