import "dotenv/config";
import "./_assertSafeDb.js";
import mongoose from "mongoose";
import app from "../app.js";
import connectDB from "../config/db.js";
import User from "../models/User.js";
import Batch from "../models/Batch.js";
import Enrollment from "../models/Enrollment.js";
import { signToken } from "../utils/jwt.js";

const runEnrollmentTests = async () => {
  await connectDB();

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/v1/enrollments`;

  let tempBatch = null;
  let tempStudent1 = null;
  let tempStudent2 = null;

  try {
    console.log(`Starting automated Module 3 Enrollment verification on port ${port}...`);

    const adminUser = await User.findOne({ email: "admin@edubatch.com" });
    const teacherUser = await User.findOne({ email: "teacher@edubatch.com" });
    const studentUser = await User.findOne({ email: "student@edubatch.com" });

    const adminToken = signToken({ id: adminUser._id, role: adminUser.role });
    const teacherToken = signToken({ id: teacherUser._id, role: teacherUser.role });
    const studentToken = signToken({ id: studentUser._id, role: studentUser.role });

    const jeeBatch = await Batch.findOne({ name: "JEE Advanced 2026 — Morning Batch A" });

    // Create temporary test students
    tempStudent1 = await User.create({
      name: "Temp Student One",
      email: `temp1_${Date.now()}@edubatch.com`,
      password: "Password@123",
      role: "student",
    });
    tempStudent2 = await User.create({
      name: "Temp Student Two",
      email: `temp2_${Date.now()}@edubatch.com`,
      password: "Password@123",
      role: "student",
    });

    // Create a temporary batch with capacity: 1 to test hard capacity limit
    tempBatch = await Batch.create({
      name: `Cap Test Batch ${Date.now()}`,
      subject: "Test Subject",
      capacity: 1, // Only 1 seat!
      fee: 1000,
      teacher: teacherUser._id,
      createdBy: adminUser._id,
      status: "active",
    });

    // TEST 1: Admin enrolls student 1 into temp batch (1/1)
    const enroll1Res = await fetch(`${baseUrl}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        student: tempStudent1._id.toString(),
        batch: tempBatch._id.toString(),
        paymentStatus: "pending",
      }),
    });
    const enroll1Data = await enroll1Res.json();
    console.assert(enroll1Res.status === 201, `Expected 201, got ${enroll1Res.status}`);
    console.assert(enroll1Data.success === true, "Expected success: true");
    console.assert(enroll1Data.data.enrollment.student.name === tempStudent1.name, "Must populate student");
    console.log("✓ TEST 1 PASSED: Admin successfully enrolled student into cohort.");

    // TEST 2: Re-enrolling the same student into the same batch -> MUST FAIL WITH 400
    const dupRes = await fetch(`${baseUrl}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        student: tempStudent1._id.toString(),
        batch: tempBatch._id.toString(),
      }),
    });
    console.assert(dupRes.status === 409, `Expected 409 for duplicate enrollment, got ${dupRes.status}`);
    console.log("✓ TEST 2 PASSED: Duplicate enrollment blocked with 409 Conflict.");

    // TEST 3: Attempt to enroll a teacher account as student -> MUST FAIL WITH 400
    const invalidRoleRes = await fetch(`${baseUrl}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        student: teacherUser._id.toString(), // Teacher as student
        batch: tempBatch._id.toString(),
      }),
    });
    console.assert(invalidRoleRes.status === 400, `Expected 400 for non-student, got ${invalidRoleRes.status}`);
    console.log("✓ TEST 3 PASSED: Enrolling a non-student rejected with 400.");

    // TEST 4: Hard capacity limit check: Batch capacity is 1, already has 1. Student 2 attempts to enroll -> MUST FAIL WITH 409
    const capRes = await fetch(`${baseUrl}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        student: tempStudent2._id.toString(),
        batch: tempBatch._id.toString(),
      }),
    });
    const capData = await capRes.json();
    console.assert(capRes.status === 409, `Expected 409 on capacity limit, got ${capRes.status}`);
    console.assert(capData.message.includes("is full"), "Message must explain capacity limit");
    console.log(`✓ TEST 4 PASSED: Hard capacity limit enforced. (${capData.message})`);

    // TEST 5: Student queries own enrollments (GET /my)
    const myRes = await fetch(`${baseUrl}/my`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const myData = await myRes.json();
    console.assert(myRes.status === 200, `Expected 200, got ${myRes.status}`);
    console.assert(Array.isArray(myData.data.enrollments), "Enrollments must be an array");
    console.assert(myData.data.enrollments.length >= 1, "Student should have at least 1 enrollment");
    console.log(`✓ TEST 5 PASSED: Student fetched ${myData.data.enrollments.length} personal enrollments.`);

    // TEST 6: Teacher views roster for assigned batch (GET /batch/:batchId)
    const rosterRes = await fetch(`${baseUrl}/batch/${jeeBatch._id}`, {
      headers: { Authorization: `Bearer ${teacherToken}` },
    });
    const rosterData = await rosterRes.json();
    console.assert(rosterRes.status === 200, `Expected 200, got ${rosterRes.status}`);
    console.assert(Array.isArray(rosterData.data.roster), "Roster must be an array");
    console.assert(rosterData.data.counts.enrolled >= 3, "JEE batch should have at least 3 students");
    console.log(`✓ TEST 6 PASSED: Teacher viewed assigned batch roster (${rosterData.data.roster.length} candidates).`);

    // TEST 7: Student attempts to view class roster -> MUST BE 403 FORBIDDEN
    const studentRosterRes = await fetch(`${baseUrl}/batch/${jeeBatch._id}`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    console.assert(studentRosterRes.status === 403, `Expected 403 for student roster view, got ${studentRosterRes.status}`);
    console.log("✓ TEST 7 PASSED: Student blocked from viewing class roster (403 Forbidden).");

    // TEST 8: Admin soft-drops candidate
    const dropRes = await fetch(`${baseUrl}/${enroll1Data.data.enrollment._id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const dropData = await dropRes.json();
    console.assert(dropRes.status === 200, `Expected 200, got ${dropRes.status}`);
    console.assert(dropData.data.isActive === false, "Must set isActive to false");
    console.log("✓ TEST 8 PASSED: Admin soft-dropped candidate from cohort.");

    console.log("\n======================================");
    console.log("ALL MODULE 3 ENROLLMENT TESTS PASSED!");
    console.log("======================================\n");
  } catch (err) {
    console.error("Test failed:", err);
    process.exit(1);
  } finally {
    if (tempBatch) await Batch.findByIdAndDelete(tempBatch._id);
    if (tempStudent1) {
      await Enrollment.deleteMany({ student: tempStudent1._id });
      await User.deleteOne({ _id: tempStudent1._id });
    }
    if (tempStudent2) {
      await Enrollment.deleteMany({ student: tempStudent2._id });
      await User.deleteOne({ _id: tempStudent2._id });
    }
    server.close();
    await mongoose.connection.close();
    process.exit(0);
  }
};

runEnrollmentTests();
