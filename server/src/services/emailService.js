import nodemailer from "nodemailer";
import { appUrl } from "../config/env.js";

/**
 * Transactional email over SMTP (Nodemailer).
 *
 * - SMTP_HOST set          → real delivery (Gmail locally, Brevo/Mailtrap/etc. in production)
 * - SMTP_HOST missing, or
 *   EMAIL_TRANSPORT=log    → nothing is sent; the email is printed to the server log and kept
 *                            in an in-memory outbox (the test suites read reset links from it)
 *
 * Render's free tier blocks outbound ports 25/465/587, so in production use a provider
 * that accepts SMTP on port 2525 (e.g. Brevo: smtp-relay.brevo.com:2525). See README.
 *
 * Sending never throws into the caller: a mail outage must not fail a payment or a signup.
 */

let transporter = null;
const outbox = [];
const OUTBOX_LIMIT = 50;

const useLogTransport = () => process.env.EMAIL_TRANSPORT === "log" || !process.env.SMTP_HOST;

const getTransporter = () => {
  if (transporter) return transporter;
  const port = Number(process.env.SMTP_PORT || 587);
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    // Fail fast instead of hanging a request for minutes when a port is blocked
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  return transporter;
};

const fromAddress = () => process.env.EMAIL_FROM || "EduBatch <no-reply@edubatch.local>";

export const escapeHtml = (value = "") =>
  String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const inr = (rupees) => `₹${Number(rupees || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

// Minimal, inline-styled layout that renders in every mail client
const layout = (title, bodyHtml) => `<!doctype html>
<html><body style="margin:0;background:#f4f6fa;font-family:Arial,Helvetica,sans-serif;color:#1f2937">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border:1px solid #d9e0ec;border-radius:6px">
<tr><td style="padding:20px 24px;border-bottom:1px solid #de4f5a;font-family:Georgia,serif;font-size:20px;font-weight:bold;color:#1f3494"><span style="display:inline-block;width:26px;height:26px;line-height:26px;margin-right:8px;border:2px solid #1f3494;border-radius:6px;text-align:center;font-size:16px">E</span>EduBatch</td></tr>
<tr><td style="padding:24px">
<h1 style="margin:0 0 12px;font-size:20px;color:#1f3494">${escapeHtml(title)}</h1>
${bodyHtml}
</td></tr>
<tr><td style="padding:16px 24px;border-top:1px solid #d9e0ec;font-size:12px;color:#6b7280">This is an automated message from EduBatch. Please don't reply.</td></tr>
</table></td></tr></table></body></html>`;

const button = (href, label) =>
  `<p style="margin:20px 0"><a href="${escapeHtml(href)}" style="background:#1f3494;color:#fff;text-decoration:none;padding:10px 18px;border-radius:4px;display:inline-block">${escapeHtml(label)}</a></p>`;

const row = (label, value) =>
  `<tr><td style="padding:6px 0;color:#6b7280;font-size:14px">${escapeHtml(label)}</td><td style="padding:6px 0;text-align:right;font-size:14px;font-weight:bold">${escapeHtml(value)}</td></tr>`;

/**
 * Low-level send. Returns { delivered, transport } and never throws.
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  const message = { from: fromAddress(), to, subject, html, text };

  if (useLogTransport()) {
    outbox.push({ ...message, sentAt: new Date() });
    if (outbox.length > OUTBOX_LIMIT) outbox.shift();
    if (process.env.EMAIL_LOG_QUIET !== "true") {
      console.log(`\n📧 [email:log] To: ${to}\n   Subject: ${subject}\n   ${text.replace(/\n/g, "\n   ")}\n`);
    }
    return { delivered: false, transport: "log" };
  }

  try {
    await getTransporter().sendMail(message);
    return { delivered: true, transport: "smtp" };
  } catch (error) {
    console.error(`Email to ${to} failed (${subject}):`, error.message);
    return { delivered: false, transport: "smtp", error: error.message };
  }
};

/** Fire-and-forget wrapper for side-effect emails (receipts, notifications). */
export const sendInBackground = (promiseFactory) => {
  Promise.resolve()
    .then(promiseFactory)
    .catch((error) => console.error("Background email failed:", error.message));
};

// Test helpers (log transport only)
export const getOutbox = () => [...outbox];
export const clearOutbox = () => {
  outbox.length = 0;
};

/* ---------------- Templates ---------------- */

export const sendPasswordResetEmail = (user, rawToken, ttlMinutes) => {
  const link = `${appUrl()}/reset-password/${rawToken}`;
  return sendEmail({
    to: user.email,
    subject: "Reset your EduBatch password",
    text: `Hi ${user.name},\n\nUse this link to set a new password. It expires in ${ttlMinutes} minutes and works once:\n${link}\n\nIf you didn't ask for this, ignore this email — your password stays the same.`,
    html: layout(
      "Reset your password",
      `<p>Hi ${escapeHtml(user.name)},</p>
       <p>We received a request to reset your EduBatch password. This link expires in ${ttlMinutes} minutes and can be used once.</p>
       ${button(link, "Set a new password")}
       <p style="font-size:13px;color:#6b7280">Or paste this into your browser:<br>${escapeHtml(link)}</p>
       <p style="font-size:13px;color:#6b7280">If you didn't ask for this, ignore this email. Your password stays the same.</p>`
    ),
  });
};

export const sendPasswordChangedEmail = (user) =>
  sendEmail({
    to: user.email,
    subject: "Your EduBatch password was changed",
    text: `Hi ${user.name},\n\nYour EduBatch password was just changed and you were signed out of all other devices.\nIf this wasn't you, reset your password immediately: ${appUrl()}/forgot-password`,
    html: layout(
      "Your password was changed",
      `<p>Hi ${escapeHtml(user.name)},</p>
       <p>Your EduBatch password was just changed, and every other device was signed out.</p>
       <p>If this wasn't you, reset your password right away.</p>
       ${button(`${appUrl()}/forgot-password`, "Reset password")}`
    ),
  });

export const sendWelcomeEmail = (user, createdByName) =>
  sendEmail({
    to: user.email,
    subject: "Your EduBatch account is ready",
    text: `Hi ${user.name},\n\n${createdByName} created a ${user.role} account for you on EduBatch.\nYour institute will share your first password with you. After logging in, change it from your Profile page.\nLog in: ${appUrl()}/login\nForgot it? ${appUrl()}/forgot-password`,
    html: layout(
      "Your account is ready",
      `<p>Hi ${escapeHtml(user.name)},</p>
       <p>${escapeHtml(createdByName)} created a <strong>${escapeHtml(user.role)}</strong> account for you on EduBatch.</p>
       <p>Your institute will share your first password with you. After logging in, change it from your Profile page.</p>
       ${button(`${appUrl()}/login`, "Log in")}`
    ),
  });

export const sendEnrollmentEmail = (student, batch) =>
  sendEmail({
    to: student.email,
    subject: `You're enrolled in ${batch.name}`,
    text: `Hi ${student.name},\n\nYou have been enrolled in ${batch.name} (${batch.subject}).\nFee: ${inr(batch.fee)}\nView your batches and pay fees: ${appUrl()}/student`,
    html: layout(
      "Enrollment confirmed",
      `<p>Hi ${escapeHtml(student.name)},</p>
       <p>You have been enrolled in <strong>${escapeHtml(batch.name)}</strong>.</p>
       <table role="presentation" width="100%">${row("Subject", batch.subject)}${row("Fee", inr(batch.fee))}</table>
       ${button(`${appUrl()}/student`, "Open dashboard")}`
    ),
  });

export const sendPaymentReceiptEmail = (payment) => {
  const student = payment.student;
  const batch = payment.batch;
  const paidOn = new Date(payment.paidAt || Date.now()).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: process.env.APP_TIMEZONE || "Asia/Kolkata",
  });
  const amount = inr(payment.amount / 100);
  return sendEmail({
    to: student.email,
    subject: `Fee receipt ${payment.receipt} — ${amount}`,
    text: `Hi ${student.name},\n\nWe received your fee payment.\nReceipt: ${payment.receipt}\nBatch: ${batch?.name}\nAmount: ${amount}\nPaid on: ${paidOn}\nPayment ID: ${payment.razorpayPaymentId}\nOrder ID: ${payment.razorpayOrderId}\n\nDownload a printable receipt from ${appUrl()}/payments`,
    html: layout(
      "Payment received",
      `<p>Hi ${escapeHtml(student.name)}, we received your fee payment.</p>
       <table role="presentation" width="100%" style="border-top:1px solid #d9e0ec;margin-top:8px">
       ${row("Receipt", payment.receipt)}${row("Batch", batch?.name || "—")}${row("Amount", amount)}${row("Paid on", paidOn)}
       ${row("Payment ID", payment.razorpayPaymentId || "—")}${row("Order ID", payment.razorpayOrderId)}
       </table>
       ${button(`${appUrl()}/payments`, "View receipt")}`
    ),
  });
};
