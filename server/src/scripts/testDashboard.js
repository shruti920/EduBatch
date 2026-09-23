import "dotenv/config";
import app from "../app.js";
import connectDB from "../config/db.js";
import User from "../models/User.js";
import { signToken } from "../utils/jwt.js";

const runDashboardTests = async () => {
  await connectDB();

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/v1/dashboard`;

  try {
    console.log(`Starting automated Dashboard verification on port ${port}...`);

    const adminUser = await User.findOne({ email: "admin@edubatch.com" });
    const teacherUser = await User.findOne({ email: "teacher@edubatch.com" });
    const studentUser = await User.findOne({ email: "student@edubatch.com" });

    const adminToken = signToken({ id: adminUser._id, role: adminUser.role });
    const teacherToken = signToken({ id: teacherUser._id, role: teacherUser.role });
    const studentToken = signToken({ id: studentUser._id, role: studentUser.role });

    // TEST 1: Admin fetches /dashboard/admin
    const test1Res = await fetch(`${baseUrl}/admin`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const test1Data = await test1Res.json();

    if (
      test1Res.status === 200 &&
      test1Data.success &&
      typeof test1Data.data?.counts?.totalBatches === "number" &&
      typeof test1Data.data?.counts?.totalEnrolledSeats === "number" &&
      typeof test1Data.data?.financials?.realizedFees === "number" &&
      Array.isArray(test1Data.data?.batches)
    ) {
      console.log(
        `✓ TEST 1 PASSED: Admin dashboard returned genuine aggregates (Batches: ${test1Data.data.counts.totalBatches}, Enrolled: ${test1Data.data.counts.totalEnrolledSeats}, Realized: ₹${test1Data.data.financials.realizedFees}).`
      );
    } else {
      console.error("✗ TEST 1 FAILED:", test1Res.status, test1Data);
      process.exit(1);
    }

    // TEST 2: Student blocked from /dashboard/admin (403)
    const test2Res = await fetch(`${baseUrl}/admin`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    if (test2Res.status === 403) {
      console.log("✓ TEST 2 PASSED: Student blocked from /dashboard/admin (403 Forbidden).");
    } else {
      console.error("✗ TEST 2 FAILED:", test2Res.status);
      process.exit(1);
    }

    // TEST 3: Teacher fetches /dashboard/teacher
    const test3Res = await fetch(`${baseUrl}/teacher`, {
      headers: { Authorization: `Bearer ${teacherToken}` },
    });
    const test3Data = await test3Res.json();

    if (
      test3Res.status === 200 &&
      test3Data.success &&
      typeof test3Data.data?.totalBatches === "number" &&
      typeof test3Data.data?.totalStudents === "number"
    ) {
      console.log(
        `✓ TEST 3 PASSED: Teacher dashboard returned assigned cohorts (${test3Data.data.totalBatches} batches, ${test3Data.data.totalStudents} students, status: ${test3Data.data.rollCallStatus}).`
      );
    } else {
      console.error("✗ TEST 3 FAILED:", test3Res.status, test3Data);
      process.exit(1);
    }

    // TEST 4: Student fetches /dashboard/student
    const test4Res = await fetch(`${baseUrl}/student`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const test4Data = await test4Res.json();

    if (
      test4Res.status === 200 &&
      test4Data.success &&
      typeof test4Data.data?.totalEnrolled === "number" &&
      typeof test4Data.data?.attendanceRate === "number"
    ) {
      console.log(
        `✓ TEST 4 PASSED: Student dashboard returned personal cohorts (${test4Data.data.totalEnrolled} enrolled, ${test4Data.data.attendanceRate}% attendance).`
      );
    } else {
      console.error("✗ TEST 4 FAILED:", test4Res.status, test4Data);
      process.exit(1);
    }

    console.log("\n=======================================================");
    console.log("ALL DASHBOARD ENDPOINT TESTS PASSED SUCCESSFULLY! ✓");
    console.log("=======================================================\n");

    server.close(() => {
      process.exit(0);
    });
  } catch (err) {
    console.error("Dashboard test execution failed:", err);
    if (server) server.close();
    process.exit(1);
  }
};

runDashboardTests();
