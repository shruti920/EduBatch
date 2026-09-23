import "dotenv/config";
import "./_assertSafeDb.js";
import { check } from "./_check.js";
import mongoose from "mongoose";
import app from "../app.js";
import connectDB from "../config/db.js";
import User from "../models/User.js";

const runTests = async () => {
  await connectDB();

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/v1/auth`;

  let testStudentEmail = `test_student_${Date.now()}@edubatch.com`;

  try {
    console.log(`Starting automated Module 1 Auth verification on port ${port}...`);

    // TEST 1: Register valid student
    const regRes = await fetch(`${baseUrl}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Candidate",
        email: testStudentEmail,
        password: "Password@123",
        phone: "+91 99999 88888",
      }),
    });
    const regData = await regRes.json();
    check(regRes.status === 201, `Expected 201, got ${regRes.status}`);
    check(regData.success === true, "Expected success true");
    check(regData.data.user.role === "student", "Role must be student");
    check(!regData.data.user.password, "Password must not be returned");
    console.log("✓ TEST 1 PASSED: Valid student registration");

    // TEST 2: Attempt privilege escalation during register
    const privEmail = `priv_test_${Date.now()}@edubatch.com`;
    const privRes = await fetch(`${baseUrl}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Hacker",
        email: privEmail,
        password: "Password@123",
        role: "admin", // Malicious injection
      }),
    });
    const privData = await privRes.json();
    check(privRes.status === 201, `Expected 201, got ${privRes.status}`);
    check(privData.data.user.role === "student", "Privilege escalation bypassed!");
    console.log("✓ TEST 2 PASSED: Privilege escalation blocked (forced to student)");

    // TEST 3: Duplicate email registration
    const dupRes = await fetch(`${baseUrl}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Duplicate Person",
        email: testStudentEmail,
        password: "Password@123",
      }),
    });
    const dupData = await dupRes.json();
    check(dupRes.status === 409, `Expected 409, got ${dupRes.status}`);
    check(dupData.success === false, "Expected success false");
    console.log("✓ TEST 3 PASSED: Duplicate email registration rejected with 409");

    // TEST 4: Login with valid credentials
    const loginRes = await fetch(`${baseUrl}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@edubatch.com",
        password: "Admin@123",
      }),
    });
    const loginData = await loginRes.json();
    check(loginRes.status === 200, `Expected 200, got ${loginRes.status}`);
    check(loginData.data.user.role === "admin", "Role must be admin");
    check(!!loginData.data.token, "Token must be returned");
    const adminToken = loginData.data.token;
    console.log("✓ TEST 4 PASSED: Admin login successful with valid JWT");

    // TEST 5: Login with wrong password
    const badLoginRes = await fetch(`${baseUrl}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@edubatch.com",
        password: "WrongPassword999",
      }),
    });
    check(badLoginRes.status === 401, `Expected 401, got ${badLoginRes.status}`);
    console.log("✓ TEST 5 PASSED: Invalid password rejected with 401");

    // TEST 6: Protected /me endpoint with valid token
    const meRes = await fetch(`${baseUrl}/me`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const meData = await meRes.json();
    check(meRes.status === 200, `Expected 200, got ${meRes.status}`);
    check(meData.data.user.email === "admin@edubatch.com", "Must match email");
    console.log("✓ TEST 6 PASSED: Protected /me authenticated successfully");

    // TEST 7: Protected /me endpoint without token
    const noTokenRes = await fetch(`${baseUrl}/me`);
    check(noTokenRes.status === 401, `Expected 401, got ${noTokenRes.status}`);
    console.log("✓ TEST 7 PASSED: Protected /me without token rejected with 401");

    // TEST 8: successful logins never count toward the rate limit (reviewers switching accounts)
    const login = (password) =>
      fetch(`${baseUrl}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "admin@edubatch.com", password }),
      }).then((r) => r.status);
    const goodStatuses = [];
    for (let i = 0; i < 12; i += 1) goodStatuses.push(await login("Admin@123"));
    if (goodStatuses.some((st) => st !== 200)) {
      throw new Error(`TEST 8 FAILED: successful logins were limited: ${goodStatuses.join(",")}`);
    }
    console.log("✓ TEST 8 PASSED: 12 successful logins in a row were all allowed");

    // TEST 9: repeated failed logins are still blocked (brute-force protection)
    const badStatuses = [];
    for (let i = 0; i < 11; i += 1) badStatuses.push(await login("wrong-password"));
    if (!badStatuses.includes(429)) {
      throw new Error(`TEST 9 FAILED: failed logins were never limited: ${badStatuses.join(",")}`);
    }
    console.log(`✓ TEST 9 PASSED: blocked with 429 after ${badStatuses.indexOf(429)} more failed attempts`);

    // Cleanup test users
    await User.deleteMany({ email: { $in: [testStudentEmail, privEmail] } });
    console.log("Cleaned up temporary test users.");

    console.log("\n=================================");
    console.log("ALL MODULE 1 BACKEND TESTS PASSED!");
    console.log("=================================\n");
  } catch (err) {
    console.error("Test failure:", err);
    process.exit(1);
  } finally {
    server.close();
    await mongoose.connection.close();
    process.exit(0);
  }
};

runTests();
