import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import User from "../models/User.js";
import Batch from "../models/Batch.js";

const seedBatches = async () => {
  try {
    await connectDB();
    console.log("Connected to MongoDB for batch seeding...");

    // Find admin and teacher
    const admin = await User.findOne({ email: "admin@edubatch.com" });
    const teacher = await User.findOne({ email: "teacher@edubatch.com" });

    if (!admin || !teacher) {
      console.error("Admin or Teacher not found. Run seedUsers.js first.");
      process.exit(1);
    }

    const demoBatches = [
      {
        name: "JEE Advanced 2026 — Morning Batch A",
        subject: "Physics & Pure Math",
        description:
          "Comprehensive Physics, Calculus & Organic Chemistry for Top 500 AIR Aspirants",
        schedule: {
          days: ["Mon", "Wed", "Fri"],
          startTime: "06:30",
          endTime: "09:00",
          venue: "Hall 3 (Auditorium)",
        },
        capacity: 45,
        fee: 45000,
        teacher: teacher._id,
        status: "active",
        createdBy: admin._id,
        isArchived: false,
      },
      {
        name: "NEET Target 2025 — Droppers Intensive",
        subject: "Human Physiology & Org. Chem",
        description:
          "High-speed NCERT drills, Anatomy revision, and Full Syllabus Mock Tests",
        schedule: {
          days: ["Tue", "Thu", "Sat"],
          startTime: "08:00",
          endTime: "11:30",
          venue: "Bio-Lab 102",
        },
        capacity: 40,
        fee: 55000,
        teacher: teacher._id,
        status: "active",
        createdBy: admin._id,
        isArchived: false,
      },
      {
        name: "Class 11 CBSE Foundation — Mathematics & Physics",
        subject: "Mathematics & Physics",
        description:
          "Board Curriculum alignment paired with foundational JEE problem-solving",
        schedule: {
          days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
          startTime: "16:00",
          endTime: "18:00",
          venue: "Room 104 (East Block)",
        },
        capacity: 35,
        fee: 30000,
        teacher: teacher._id,
        status: "active",
        createdBy: admin._id,
        isArchived: false,
      },
      {
        name: "Crash Course JEE Main Jan 2026 Session",
        subject: "Complete PCM Intensive",
        description:
          "60-Day sprint with daily 100-question computer-based testing emulation",
        schedule: {
          days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
          startTime: "14:00",
          endTime: "19:00",
          venue: "Hall 1 (Lecture Theatre)",
        },
        capacity: 50,
        fee: 18000,
        teacher: teacher._id,
        status: "upcoming",
        createdBy: admin._id,
        isArchived: false,
      },
    ];

    for (const batchData of demoBatches) {
      const existing = await Batch.findOne({ name: batchData.name });
      if (!existing) {
        await Batch.create(batchData);
        console.log(`Created batch: "${batchData.name}"`);
      } else {
        await Batch.findByIdAndUpdate(existing._id, {
          status: batchData.status,
          isArchived: false,
          capacity: batchData.capacity,
          fee: batchData.fee,
          schedule: batchData.schedule,
        });
        console.log(`Updated batch to active: "${batchData.name}"`);
      }
    }

    // Clean up temporary leftover batches
    await Batch.deleteMany({
      name: {
        $nin: demoBatches.map((b) => b.name),
      },
    });

    console.log("Batch seeding complete!");
    process.exit(0);
  } catch (err) {
    console.error("Batch seeding failed:", err);
    process.exit(1);
  }
};

seedBatches();
