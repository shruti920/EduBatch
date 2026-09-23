import "dotenv/config";
import "./_assertSafeDb.js";
import app from "../app.js";
import connectDB from "../config/db.js";
import User from "../models/User.js";
import Batch from "../models/Batch.js";
import Enrollment from "../models/Enrollment.js";
import Notice from "../models/Notice.js";
import { signToken } from "../utils/jwt.js";

let passed = 0;
const check = (label, condition, detail) => {
  if (!condition) {
    console.error(`✗ ${label} FAILED`, detail ?? "");
    throw new Error(label);
  }
  passed += 1;
  console.log(`✓ ${label}`);
};

const run = async () => {
  await connectDB();
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api/v1/notices`;
  const created = { users: [], batches: [], enrollments: [] };

  const call = async (method, path, token, body) => {
    const res = await fetch(base + path, {
      method,
      headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return [res.status, await res.json()];
  };

  try {
    const admin = await User.findOne({ email: "admin@edubatch.com" });
    const teacher = await User.findOne({ email: "teacher@edubatch.com" });
    const tokenFor = (u) => signToken({ id: u._id, role: u.role });

    const makeUser = async (role, tag) => {
      const u = await User.create({
        name: `Notice ${tag}`,
        email: `notice_${tag}_${Date.now()}@edubatch.test`,
        password: "x".repeat(60),
        role,
      });
      created.users.push(u._id);
      return u;
    };
    const makeBatch = async (owner, status = "active") => {
      const b = await Batch.create({
        name: `Notice Test Batch ${Date.now()}${Math.random()}`,
        subject: "Physics",
        capacity: 10,
        fee: 0,
        teacher: owner._id,
        createdBy: admin._id,
        status,
      });
      created.batches.push(b._id);
      return b;
    };

    const otherTeacher = await makeUser("teacher", "t2");
    const studentA = await makeUser("student", "a");
    const studentB = await makeUser("student", "b");
    const batchA = await makeBatch(teacher);
    const batchB = await makeBatch(otherTeacher);
    const eA = await Enrollment.create({ student: studentA._id, batch: batchA._id });
    const eB = await Enrollment.create({ student: studentB._id, batch: batchB._id });
    created.enrollments.push(eA._id, eB._id);

    const [adminT, teacherT, otherT, studentAT, studentBT] = [admin, teacher, otherTeacher, studentA, studentB].map(tokenFor);

    // --- who can post where ---
    let [st, body] = await call("POST", "/", studentAT, { batch: batchA._id.toString(), title: "Hello", body: "Hi" });
    check("Students can't post notices (403)", st === 403, body);

    [st, body] = await call("POST", "/", teacherT, { title: "To everyone", body: "Hi all" });
    check("Teachers can't post to everyone (403)", st === 403, body);

    [st, body] = await call("POST", "/", teacherT, { batch: batchB._id.toString(), title: "Wrong batch", body: "x" });
    check("Teachers can't post to another teacher's batch (403)", st === 403, body);

    [st, body] = await call("POST", "/", teacherT, { batch: batchA._id.toString(), title: "Hi", body: "x" });
    check("Validation: title too short (400)", st === 400, body);

    [st, body] = await call("POST", "/", teacherT, { batch: batchA._id.toString(), title: "Long body", body: "x".repeat(2001) });
    check("Validation: message over 2000 characters (400)", st === 400, body);

    [st, body] = await call("POST", "/", teacherT, {
      batch: batchA._id.toString(),
      title: "Test on Friday",
      body: "Chapters 1–3.\n<script>alert(1)</script>",
    });
    check("Teacher posts to own batch (201)", st === 201 && body.data.notice.batch.name === batchA.name, body);
    const batchNoticeId = body.data.notice._id;
    check("Message is stored as plain text, unchanged", body.data.notice.body.includes("<script>alert(1)</script>"));

    [st, body] = await call("POST", "/", adminT, { title: "Institute closed Monday", body: "Holiday.", pinned: true });
    check("Admin posts a pinned notice to everyone (201)", st === 201 && body.data.notice.batch === null, body);
    const globalNoticeId = body.data.notice._id;

    [st, body] = await call("POST", "/", otherT, { batch: batchB._id.toString(), title: "Batch B only", body: "For B" });
    const batchBNoticeId = body.data.notice._id;

    // --- visibility (spec checkpoint) ---
    const idsFor = async (token) => (await call("GET", "/", token))[1].data.notices.map((n) => n._id);

    let ids = await idsFor(studentAT);
    check(
      "Enrolled student sees their batch's notice and the everyone notice, not batch B's",
      ids.includes(batchNoticeId) && ids.includes(globalNoticeId) && !ids.includes(batchBNoticeId),
      ids
    );
    check("Pinned notice is listed first", ids[0] === globalNoticeId, ids);

    ids = await idsFor(studentBT);
    check("Student in another batch doesn't see batch A's notice", !ids.includes(batchNoticeId) && ids.includes(batchBNoticeId), ids);

    ids = await idsFor(teacherT);
    check("Teacher sees own batch + everyone notices, not other batches", ids.includes(batchNoticeId) && !ids.includes(batchBNoticeId), ids);

    ids = await idsFor(adminT);
    check("Admin sees all notices", [batchNoticeId, globalNoticeId, batchBNoticeId].every((i) => ids.includes(i)), ids);

    // --- unread count ---
    [st, body] = await call("GET", "/unread-count", studentAT);
    check("Unread count = 2 for student A before opening notices", body.data.count === 2, body);
    await call("POST", "/seen", studentAT);
    [st, body] = await call("GET", "/unread-count", studentAT);
    check("Unread count = 0 after marking seen", body.data.count === 0, body);
    [st, body] = await call("GET", "/unread-count", teacherT);
    // Teacher A has 1 unread (the admin's), not their own batch notice
    check("Your own posts don't count as unread", body.data.count >= 1 && body.data.count < (await idsFor(teacherT)).length, body);

    // --- expiry ---
    const expired = await Notice.create({
      batch: batchA._id,
      title: "Old news",
      body: "Expired",
      createdBy: teacher._id,
      expiresAt: new Date(Date.now() - 60_000),
    });
    ids = await idsFor(studentAT);
    check("Expired notices are hidden from students", !ids.includes(expired._id.toString()), ids);

    [st, body] = await call("POST", "/", teacherT, {
      batch: batchA._id.toString(),
      title: "Past expiry",
      body: "x",
      expiresAt: "2020-01-01",
    });
    check("“Show until” in the past is rejected (400)", st === 400, body);

    // --- edit / delete ---
    [st, body] = await call("PATCH", `/${batchNoticeId}`, otherT, { title: "Hijacked" });
    check("Another teacher can't edit (403)", st === 403, body);

    [st, body] = await call("PATCH", `/${batchNoticeId}`, teacherT, { title: "Test moved to Saturday", pinned: true });
    check("Author edits and pins their notice", st === 200 && body.data.notice.title === "Test moved to Saturday" && body.data.notice.pinned, body);

    [st, body] = await call("PATCH", `/${globalNoticeId}`, teacherT, { title: "Not mine" });
    check("Teacher can't edit the admin's notice (403)", st === 403, body);

    [st, body] = await call("DELETE", `/${batchBNoticeId}`, adminT);
    check("Admin can delete any notice", st === 200 && !(await Notice.exists({ _id: batchBNoticeId })), body);

    // --- dropped student / archived batch ---
    await Enrollment.updateOne({ _id: eA._id }, { isActive: false });
    ids = await idsFor(studentAT);
    check("Dropped student stops seeing that batch's notices", !ids.includes(batchNoticeId) && ids.includes(globalNoticeId), ids);

    await Enrollment.updateOne({ _id: eA._id }, { isActive: true });
    await Batch.updateOne({ _id: batchA._id }, { status: "archived", isArchived: true });
    ids = await idsFor(studentAT);
    check("Archived batch's notices are hidden from students", !ids.includes(batchNoticeId), ids);

    console.log(`\nALL ${passed} NOTICE TESTS PASSED ✓`);
  } finally {
    await Notice.deleteMany({ $or: [{ batch: { $in: created.batches } }, { createdBy: { $in: created.users } }, { title: "Institute closed Monday" }] });
    await Enrollment.deleteMany({ _id: { $in: created.enrollments } });
    await Batch.deleteMany({ _id: { $in: created.batches } });
    await User.deleteMany({ _id: { $in: created.users } });
    server.close();
  }
};

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Notice tests failed:", err.message);
    process.exit(1);
  });
