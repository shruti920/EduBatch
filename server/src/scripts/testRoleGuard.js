import "dotenv/config";
import "./_assertSafeDb.js";
import { check } from "./_check.js";
import mongoose from "mongoose";
import express from "express";
import connectDB from "../config/db.js";
import { protect, restrictTo } from "../middleware/auth.js";
import errorHandler from "../middleware/errorHandler.js";
import { signToken } from "../utils/jwt.js";
import User from "../models/User.js";

const testRoleGuard = async () => {
  await connectDB();

  const app = express();
  app.use(express.json());

  // Test routes
  app.get("/api/v1/test/admin-only", protect, restrictTo("admin"), (req, res) => {
    res.json({ success: true, message: "Welcome Admin" });
  });

  app.get("/api/v1/test/faculty-only", protect, restrictTo("admin", "teacher"), (req, res) => {
    res.json({ success: true, message: "Welcome Faculty/Admin" });
  });

  app.use(errorHandler);

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/v1/test`;

  try {
    console.log("Testing RBAC Role Guards (restrictTo)...");

    const studentUser = await User.findOne({ email: "student@edubatch.com" });
    const teacherUser = await User.findOne({ email: "teacher@edubatch.com" });
    const adminUser = await User.findOne({ email: "admin@edubatch.com" });

    const studentToken = signToken({ id: studentUser._id, role: studentUser.role });
    const teacherToken = signToken({ id: teacherUser._id, role: teacherUser.role });
    const adminToken = signToken({ id: adminUser._id, role: adminUser.role });

    // Test 1: Student hits admin-only route -> MUST BE 403 FORBIDDEN
    const res1 = await fetch(`${baseUrl}/admin-only`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    check(res1.status === 403, `Expected 403 for student on admin route, got ${res1.status}`);
    const data1 = await res1.json();
    check(data1.success === false, "Expected success: false");
    console.log("✓ TEST 1 PASSED: Student blocked from Admin route with 403 Forbidden");

    // Test 2: Teacher hits admin-only route -> MUST BE 403 FORBIDDEN
    const res2 = await fetch(`${baseUrl}/admin-only`, {
      headers: { Authorization: `Bearer ${teacherToken}` },
    });
    check(res2.status === 403, `Expected 403 for teacher on admin route, got ${res2.status}`);
    console.log("✓ TEST 2 PASSED: Teacher blocked from Admin route with 403 Forbidden");

    // Test 3: Admin hits admin-only route -> MUST BE 200 OK
    const res3 = await fetch(`${baseUrl}/admin-only`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    check(res3.status === 200, `Expected 200 for admin on admin route, got ${res3.status}`);
    console.log("✓ TEST 3 PASSED: Admin permitted access to Admin route (200 OK)");

    // Test 4: Teacher hits faculty route -> MUST BE 200 OK
    const res4 = await fetch(`${baseUrl}/faculty-only`, {
      headers: { Authorization: `Bearer ${teacherToken}` },
    });
    check(res4.status === 200, `Expected 200 for teacher on faculty route, got ${res4.status}`);
    console.log("✓ TEST 4 PASSED: Teacher permitted access to Faculty route (200 OK)");

    console.log("\n==================================");
    console.log("ALL RBAC ROLE-GUARD TESTS PASSED!");
    console.log("==================================\n");
  } catch (err) {
    console.error("Test failed:", err);
    process.exitCode = 1;
  } finally {
    const closed = new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    server.closeAllConnections?.();
    await closed;
    await mongoose.disconnect();
  }
};

testRoleGuard();
