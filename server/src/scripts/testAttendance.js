import "dotenv/config";
import mongoose from "mongoose";
import app from "../app.js";
import connectDB from "../config/db.js";
import User from "../models/User.js";
import Batch from "../models/Batch.js";
import Enrollment from "../models/Enrollment.js";
import Attendance from "../models/Attendance.js";
import { signToken } from "../utils/jwt.js";

const runAttendanceTests = async () => {
  await connectDB();

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/v1/attendance`;

  let otherTeacher = null;
  let otherBatch = null;
  let archivedBatch = null;
  let outsiderStudent = null;

  try {
    console.log(`Starting automated Module 4 Attendance verification on port ${port}...`);

    const adminUser = await User.findOne({ email: "admin@edubatch.com" });
    const teacherUser = await User.findOne({ email: "teacher@edubatch.com" });
    const studentUser = await User.findOne({ email: "student@edubatch.com" });

    const adminToken = signToken({ id: adminUser._id, role: adminUser.role });
    const teacherToken = signToken({ id: teacherUser._id, role: teacherUser.role });
    const studentToken = signToken({ id: studentUser._id, role: studentUser.role });

    const jeeBatch = await Batch.findOne({ name: "JEE Advanced 2026 — Morning Batch A" });
    const jeeEnrollments = await Enrollment.find({ batch: jeeBatch._id, isActive: true });

    // Create a secondary teacher and a batch under their charge
    otherTeacher = await User.create({
      name: "Prof. Other Faculty",
      email: `other_teacher_${Date.now()}@edubatch.com`,
      password: "Password@123",
      role: "teacher",
    });

    otherBatch = await Batch.create({
      name: `Other Teacher Cohort ${Date.now()}`,
      subject: "Chemistry",
      capacity: 30,
      fee: 20000,
      teacher: otherTeacher._id,
      createdBy: adminUser._id,
      status: "active",
    });

    // Create an archived batch
    archivedBatch = await Batch.create({
      name: `Archived Test Batch ${Date.now()}`,
      subject: "Biology",
      capacity: 30,
      fee: 20000,
      teacher: teacherUser._id,
      createdBy: adminUser._id,
      status: "archived",
      isArchived: true,
    });

    // Create an outsider student not enrolled in JEE batch
    outsiderStudent = await User.create({
      name: "Outsider Student",
      email: `outsider_${Date.now()}@edubatch.com`,
      password: "Password@123",
      role: "student",
    });

    const testDate = "2026-09-25";

    // -------------------------------------------------------------
    // TEST 1: Assigned Teacher marks attendance for their own batch
    // -------------------------------------------------------------
    const test1Payload = {
      batch: jeeBatch._id.toString(),
      date: testDate,
      records: jeeEnrollments.map((enr, idx) => ({
        student: enr.student.toString(),
        status: idx === 0 ? "present" : "late",
        remarks: idx === 1 ? "10 min late" : "",
      })),
    };

    const test1Res = await fetch(`${baseUrl}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${teacherToken}`,
      },
      body: JSON.stringify(test1Payload),
    });
    const test1Data = await test1Res.json();

    if (test1Res.status === 200 && test1Data.success && test1Data.data?.attendance?.records?.length > 0) {
      console.log("✓ TEST 1 PASSED: Assigned Teacher recorded cohort roll call (200 OK).");
    } else {
      console.error("✗ TEST 1 FAILED:", test1Data);
      process.exit(1);
    }

    // -------------------------------------------------------------
    // TEST 2: Teacher blocked from marking attendance for another faculty's batch (403)
    // -------------------------------------------------------------
    const test2Payload = {
      batch: otherBatch._id.toString(),
      date: testDate,
      records: [
        {
          student: studentUser._id.toString(),
          status: "present",
        },
      ],
    };

    const test2Res = await fetch(`${baseUrl}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${teacherToken}`, // teacherUser trying to mark otherBatch
      },
      body: JSON.stringify(test2Payload),
    });
    const test2Data = await test2Res.json();

    if (test2Res.status === 403) {
      console.log("✓ TEST 2 PASSED: Faculty blocked from marking attendance for another lead's cohort (403 Forbidden).");
    } else {
      console.error("✗ TEST 2 FAILED:", test2Res.status, test2Data);
      process.exit(1);
    }

    // -------------------------------------------------------------
    // TEST 3: Student blocked from submitting roll call (403)
    // -------------------------------------------------------------
    const test3Res = await fetch(`${baseUrl}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify(test1Payload),
    });
    const test3Data = await test3Res.json();

    if (test3Res.status === 403) {
      console.log("✓ TEST 3 PASSED: Student candidate blocked from POST /attendance (403 Forbidden).");
    } else {
      console.error("✗ TEST 3 FAILED:", test3Res.status, test3Data);
      process.exit(1);
    }

    // -------------------------------------------------------------
    // TEST 4: Atomic Upsert - Re-submitting for same date updates existing document
    // -------------------------------------------------------------
    const test4Payload = {
      batch: jeeBatch._id.toString(),
      date: testDate,
      records: jeeEnrollments.map((enr) => ({
        student: enr.student.toString(),
        status: "present", // Updated all to present!
        remarks: "Revised by faculty",
      })),
    };

    const test4Res = await fetch(`${baseUrl}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${teacherToken}`,
      },
      body: JSON.stringify(test4Payload),
    });
    const test4Data = await test4Res.json();

    const attendanceCountForDate = await Attendance.countDocuments({
      batch: jeeBatch._id,
      date: new Date(Date.UTC(2026, 8, 25, 0, 0, 0, 0)),
    });

    if (
      test4Res.status === 200 &&
      attendanceCountForDate === 1 &&
      test4Data.data?.attendance?.records[0]?.remarks === "Revised by faculty"
    ) {
      console.log("✓ TEST 4 PASSED: Atomic upsert revised roll call without duplicate key collision.");
    } else {
      console.error("✗ TEST 4 FAILED: count=", attendanceCountForDate, test4Data);
      process.exit(1);
    }

    // -------------------------------------------------------------
    // TEST 5: Reject roll call if student is not actively enrolled in the batch
    // -------------------------------------------------------------
    const test5Payload = {
      batch: jeeBatch._id.toString(),
      date: "2026-09-26",
      records: [
        {
          student: outsiderStudent._id.toString(),
          status: "present",
        },
      ],
    };

    const test5Res = await fetch(`${baseUrl}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${teacherToken}`,
      },
      body: JSON.stringify(test5Payload),
    });
    const test5Data = await test5Res.json();

    if (test5Res.status === 400 && test5Data.message.includes("not actively enrolled")) {
      console.log("✓ TEST 5 PASSED: Non-enrolled candidate roll call correctly rejected (400 Bad Request).");
    } else {
      console.error("✗ TEST 5 FAILED:", test5Res.status, test5Data);
      process.exit(1);
    }

    // -------------------------------------------------------------
    // TEST 6: Reject attendance marking on an archived batch
    // -------------------------------------------------------------
    const test6Payload = {
      batch: archivedBatch._id.toString(),
      date: "2026-09-26",
      records: [
        {
          student: studentUser._id.toString(),
          status: "present",
        },
      ],
    };

    const test6Res = await fetch(`${baseUrl}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${teacherToken}`,
      },
      body: JSON.stringify(test6Payload),
    });
    const test6Data = await test6Res.json();

    if (test6Res.status === 400 && test6Data.message.includes("archived")) {
      console.log("✓ TEST 6 PASSED: Archived batch attendance submission rejected (400 Bad Request).");
    } else {
      console.error("✗ TEST 6 FAILED:", test6Res.status, test6Data);
      process.exit(1);
    }

    // -------------------------------------------------------------
    // TEST 7: Student Personal Attendance Desk (GET /attendance/my)
    // -------------------------------------------------------------
    const test7Res = await fetch(`${baseUrl}/my`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${studentToken}`,
      },
    });
    const test7Data = await test7Res.json();

    if (
      test7Res.status === 200 &&
      test7Data.success &&
      typeof test7Data.data?.overall?.percentage === "number" &&
      test7Data.data?.overall?.totalSessions > 0 &&
      Array.isArray(test7Data.data?.batches) &&
      Array.isArray(test7Data.data?.history)
    ) {
      console.log(
        `✓ TEST 7 PASSED: Student personal attendance desk returned ${test7Data.data.overall.percentage}% across ${test7Data.data.overall.totalSessions} sessions.`
      );
    } else {
      console.error("✗ TEST 7 FAILED:", test7Res.status, test7Data);
      process.exit(1);
    }

    // -------------------------------------------------------------
    // TEST 8: Teacher views batch attendance history
    // -------------------------------------------------------------
    const test8Res = await fetch(`${baseUrl}/batch/${jeeBatch._id}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${teacherToken}`,
      },
    });
    const test8Data = await test8Res.json();

    if (
      test8Res.status === 200 &&
      test8Data.success &&
      test8Data.data?.sessions?.length > 0 &&
      test8Data.data?.sessions[0]?.summary?.total > 0
    ) {
      console.log(
        `✓ TEST 8 PASSED: Faculty fetched batch history (${test8Data.data.totalSessions} sessions with session aggregates).`
      );
    } else {
      console.error("✗ TEST 8 FAILED:", test8Res.status, test8Data);
      process.exit(1);
    }

    console.log("\n=======================================================");
    console.log("ALL 8 MODULE 4 ATTENDANCE TESTS PASSED SUCCESSFULLY! ✓");
    console.log("=======================================================\n");

    // Clean up test entities
    await Attendance.deleteOne({ batch: jeeBatch._id, date: new Date(Date.UTC(2026, 8, 25, 0, 0, 0, 0)) });
    await User.findByIdAndDelete(otherTeacher._id);
    await Batch.findByIdAndDelete(otherBatch._id);
    await Batch.findByIdAndDelete(archivedBatch._id);
    await User.findByIdAndDelete(outsiderStudent._id);

    server.close(() => {
      process.exit(0);
    });
  } catch (err) {
    console.error("Test execution failed with exception:", err);
    if (server) server.close();
    process.exit(1);
  }
};

runAttendanceTests();
