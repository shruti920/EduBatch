import "dotenv/config";
import "./_assertSafeDb.js";
import crypto from "crypto";

// This script never talks to Razorpay. It fills in test-only secrets (if none are
// set) and replaces the SDK's two network calls with local stand-ins, so every
// other part of the real flow runs: order reuse, signature checks, idempotent
// "mark paid", webhooks, duplicate events and the manual status check.
process.env.RAZORPAY_KEY_ID ||= "rzp_test_localscript";
process.env.RAZORPAY_KEY_SECRET ||= "local_script_key_secret";
process.env.RAZORPAY_WEBHOOK_SECRET ||= "local_script_webhook_secret";

const { default: app } = await import("../app.js");
const { default: connectDB } = await import("../config/db.js");
const { getRazorpay } = await import("../config/razorpay.js");
const { default: User } = await import("../models/User.js");
const { default: Batch } = await import("../models/Batch.js");
const { default: Enrollment } = await import("../models/Enrollment.js");
const { default: Payment } = await import("../models/Payment.js");
const { default: WebhookEvent } = await import("../models/WebhookEvent.js");
const { signToken } = await import("../utils/jwt.js");

const hmac = (secret, msg) => crypto.createHmac("sha256", secret).update(msg).digest("hex");
const randomId = (prefix) => `${prefix}_${crypto.randomBytes(7).toString("hex")}`;

// --- Razorpay SDK stand-ins ---
const razorpay = getRazorpay();
let ordersCreated = 0;
let fakeOrderPayments = {}; // orderId -> [payment entities] returned by fetchPayments
razorpay.orders.create = async ({ amount, currency, receipt }) => {
  ordersCreated += 1;
  return { id: randomId("order"), amount, currency, receipt, status: "created" };
};
razorpay.orders.fetchPayments = async (orderId) => ({ items: fakeOrderPayments[orderId] || [] });

let passed = 0;
const check = (label, condition, detail) => {
  if (condition) {
    passed += 1;
    console.log(`✓ ${label}`);
  } else {
    console.error(`✗ ${label} FAILED`, detail ?? "");
    throw new Error(label);
  }
};

const run = async () => {
  await connectDB();
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api/v1`;
  const created = { users: [], batches: [], enrollments: [], events: [] };

  const call = async (method, path, token, body, headers = {}) => {
    const res = await fetch(base + path, {
      method,
      headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }), ...headers },
      body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
    });
    return [res.status, await res.json()];
  };

  try {
    const admin = await User.findOne({ email: "admin@edubatch.com" });
    const teacher = await User.findOne({ email: "teacher@edubatch.com" });
    const adminToken = signToken({ id: admin._id, role: "admin" });
    const teacherToken = signToken({ id: teacher._id, role: "teacher" });

    const makeStudent = async (tag) => {
      const u = await User.create({
        name: `Pay Test ${tag}`,
        email: `pay_${tag}_${Date.now()}@edubatch.test`,
        password: "x".repeat(60),
        role: "student",
      });
      created.users.push(u._id);
      return [u, signToken({ id: u._id, role: "student" })];
    };

    const batch = await Batch.create({
      name: `Payment Test Batch ${Date.now()}`,
      subject: "Physics",
      capacity: 10,
      fee: 1500,
      teacher: teacher._id,
      createdBy: admin._id,
      status: "active",
    });
    created.batches.push(batch._id);

    const [s1, s1Token] = await makeStudent("a");
    const [s2, s2Token] = await makeStudent("b");
    const e1 = await Enrollment.create({ student: s1._id, batch: batch._id });
    const e2 = await Enrollment.create({ student: s2._id, batch: batch._id });
    created.enrollments.push(e1._id, e2._id);

    // --- create-order ---
    let [st, body] = await call("POST", "/payments/create-order", teacherToken, { enrollmentId: e1._id.toString() });
    check("Teacher can't create an order (403)", st === 403, body);

    [st, body] = await call("POST", "/payments/create-order", s2Token, { enrollmentId: e1._id.toString() });
    check("Student can't pay for someone else's enrollment (404)", st === 404, body);

    [st, body] = await call("POST", "/payments/create-order", s1Token, { enrollmentId: e1._id.toString() });
    check("Order created with amount from the server (₹1500 → 150000 paise)", st === 201 && body.data.amount === 150000, body);
    check("Key ID returned, key secret never returned", body.data.keyId && !JSON.stringify(body).includes(process.env.RAZORPAY_KEY_SECRET));
    const order1 = body.data.orderId;

    [st, body] = await call("POST", "/payments/create-order", s1Token, { enrollmentId: e1._id.toString() });
    check("Second click reuses the same open order (no duplicate Razorpay order)", body.data.orderId === order1 && ordersCreated === 1, body);

    // --- verify ---
    const payId = randomId("pay");
    [st, body] = await call("POST", "/payments/verify", s1Token, {
      razorpay_order_id: order1,
      razorpay_payment_id: payId,
      razorpay_signature: hmac("wrong_secret", `${order1}|${payId}`),
    });
    let e1Now = await Enrollment.findById(e1._id);
    check("Tampered signature rejected and fee stays pending", st === 400 && e1Now.paymentStatus === "pending", body);

    const goodSig = hmac(process.env.RAZORPAY_KEY_SECRET, `${order1}|${payId}`);
    [st, body] = await call("POST", "/payments/verify", s2Token, {
      razorpay_order_id: order1,
      razorpay_payment_id: payId,
      razorpay_signature: goodSig,
    });
    check("Another student can't verify this order (404)", st === 404, body);

    [st, body] = await call("POST", "/payments/verify", s1Token, {
      razorpay_order_id: order1,
      razorpay_payment_id: payId,
      razorpay_signature: goodSig,
    });
    e1Now = await Enrollment.findById(e1._id);
    check(
      "Valid signature marks payment and enrollment paid",
      st === 200 && body.data.payment.status === "paid" && e1Now.paymentStatus === "paid" && e1Now.payment,
      body
    );
    check("Signature is not sent back to the client", !("razorpaySignature" in body.data.payment));

    [st, body] = await call("POST", "/payments/verify", s1Token, {
      razorpay_order_id: order1,
      razorpay_payment_id: payId,
      razorpay_signature: goodSig,
    });
    check("Verifying twice is harmless (idempotent)", st === 200 && (await Payment.countDocuments({ enrollment: e1._id, status: "paid" })) === 1, body);

    [st, body] = await call("POST", "/payments/create-order", s1Token, { enrollmentId: e1._id.toString() });
    check("Can't create an order for a fee that's already paid (409)", st === 409, body);

    [st, body] = await call("PATCH", `/enrollments/${e1._id}/status`, adminToken, { paymentStatus: "pending" });
    check("Admin can't flip an online-paid fee back to pending (409)", st === 409, body);

    // --- webhook ---
    [st, body] = await call("POST", "/payments/create-order", s2Token, { enrollmentId: e2._id.toString() });
    const order2 = body.data.orderId;

    const webhook = (payload, eventId, secret = process.env.RAZORPAY_WEBHOOK_SECRET) => {
      created.events.push(eventId);
      const raw = JSON.stringify(payload);
      return call("POST", "/payments/webhook", null, raw, {
        "x-razorpay-signature": hmac(secret, raw),
        "x-razorpay-event-id": eventId,
      });
    };
    const capturedEvent = (orderId, amount) => ({
      event: "payment.captured",
      payload: { payment: { entity: { id: randomId("pay"), order_id: orderId, amount, status: "captured", method: "upi" } } },
    });

    [st, body] = await webhook(capturedEvent(order2, 150000), randomId("evt"), "not_the_secret");
    check("Webhook with a bad signature is rejected (400)", st === 400, body);

    [st, body] = await webhook(capturedEvent(order2, 1), randomId("evt"));
    let p2 = await Payment.findOne({ razorpayOrderId: order2 });
    check("Webhook with the wrong amount doesn't mark paid", st === 200 && p2.status === "created", p2?.status);

    const eventId = randomId("evt");
    [st, body] = await webhook(capturedEvent(order2, 150000), eventId);
    p2 = await Payment.findOne({ razorpayOrderId: order2 });
    const e2Now = await Enrollment.findById(e2._id);
    check(
      "Signed payment.captured webhook marks paid even without /verify",
      st === 200 && p2.status === "paid" && p2.verifiedVia === "webhook" && e2Now.paymentStatus === "paid",
      p2
    );

    [st, body] = await webhook(capturedEvent(order2, 150000), eventId);
    check("Duplicate webhook delivery is ignored", st === 200 && body.message.includes("Duplicate"), body);

    [st, body] = await webhook(
      { event: "payment.failed", payload: { payment: { entity: { id: randomId("pay"), order_id: order2, amount: 150000, status: "failed", error_description: "Declined" } } } },
      randomId("evt")
    );
    p2 = await Payment.findOne({ razorpayOrderId: order2 });
    check("A late payment.failed event can't undo a paid payment", p2.status === "paid", p2.status);

    // --- failure + retry + manual sync ---
    const [s3, s3Token] = await makeStudent("c");
    const e3 = await Enrollment.create({ student: s3._id, batch: batch._id });
    created.enrollments.push(e3._id);
    [st, body] = await call("POST", "/payments/create-order", s3Token, { enrollmentId: e3._id.toString() });
    const order3 = body.data.orderId;

    [st, body] = await call("POST", "/payments/failure", s3Token, { razorpay_order_id: order3, reason: "Bank declined" });
    let p3 = await Payment.findOne({ razorpayOrderId: order3 });
    check("Failed attempt is recorded", st === 200 && p3.status === "failed" && p3.failureReason === "Bank declined", p3);

    [st, body] = await call("POST", "/payments/create-order", s3Token, { enrollmentId: e3._id.toString() });
    check("Retry reopens the same order instead of creating a new one", body.data.orderId === order3, body);

    fakeOrderPayments[order3] = [{ id: randomId("pay"), status: "captured", amount: 150000, method: "card" }];
    [st, body] = await call("POST", `/payments/${p3._id}/sync`, s3Token);
    check("Manual status check confirms a payment Razorpay captured", st === 200 && body.data.payment.status === "paid", body);

    // --- history ---
    [st, body] = await call("GET", "/payments/history", s1Token);
    check("Student history only contains their own payments", st === 200 && body.data.payments.every((p) => p.student._id === s1._id.toString()), body);

    [st, body] = await call("GET", "/payments/history", adminToken);
    check(
      "Admin summary counts and totals paid payments (3 × ₹1500 at least)",
      st === 200 && body.data.summary.paidCount >= 3 && body.data.summary.collected >= 4500,
      body.data?.summary
    );

    [st, body] = await call("GET", "/payments/history", teacherToken);
    check("Teachers can't see payments (403)", st === 403, body);

    console.log(`\nALL ${passed} PAYMENT TESTS PASSED ✓`);
  } finally {
    await Payment.deleteMany({ enrollment: { $in: created.enrollments } });
    await Enrollment.deleteMany({ _id: { $in: created.enrollments } });
    await Batch.deleteMany({ _id: { $in: created.batches } });
    await User.deleteMany({ _id: { $in: created.users } });
    await WebhookEvent.deleteMany({ eventId: { $in: created.events } });
    server.close();
  }
};

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Payment tests failed:", err.message);
    process.exit(1);
  });
