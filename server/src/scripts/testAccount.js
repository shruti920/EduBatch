// Module 8a: sessions (refresh/rotation/logout), password reset, change password,
// profile, admin user management, dashboard revenue + upcoming classes.
import "dotenv/config";
import "./_assertSafeDb.js";
import { check } from "./_check.js";
import mongoose from "mongoose";
import app from "../app.js";
import connectDB from "../config/db.js";
import User from "../models/User.js";
import Batch from "../models/Batch.js";
import Enrollment from "../models/Enrollment.js";
import RefreshToken from "../models/RefreshToken.js";
import Avatar from "../models/Avatar.js";
import { clearOutbox, getOutbox } from "../services/emailService.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const run = async () => {
  await connectDB();
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api/v1`;
  const stamp = Date.now();
  const created = { users: [], batches: [] };

  // Minimal cookie jar: one refresh cookie per "browser"
  const cookieFrom = (res) => {
    const raw = (res.headers.getSetCookie?.() || []).find((c) => c.startsWith("eb_rt="));
    if (!raw) return undefined;
    const value = raw.split(";")[0].slice("eb_rt=".length);
    return value || null; // null = cleared
  };

  const call = async (method, path, { token, body, cookie, xhr = true } = {}) => {
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (cookie) headers.Cookie = `eb_rt=${cookie}`;
    if (xhr) headers["X-Requested-With"] = "XMLHttpRequest";
    const res = await fetch(`${base}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const json = await res.json().catch(() => ({}));
    return { status: res.status, json, cookie: cookieFrom(res), headers: res.headers };
  };

  try {
    /* ---------------- Sessions ---------------- */
    const email = `acct_${stamp}@example.com`;
    const reg = await call("POST", "/auth/register", {
      body: { name: "Account Tester", email, password: "FirstPass1" },
    });
    check(reg.status === 201, `register 201, got ${reg.status}`);
    check(reg.json.data.token, "access token returned");
    check(reg.cookie, "refresh cookie set on register");
    created.users.push(reg.json.data.user._id);
    const setCookie = reg.headers.getSetCookie().find((c) => c.startsWith("eb_rt="));
    check(/HttpOnly/i.test(setCookie), "refresh cookie is HttpOnly");
    check(/Path=\/api\/v1\/auth/i.test(setCookie), "refresh cookie scoped to /api/v1/auth");
    check(!JSON.stringify(reg.json).includes(reg.cookie), "refresh token never appears in the JSON body");
    console.log("✓ Register issues a short-lived access token + HttpOnly refresh cookie");

    const weak = await call("POST", "/auth/register", {
      body: { name: "Weak", email: `weak_${stamp}@example.com`, password: "password" },
    });
    check(weak.status === 400, `weak password 400, got ${weak.status}`);
    console.log("✓ Weak password rejected (needs 8+ chars with a letter and a number)");

    const noXhr = await call("POST", "/auth/refresh", { cookie: reg.cookie, xhr: false });
    check(noXhr.status === 403, `refresh without X-Requested-With 403, got ${noXhr.status}`);
    console.log("✓ Refresh without the CSRF header is rejected (403)");

    const r1 = await call("POST", "/auth/refresh", { cookie: reg.cookie });
    check(r1.status === 200 && r1.json.data.token && r1.json.data.user.email === email, "refresh returns token + user");
    check(r1.cookie && r1.cookie !== reg.cookie, "refresh rotates the cookie");
    console.log("✓ Refresh returns a new access token and rotates the refresh cookie");

    // Replay of the old token inside the grace window (parallel tabs) is tolerated
    const race = await call("POST", "/auth/refresh", { cookie: reg.cookie });
    check(race.status === 200, `parallel-tab refresh tolerated, got ${race.status}`);
    console.log("✓ Two tabs refreshing at once don't log the user out (grace window)");

    // Replay after the grace window = theft → whole family revoked
    await RefreshToken.updateOne(
      { revokedReason: "rotated", user: reg.json.data.user._id },
      { revokedAt: new Date(Date.now() - 5 * 60 * 1000) }
    );
    const oldest = await RefreshToken.findOne({ user: reg.json.data.user._id }).sort({ createdAt: 1 });
    check(oldest.revokedAt < new Date(Date.now() - 60 * 1000), "setup: oldest token aged past the grace window");
    const replay = await call("POST", "/auth/refresh", { cookie: reg.cookie });
    check(replay.status === 401, `replayed token 401, got ${replay.status}`);
    const stillLive = await call("POST", "/auth/refresh", { cookie: r1.cookie });
    check(stillLive.status === 401, `family revoked after reuse, got ${stillLive.status}`);
    console.log("✓ Replaying a rotated token revokes the whole session family (theft detection)");

    const garbage = await call("POST", "/auth/refresh", { cookie: "not-a-real-token" });
    check(garbage.status === 401, `garbage cookie 401, got ${garbage.status}`);
    const none = await call("POST", "/auth/refresh", {});
    check(none.status === 401, `no cookie 401, got ${none.status}`);
    console.log("✓ Missing or unknown refresh token → 401");

    const login = await call("POST", "/auth/login", { body: { email, password: "FirstPass1" } });
    check(login.status === 200 && login.cookie, "login issues cookie");
    const out = await call("POST", "/auth/logout", { cookie: login.cookie });
    check(out.status === 200 && out.cookie === null, "logout clears the cookie");
    const afterLogout = await call("POST", "/auth/refresh", { cookie: login.cookie });
    check(afterLogout.status === 401, `refresh after logout 401, got ${afterLogout.status}`);
    console.log("✓ Logout revokes the refresh token and clears the cookie");

    /* ---------------- Profile ---------------- */
    const s = await call("POST", "/auth/login", { body: { email, password: "FirstPass1" } });
    let token = s.json.data.token;

    const upd = await call("PATCH", "/auth/me", {
      token,
      body: { name: "Renamed Tester", phone: "+91 90000 11111" },
    });
    check(upd.status === 200 && upd.json.data.user.name === "Renamed Tester", "profile updated");
    check(upd.json.data.user.phone === "+91 90000 11111", "phone saved");
    console.log("✓ Profile: name and phone update");

    const urlAvatar = await call("PATCH", "/auth/me", { token, body: { avatar: "javascript:alert(1)" } });
    check(urlAvatar.status === 400, `avatar can't be set by URL, got ${urlAvatar.status}`);
    const roleEsc = await call("PATCH", "/auth/me", { token, body: { role: "admin" } });
    check(roleEsc.status === 400, `role in profile update 400, got ${roleEsc.status}`);
    const emailChange = await call("PATCH", "/auth/me", { token, body: { email: "x@y.com" } });
    check(emailChange.status === 400, `email in profile update 400, got ${emailChange.status}`);
    console.log("✓ Profile rejects avatar URLs, role and email changes (400)");

    /* ---------------- Avatar upload ---------------- */
    const put = (bytes, type = "image/webp", auth = token) =>
      fetch(`${base}/auth/me/avatar`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${auth}`, "Content-Type": type },
        body: bytes,
      });
    // Minimal WebP header + padding (the API checks magic bytes, not decodability)
    const webp = Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBPVP8 "), Buffer.alloc(200, 7)]);
    const up = await put(webp);
    const upJson = await up.json();
    check(up.status === 200, `avatar upload 200, got ${up.status}`);
    const avatarUrl = upJson.data.user.avatar;
    check(/^\/api\/v1\/avatars\/[a-f0-9]{24}\/[a-f0-9]{24}\.webp$/.test(avatarUrl), `avatar url shape: ${avatarUrl}`);
    const img = await fetch(`http://127.0.0.1:${server.address().port}${avatarUrl}`);
    const imgBytes = Buffer.from(await img.arrayBuffer());
    check(img.status === 200 && img.headers.get("content-type") === "image/webp", "avatar served as image/webp");
    check(imgBytes.equals(webp), "served bytes match upload");
    check(/immutable/.test(img.headers.get("cache-control") || ""), "avatar cached immutably");
    console.log("✓ Avatar upload stores the image and serves it with long-lived caching");

    const html = await put(Buffer.from("<html><script>alert(1)</script></html>".padEnd(100, " ")), "image/png");
    check(html.status === 400, `HTML disguised as PNG rejected, got ${html.status}`);
    const big = await put(Buffer.concat([webp, Buffer.alloc(400 * 1024)]));
    check(big.status === 413, `oversize upload 413, got ${big.status}`);
    const noAuth = await put(webp, "image/webp", "bad.token.here");
    check(noAuth.status === 401, `upload without valid token 401, got ${noAuth.status}`);
    const guess = await fetch(`http://127.0.0.1:${server.address().port}${avatarUrl.replace(/[a-f0-9]{24}\.webp$/, "0".repeat(24) + ".webp")}`);
    check(guess.status === 404, `guessed avatar key 404, got ${guess.status}`);
    console.log("✓ Avatar rejects non-images by content, oversize files, no auth, and guessed URLs");

    const reup = await (await put(webp)).json();
    check(reup.data.user.avatar !== avatarUrl, "new upload gets a new URL");
    const oldGone = await fetch(`http://127.0.0.1:${server.address().port}${avatarUrl}`);
    check(oldGone.status === 404, `old avatar URL retired, got ${oldGone.status}`);
    const del = await call("DELETE", "/auth/me/avatar", { token });
    check(del.status === 200 && del.json.data.user.avatar === "", "avatar removed");
    console.log("✓ Replacing or removing a photo retires the old URL");

    const me = await call("GET", "/auth/me", { token });
    for (const secret of ["password", "tokenVersion", "passwordResetTokenHash", "passwordResetExpires"]) {
      check(!(secret in me.json.data.user), `${secret} not exposed`);
    }
    console.log("✓ /auth/me never exposes password, token version or reset fields");

    /* ---------------- Change password ---------------- */
    const wrongCurrent = await call("PATCH", "/auth/change-password", {
      token,
      body: { currentPassword: "Nope12345", newPassword: "SecondPass2" },
    });
    check(wrongCurrent.status === 400, `wrong current password 400, got ${wrongCurrent.status}`);
    const same = await call("PATCH", "/auth/change-password", {
      token,
      body: { currentPassword: "FirstPass1", newPassword: "FirstPass1" },
    });
    check(same.status === 400, `same password 400, got ${same.status}`);

    const otherDevice = await call("POST", "/auth/login", { body: { email, password: "FirstPass1" } });
    const changed = await call("PATCH", "/auth/change-password", {
      token,
      body: { currentPassword: "FirstPass1", newPassword: "SecondPass2" },
    });
    check(changed.status === 200 && changed.json.data.token && changed.cookie, "change returns a fresh session");
    const oldAccess = await call("GET", "/auth/me", { token });
    check(oldAccess.status === 401, `old access token dead immediately, got ${oldAccess.status}`);
    const otherRefresh = await call("POST", "/auth/refresh", { cookie: otherDevice.cookie });
    check(otherRefresh.status === 401, `other device's refresh revoked, got ${otherRefresh.status}`);
    token = changed.json.data.token;
    const newAccess = await call("GET", "/auth/me", { token });
    check(newAccess.status === 200, "new access token works");
    const oldPwd = await call("POST", "/auth/login", { body: { email, password: "FirstPass1" } });
    check(oldPwd.status === 401, "old password no longer works");
    console.log("✓ Change password: needs current password, kills old tokens on every device, keeps this one signed in");

    /* ---------------- Forgot / reset ---------------- */
    clearOutbox();
    const unknown = await call("POST", "/auth/forgot-password", { body: { email: `nobody_${stamp}@example.com` } });
    const known = await call("POST", "/auth/forgot-password", { body: { email } });
    check(unknown.status === 200 && known.status === 200, "forgot-password always 200");
    check(unknown.json.message === known.json.message, "same message for known and unknown emails");
    const mail = getOutbox().filter((m) => m.to === email);
    check(mail.length === 1, `exactly one reset email, got ${mail.length}`);
    check(getOutbox().every((m) => !m.to.startsWith("nobody_")), "no email for unknown address");
    const rawToken = mail[0].text.match(/reset-password\/([a-f0-9]{64})/)?.[1];
    check(rawToken, "reset link contains a 64-hex token");
    const storedHash = (await User.findOne({ email }).select("+passwordResetTokenHash")).passwordResetTokenHash;
    check(storedHash && storedHash !== rawToken, "only a hash of the token is stored");
    console.log("✓ Forgot password: identical response for unknown emails, emails a one-time link, stores only a hash");

    const badToken = await call("POST", "/auth/reset-password", {
      body: { token: "a".repeat(64), password: "ThirdPass3" },
    });
    check(badToken.status === 400, `unknown reset token 400, got ${badToken.status}`);

    const reset = await call("POST", "/auth/reset-password", { body: { token: rawToken, password: "ThirdPass3" } });
    check(reset.status === 200, `reset 200, got ${reset.status}`);
    const reuse = await call("POST", "/auth/reset-password", { body: { token: rawToken, password: "FourthPass4" } });
    check(reuse.status === 400, `reset link single-use, got ${reuse.status}`);
    const afterReset = await call("GET", "/auth/me", { token });
    check(afterReset.status === 401, `sessions ended by reset, got ${afterReset.status}`);
    const loginNew = await call("POST", "/auth/login", { body: { email, password: "ThirdPass3" } });
    check(loginNew.status === 200, "login with the new password");
    console.log("✓ Reset password: works once, ends every existing session, new password logs in");

    clearOutbox();
    await call("POST", "/auth/forgot-password", { body: { email } });
    const expToken = getOutbox()[0].text.match(/reset-password\/([a-f0-9]{64})/)[1];
    await User.updateOne({ email }, { passwordResetExpires: new Date(Date.now() - 1000) });
    const expired = await call("POST", "/auth/reset-password", { body: { token: expToken, password: "FifthPass5" } });
    check(expired.status === 400, `expired link 400, got ${expired.status}`);
    console.log("✓ Expired reset link is rejected");

    /* ---------------- Demo account protection ---------------- */
    process.env.DEMO_PROTECTED_EMAILS = "student@edubatch.com";
    const demo = await call("POST", "/auth/login", { body: { email: "student@edubatch.com", password: "Student@123" } });
    const demoChange = await call("PATCH", "/auth/change-password", {
      token: demo.json.data.token,
      body: { currentPassword: "Student@123", newPassword: "Hijacked123" },
    });
    check(demoChange.status === 403, `demo password locked, got ${demoChange.status}`);
    clearOutbox();
    const demoForgot = await call("POST", "/auth/forgot-password", { body: { email: "student@edubatch.com" } });
    check(demoForgot.status === 200 && getOutbox().length === 0, "demo account gets no reset email");
    delete process.env.DEMO_PROTECTED_EMAILS;
    console.log("✓ Shared demo accounts can't have their password changed or reset");

    /* ---------------- Admin user management ---------------- */
    const admin = await call("POST", "/auth/login", { body: { email: "admin@edubatch.com", password: "Admin@123" } });
    const adminToken = admin.json.data.token;
    const studentToken = demo.json.data.token;

    const denied = await call("GET", "/users", { token: studentToken });
    check(denied.status === 403, `student listing users 403, got ${denied.status}`);

    clearOutbox();
    const teacherEmail = `teacher_${stamp}@example.com`;
    const newTeacher = await call("POST", "/users", {
      token: adminToken,
      body: { name: "New Teacher", email: teacherEmail, role: "teacher", password: "TeachPass9" },
    });
    check(newTeacher.status === 201 && newTeacher.json.data.user.role === "teacher", "admin creates teacher");
    created.users.push(newTeacher.json.data.user._id);
    await sleep(50);
    const welcome = getOutbox().find((m) => m.to === teacherEmail);
    check(welcome && !welcome.text.includes("TeachPass9"), "welcome email sent without the password");

    const asAdmin = await call("POST", "/users", {
      token: adminToken,
      body: { name: "Sneaky", email: `sneaky_${stamp}@example.com`, role: "admin", password: "AdminPass9" },
    });
    check(asAdmin.status === 400, `creating an admin via API 400, got ${asAdmin.status}`);
    const dup = await call("POST", "/users", {
      token: adminToken,
      body: { name: "Dup", email: teacherEmail, role: "student", password: "DupPass99" },
    });
    check(dup.status === 409, `duplicate email 409, got ${dup.status}`);

    const list = await call("GET", `/users?role=teacher&search=${encodeURIComponent("New Teacher")}`, {
      token: adminToken,
    });
    check(list.status === 200 && list.json.data.users.some((u) => u.email === teacherEmail), "search finds teacher");
    check(list.json.data.users.every((u) => !("password" in u)), "no passwords in user list");
    console.log("✓ Admin creates teacher/student accounts (not admins), welcome email carries no password");

    const tLogin = await call("POST", "/auth/login", { body: { email: teacherEmail, password: "TeachPass9" } });
    check(tLogin.status === 200, "new teacher can log in");

    const batch = await Batch.create({
      name: `Upcoming Test ${stamp}`,
      subject: "Physics",
      capacity: 10,
      fee: 2000,
      teacher: newTeacher.json.data.user._id,
      status: "active",
      schedule: { days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], startTime: "23:58", endTime: "23:59" },
      createdBy: admin.json.data.user._id,
    });
    created.batches.push(batch._id);

    const blocked = await call("PATCH", `/users/${newTeacher.json.data.user._id}/status`, {
      token: adminToken,
      body: { isActive: false },
    });
    check(blocked.status === 409, `teacher with open batches can't be deactivated, got ${blocked.status}`);

    const self = await call("PATCH", `/users/${admin.json.data.user._id}/status`, {
      token: adminToken,
      body: { isActive: false },
    });
    check(self.status === 400, `admin can't deactivate self, got ${self.status}`);
    console.log("✓ Deactivation guards: not yourself, not admins, not a teacher who still has open batches");

    /* ---------------- Dashboards ---------------- */
    const tDash = await call("GET", "/dashboard/teacher", { token: tLogin.json.data.token });
    check(Array.isArray(tDash.json.data.upcomingClasses), "teacher dashboard has upcomingClasses");
    check(
      tDash.json.data.upcomingClasses.some((c) => c.batch.name === batch.name),
      "teacher sees their scheduled class"
    );
    console.log("✓ Teacher dashboard lists upcoming classes from the batch schedule");

    // Revenue is frozen at the amount received, even if the fee changes later
    const stuEmail = `payer_${stamp}@example.com`;
    const payer = await call("POST", "/users", {
      token: adminToken,
      body: { name: "Payer", email: stuEmail, role: "student", password: "PayerPass1" },
    });
    created.users.push(payer.json.data.user._id);
    const before = (await call("GET", "/dashboard/admin", { token: adminToken })).json.data.fees.collected;
    const enr = await call("POST", "/enrollments", {
      token: adminToken,
      body: { student: payer.json.data.user._id, batch: batch._id.toString(), paymentStatus: "paid" },
    });
    check(enr.status === 201, `enroll paid offline, got ${enr.status}`);
    check(enr.json.data.enrollment.amountPaid === 2000, "offline payment freezes amountPaid = fee");
    const afterPay = (await call("GET", "/dashboard/admin", { token: adminToken })).json.data.fees.collected;
    check(afterPay - before === 2000, `revenue +2000, got ${afterPay - before}`);
    await Batch.updateOne({ _id: batch._id }, { fee: 9999 });
    const afterFeeEdit = (await call("GET", "/dashboard/admin", { token: adminToken })).json.data.fees.collected;
    check(afterFeeEdit === afterPay, `fee edit doesn't rewrite revenue (${afterFeeEdit} vs ${afterPay})`);
    await call("DELETE", `/enrollments/${enr.json.data.enrollment._id}`, { token: adminToken });
    const afterDrop = (await call("GET", "/dashboard/admin", { token: adminToken })).json.data.fees.collected;
    check(afterDrop === afterPay, `dropping a paid student keeps revenue (${afterDrop} vs ${afterPay})`);
    console.log("✓ Revenue = money received: unaffected by later fee edits or dropping a paid student");

    const analytics = await call("GET", "/dashboard/admin/analytics?months=6", { token: adminToken });
    check(analytics.status === 200 && analytics.json.data.months.length === 6, "analytics returns 6 months");
    const thisMonth = analytics.json.data.months.at(-1);
    check(thisMonth.offline >= 2000 && thisMonth.revenue >= thisMonth.offline, "this month's offline revenue includes the paid seat");
    check(analytics.json.data.months.every((m) => /^\d{4}-\d{2}$/.test(m.month) && m.label), "month keys and labels");
    const denied2 = await call("GET", "/dashboard/admin/analytics", { token: tLogin.json.data.token });
    check(denied2.status === 403, `teacher can't read analytics, got ${denied2.status}`);
    console.log("✓ Admin analytics: month-by-month revenue, enrollments, attendance; admin only");

    /* ---------------- Deactivation ends sessions ---------------- */
    const pLogin = await call("POST", "/auth/login", { body: { email: stuEmail, password: "PayerPass1" } });
    const deact = await call("PATCH", `/users/${payer.json.data.user._id}/status`, {
      token: adminToken,
      body: { isActive: false },
    });
    check(deact.status === 200 && deact.json.data.user.isActive === false, "student deactivated");
    const deadAccess = await call("GET", "/auth/me", { token: pLogin.json.data.token });
    check(deadAccess.status === 401 || deadAccess.status === 403, `deactivated access token rejected, got ${deadAccess.status}`);
    const deadRefresh = await call("POST", "/auth/refresh", { cookie: pLogin.cookie });
    check(deadRefresh.status === 401, `deactivated refresh rejected, got ${deadRefresh.status}`);
    const deadLogin = await call("POST", "/auth/login", { body: { email: stuEmail, password: "PayerPass1" } });
    check(deadLogin.status === 403, `deactivated login 403, got ${deadLogin.status}`);
    const react = await call("PATCH", `/users/${payer.json.data.user._id}/status`, {
      token: adminToken,
      body: { isActive: true },
    });
    check(react.status === 200 && react.json.data.user.isActive, "reactivated");
    console.log("✓ Deactivating a user ends their sessions immediately; reactivating restores login");

    /* ---------------- logout-all ---------------- */
    const d1 = await call("POST", "/auth/login", { body: { email, password: "ThirdPass3" } });
    const d2 = await call("POST", "/auth/login", { body: { email, password: "ThirdPass3" } });
    const all = await call("POST", "/auth/logout-all", { token: d1.json.data.token });
    check(all.status === 200, "logout-all 200");
    check((await call("GET", "/auth/me", { token: d2.json.data.token })).status === 401, "other device access dead");
    check((await call("POST", "/auth/refresh", { cookie: d2.cookie })).status === 401, "other device refresh dead");
    console.log("✓ Sign out of all devices revokes every session");

    console.log("\nALL ACCOUNT / SESSION / USER TESTS PASSED ✓");
  } catch (error) {
    console.error("Test failure:", error.message);
    process.exitCode = 1;
  } finally {
    await Enrollment.deleteMany({ batch: { $in: created.batches } });
    await Batch.deleteMany({ _id: { $in: created.batches } });
    await RefreshToken.deleteMany({ user: { $in: created.users } });
    await Avatar.deleteMany({ user: { $in: created.users } });
    await User.deleteMany({ _id: { $in: created.users } });
    await User.deleteMany({ email: { $regex: `_${stamp}@example\\.com$` } });
    server.close();
    await mongoose.connection.close();
    process.exit(process.exitCode || 0);
  }
};

run();
