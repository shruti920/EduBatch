import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import User from "../models/User.js";
import Batch from "../models/Batch.js";
import Enrollment from "../models/Enrollment.js";
import { hashPassword } from "../utils/hash.js";

const seedEnrollments = async () => {
  try {
    await connectDB();
    console.log("Connected to MongoDB for enrollment seeding...");

    // 1. Ensure student accounts exist
    const studentsToSeed = [
      {
        name: "Aditya Nair",
        email: "student@edubatch.com",
        password: "Student@123",
        role: "student",
        phone: "+91 98450 11204",
      },
      {
        name: "Bhavya Chawla",
        email: "bhavya@edubatch.com",
        password: "Student@123",
        role: "student",
        phone: "+91 94140 88219",
      },
      {
        name: "Chetan Meena",
        email: "chetan@edubatch.com",
        password: "Student@123",
        role: "student",
        phone: "+91 98290 77123",
      },
      {
        name: "Divya Pillai",
        email: "divya@edubatch.com",
        password: "Student@123",
        role: "student",
        phone: "+91 97401 55621",
      },
    ];

    const studentMap = {};

    for (const s of studentsToSeed) {
      let user = await User.findOne({ email: s.email });
      if (!user) {
        const hashedPassword = await hashPassword(s.password);
        user = await User.create({
          ...s,
          password: hashedPassword,
        });
        console.log(`Created student account: ${s.name} (${s.email})`);
      }
      studentMap[s.email] = user;
    }

    // 2. Fetch cohorts
    const jeeBatch = await Batch.findOne({ name: "JEE Advanced 2026 — Morning Batch A" });
    const neetBatch = await Batch.findOne({ name: "NEET Target 2025 — Droppers Intensive" });

    if (!jeeBatch || !neetBatch) {
      console.error("Cohorts not found. Run seedBatches.js first.");
      process.exit(1);
    }

    // 3. Create Enrollments
    const enrollmentsToSeed = [
      {
        student: studentMap["student@edubatch.com"]._id,
        batch: jeeBatch._id,
        paymentStatus: "paid",
        isActive: true,
      },
      {
        student: studentMap["bhavya@edubatch.com"]._id,
        batch: jeeBatch._id,
        paymentStatus: "pending",
        isActive: true,
      },
      {
        student: studentMap["divya@edubatch.com"]._id,
        batch: jeeBatch._id,
        paymentStatus: "waived",
        isActive: true,
      },
      {
        student: studentMap["chetan@edubatch.com"]._id,
        batch: neetBatch._id,
        paymentStatus: "paid",
        isActive: true,
      },
    ];

    for (const e of enrollmentsToSeed) {
      const existing = await Enrollment.findOne({
        student: e.student,
        batch: e.batch,
      });

      if (!existing) {
        await Enrollment.create(e);
        console.log(`Enrolled student ${e.student} into batch ${e.batch}`);
      } else {
        console.log(`Enrollment already exists for student ${e.student}`);
      }
    }

    console.log("Enrollment seeding complete!");
    process.exit(0);
  } catch (err) {
    console.error("Enrollment seeding failed:", err);
    process.exit(1);
  }
};

seedEnrollments();
