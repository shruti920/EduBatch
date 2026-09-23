import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import User from "../models/User.js";
import Batch from "../models/Batch.js";
import Enrollment from "../models/Enrollment.js";
import Attendance from "../models/Attendance.js";

const normalizeDate = (d) => {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
};

const seedAttendance = async () => {
  try {
    await connectDB();
    console.log("Connected to MongoDB for attendance seeding...");

    // 1. Fetch teacher and batches
    const teacher = await User.findOne({ email: "teacher@edubatch.com" });
    if (!teacher) {
      console.error("Faculty lead (teacher@edubatch.com) not found. Run seedUsers.js first.");
      process.exit(1);
    }

    const jeeBatch = await Batch.findOne({ name: "JEE Advanced 2026 — Morning Batch A" });
    const neetBatch = await Batch.findOne({ name: "NEET Target 2025 — Droppers Intensive" });

    if (!jeeBatch || !neetBatch) {
      console.error("Batches not found. Run seedBatches.js first.");
      process.exit(1);
    }

    // 2. Fetch enrolled students
    const jeeEnrollments = await Enrollment.find({ batch: jeeBatch._id, isActive: true }).populate("student");
    const neetEnrollments = await Enrollment.find({ batch: neetBatch._id, isActive: true }).populate("student");

    console.log(`Found ${jeeEnrollments.length} students in JEE batch, ${neetEnrollments.length} in NEET batch.`);

    const now = new Date();

    // 3. Seed past 5 class dates for JEE batch
    const jeeDates = [5, 4, 3, 2, 1].map((daysAgo) => {
      const d = new Date(now);
      d.setDate(d.getDate() - daysAgo);
      return normalizeDate(d);
    });

    const jeePatterns = [
      // Day -5
      {
        "student@edubatch.com": { status: "present", remarks: "" },
        "bhavya@edubatch.com": { status: "present", remarks: "" },
        "divya@edubatch.com": { status: "present", remarks: "" },
      },
      // Day -4
      {
        "student@edubatch.com": { status: "present", remarks: "" },
        "bhavya@edubatch.com": { status: "late", remarks: "15 min traffic transit delay" },
        "divya@edubatch.com": { status: "present", remarks: "" },
      },
      // Day -3
      {
        "student@edubatch.com": { status: "present", remarks: "" },
        "bhavya@edubatch.com": { status: "present", remarks: "" },
        "divya@edubatch.com": { status: "absent", remarks: "Medical appointment notice submitted" },
      },
      // Day -2
      {
        "student@edubatch.com": { status: "present", remarks: "" },
        "bhavya@edubatch.com": { status: "present", remarks: "" },
        "divya@edubatch.com": { status: "present", remarks: "" },
      },
      // Day -1
      {
        "student@edubatch.com": { status: "present", remarks: "" },
        "bhavya@edubatch.com": { status: "absent", remarks: "Unexcused absence" },
        "divya@edubatch.com": { status: "present", remarks: "" },
      },
    ];

    for (let i = 0; i < jeeDates.length; i++) {
      const date = jeeDates[i];
      const pattern = jeePatterns[i];

      const records = jeeEnrollments.map((enr) => {
        const email = enr.student?.email;
        const config = pattern[email] || { status: "present", remarks: "" };
        return {
          student: enr.student._id,
          status: config.status,
          remarks: config.remarks,
        };
      });

      await Attendance.findOneAndUpdate(
        { batch: jeeBatch._id, date },
        {
          records,
          markedBy: teacher._id,
        },
        { upsert: true, new: true, runValidators: true }
      );
      console.log(`Seeded JEE attendance for ${date.toISOString().slice(0, 10)}`);
    }

    // 4. Seed past 3 class dates for NEET batch
    const neetDates = [3, 2, 1].map((daysAgo) => {
      const d = new Date(now);
      d.setDate(d.getDate() - daysAgo);
      return normalizeDate(d);
    });

    const neetStatuses = ["present", "late", "present"];

    for (let i = 0; i < neetDates.length; i++) {
      const date = neetDates[i];
      const records = neetEnrollments.map((enr) => ({
        student: enr.student._id,
        status: neetStatuses[i],
        remarks: neetStatuses[i] === "late" ? "10 min late to lab lecture" : "",
      }));

      await Attendance.findOneAndUpdate(
        { batch: neetBatch._id, date },
        {
          records,
          markedBy: teacher._id,
        },
        { upsert: true, new: true, runValidators: true }
      );
      console.log(`Seeded NEET attendance for ${date.toISOString().slice(0, 10)}`);
    }

    console.log("Attendance seeding complete! Historical attendance data populated.");
    process.exit(0);
  } catch (err) {
    console.error("Attendance seeding failed:", err);
    process.exit(1);
  }
};

seedAttendance();
