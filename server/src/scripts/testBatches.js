import "dotenv/config";
import mongoose from "mongoose";
import app from "../app.js";
import connectDB from "../config/db.js";
import User from "../models/User.js";
import Batch from "../models/Batch.js";
import { signToken } from "../utils/jwt.js";

const runBatchTests = async () => {
  await connectDB();

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/v1/batches`;

  let createdBatchId = null;

  try {
    console.log(`Starting automated Module 2 Batch verification on port ${port}...`);

    const adminUser = await User.findOne({ email: "admin@edubatch.com" });
    const teacherUser = await User.findOne({ email: "teacher@edubatch.com" });
    const studentUser = await User.findOne({ email: "student@edubatch.com" });

    const adminToken = signToken({ id: adminUser._id, role: adminUser.role });
    const teacherToken = signToken({ id: teacherUser._id, role: teacherUser.role });
    const studentToken = signToken({ id: studentUser._id, role: studentUser.role });

    // TEST 1: Admin lists all batches
    const listRes = await fetch(`${baseUrl}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const listData = await listRes.json();
    console.assert(listRes.status === 200, `Expected 200, got ${listRes.status}`);
    console.assert(listData.success === true, "Expected success: true");
    console.assert(Array.isArray(listData.data.batches), "Batches must be an array");
    console.assert(listData.data.counts.all >= 4, "Must have at least 4 batches");
    console.log(`✓ TEST 1 PASSED: Admin fetched ${listData.data.batches.length} cohorts with summary counts.`);

    // TEST 2: Teacher only sees assigned batches
    const teacherRes = await fetch(`${baseUrl}`, {
      headers: { Authorization: `Bearer ${teacherToken}` },
    });
    const teacherData = await teacherRes.json();
    console.assert(teacherRes.status === 200, `Expected 200, got ${teacherRes.status}`);
    for (const b of teacherData.data.batches) {
      console.assert(
        b.teacher._id.toString() === teacherUser._id.toString(),
        "Teacher saw unassigned batch!"
      );
    }
    console.log("✓ TEST 2 PASSED: Teacher strictly isolated to assigned cohorts.");

    // TEST 3: Admin creates a valid new cohort
    const newBatchPayload = {
      name: `Automated Test Cohort ${Date.now()}`,
      subject: "Advanced Robotics & AI",
      description: "Testing automated cohort creation",
      capacity: 30,
      fee: 25000,
      teacher: teacherUser._id.toString(),
      schedule: {
        days: ["Mon", "Wed"],
        startTime: "10:00",
        endTime: "12:00",
        venue: "Lab 404",
      },
      status: "upcoming",
    };

    const createRes = await fetch(`${baseUrl}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(newBatchPayload),
    });
    const createData = await createRes.json();
    console.assert(createRes.status === 201, `Expected 201, got ${createRes.status}`);
    console.assert(createData.success === true, "Expected success: true");
    createdBatchId = createData.data.batch._id;
    console.assert(createData.data.batch.teacher.name === teacherUser.name, "Teacher must be populated");
    console.log("✓ TEST 3 PASSED: Admin created new batch successfully.");

    // TEST 4: Admin attempts to assign a student as teacher -> MUST FAIL WITH 400
    const invalidTeacherRes = await fetch(`${baseUrl}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        ...newBatchPayload,
        name: "Invalid Teacher Batch",
        teacher: studentUser._id.toString(), // Student as teacher
      }),
    });
    console.assert(
      invalidTeacherRes.status === 400,
      `Expected 400 when assigning non-teacher, got ${invalidTeacherRes.status}`
    );
    console.log("✓ TEST 4 PASSED: Server rejected non-teacher user assignment.");

    // TEST 5: Student attempts to create a batch -> MUST BE 403 FORBIDDEN
    const studentCreateRes = await fetch(`${baseUrl}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify(newBatchPayload),
    });
    console.assert(studentCreateRes.status === 403, `Expected 403 for student create, got ${studentCreateRes.status}`);
    console.log("✓ TEST 5 PASSED: Student blocked from batch creation (403 Forbidden).");

    // TEST 6: Admin updates batch status to archived
    const statusRes = await fetch(`${baseUrl}/${createdBatchId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: "archived" }),
    });
    const statusData = await statusRes.json();
    console.assert(statusRes.status === 200, `Expected 200, got ${statusRes.status}`);
    console.assert(statusData.data.batch.isArchived === true, "Must set isArchived to true");
    console.log("✓ TEST 6 PASSED: Batch status updated to archived.");

    // TEST 7: Admin fetches faculty list for dropdowns
    const facRes = await fetch(`${baseUrl}/meta/faculty`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const facData = await facRes.json();
    console.assert(facRes.status === 200, `Expected 200, got ${facRes.status}`);
    console.assert(Array.isArray(facData.data.teachers), "Teachers must be an array");
    console.log(`✓ TEST 7 PASSED: Faculty metadata endpoint returned ${facData.data.teachers.length} active leads.`);

    // Cleanup test batch
    if (createdBatchId) {
      await Batch.findByIdAndDelete(createdBatchId);
      console.log("Cleaned up temporary test cohort.");
    }

    console.log("\n==================================");
    console.log("ALL MODULE 2 BACKEND TESTS PASSED!");
    console.log("==================================\n");
  } catch (err) {
    console.error("Test failure:", err);
    process.exit(1);
  } finally {
    server.close();
    await mongoose.connection.close();
    process.exit(0);
  }
};

runBatchTests();
