# EduBatch — Module-by-Module Build Plan

This is the working build checklist — drop it in the repo as `docs/BUILD_PLAN.md`. It's separate from the final `README.md` you'll submit, which only needs setup instructions, credentials, and API docs per the assignment brief.

**Rule for this whole plan:** no model gets created until the module that needs it is being built. Nothing is scaffolded "just in case."

Tick boxes as you go — at the end of each module there's a checkpoint. Don't move to the next module until the checkpoint passes.

---

## Module 0 — Repo & server skeleton (Day 1, ~1 hr)

- [ ] Create `client/` (`npm create vite@latest client -- --template react`) and `server/` folders in one repo
- [ ] `server/`: `npm init -y`, install `express mongoose dotenv cors helmet bcrypt jsonwebtoken zod express-rate-limit`
- [ ] `client/`: install `tailwindcss axios react-router-dom`, configure Tailwind
- [ ] Add root `.gitignore` — `node_modules`, `.env`, `dist`, `.DS_Store`
- [ ] Add `server/.env.example` with placeholder keys (`MONGO_URI`, `JWT_SECRET`, `RAZORPAY_KEY_ID`, etc.) — never the real values
- [ ] `server/src/config/db.js` — Mongoose connection, no models yet
- [ ] `server/src/app.js` — Express app with `helmet()`, `cors()`, JSON body parser, a `/health` route that returns `{ ok: true }`

**Checkpoint:** `npm run dev` on both, `/health` returns 200, Mongo connects (check the console log).

---

## Module 1 — Auth & roles (Day 1, ~4–5 hrs)

**DB step:** create `User` model now — `name, email (unique), password, role (enum: admin|teacher|student), phone, avatar, isActive, timestamps`. This is the only collection this module needs.

- [ ] `models/User.js`
- [ ] `utils/hash.js` — bcrypt hash/compare helpers
- [ ] `utils/jwt.js` — sign/verify access token
- [ ] `middleware/auth.js` — `protect` (verifies JWT, attaches `req.user`) and `restrictTo(...roles)`
- [ ] `controllers/authController.js` + `routes/auth.js` — `POST /register`, `POST /login`, `GET /me`
- [ ] Zod schemas for register/login payloads
- [ ] Frontend: `AuthContext`, axios instance with token interceptor
- [ ] Frontend: Register + Login pages, `ProtectedRoute` wrapper that checks role
- [ ] Frontend: three empty dashboard shells (`/admin`, `/teacher`, `/student`) that a logged-in user lands on based on role

**Checkpoint:** Register one user per role. Log in as each. Confirm a student hitting an admin route gets a 403, not data.

---

## Module 2 — Batch management (Day 2, ~3 hrs)

**DB step:** create `Batch` model now — `name, subject, description, startDate, endDate, schedule {days, startTime, endTime}, capacity, fee, teacher (ref User), status (upcoming|active|archived), createdBy (ref User)`.

- [ ] `models/Batch.js`
- [ ] `controllers/batchController.js` + `routes/batches.js` — `GET /batches` (role-filtered), `GET /batches/:id`, `POST /batches` (admin), `PUT /batches/:id` (admin), `PATCH /batches/:id/status` (admin)
- [ ] Zod schema for batch create/update
- [ ] Frontend: batch list (table for admin, read-only cards for teacher/student), create/edit batch form (admin only)

**Checkpoint:** Admin creates a batch, assigns a teacher, edits capacity. Teacher sees only assigned batches. Student sees nothing yet (no enrollments exist).

---

## Module 3 — Student enrollment (Day 2, ~2–3 hrs)

**DB step:** create `Enrollment` model now — `student (ref User), batch (ref Batch), enrolledAt, paymentStatus (pending|paid|waived), isActive`.

- [ ] `models/Enrollment.js`
- [ ] `controllers/enrollmentController.js` + `routes/enrollments.js` — `POST /enrollments` (admin, **capacity check here**: count active enrollments for the batch against `batch.capacity` before inserting), `GET /enrollments/my` (student)
- [ ] Frontend: "Enroll student" action on batch detail page (admin)
- [ ] Frontend: "My batches" view (student) pulling from `/enrollments/my`

**Checkpoint:** Enroll students until a batch hits capacity — the next attempt should fail with a clear error message, not a silent overwrite.

---

## Module 4 — Dashboards v1 (Day 2, ~1–2 hrs)

**DB step:** none. This module only runs aggregate queries over `User`, `Batch`, and `Enrollment` — no new collection.

- [ ] `controllers/dashboardController.js` + `routes/dashboard.js` — `/dashboard/admin` (total students, active batches, pending fees), `/dashboard/teacher` (assigned batches, student counts), `/dashboard/student` (enrolled batches, fee status)
- [ ] Frontend: wire the three dashboard shells from Module 1 to real numbers

**Checkpoint:** Each dashboard shows counts that match what's actually in the DB — cross-check one number by hand.

---

## Module 5 — Payments (Day 3, ~3–4 hrs) — P0

**DB step:** create `Payment` model now — `enrollment (ref Enrollment), student (ref User), amount, currency, razorpayOrderId, razorpayPaymentId, razorpaySignature, status (created|paid|failed), paidAt`.

- [ ] `models/Payment.js`
- [ ] `config/razorpay.js` — SDK init with test keys from `.env`
- [ ] `controllers/paymentController.js` + `routes/payments.js` — `POST /payments/create-order`, `POST /payments/verify` (**signature check happens server-side here — this is the one step that can't be skipped under time pressure**)
- [ ] On verify success: update `Payment.status` and `Enrollment.paymentStatus`
- [ ] Frontend: "Pay now" button → Razorpay Checkout modal → verify call
- [ ] Frontend: payment history list

**Checkpoint:** Full test-mode payment: click pay, complete Razorpay test checkout, enrollment flips to `paid` without a page refresh trick.

---

## Module 6 — Attendance (Day 3, ~2 hrs) — P1, build if on schedule

**DB step:** create `Attendance` model now — `batch (ref Batch), date, records: [{ student, status: present|absent|late }], markedBy (ref User)`. One document per batch per day, not per student per day.

- [ ] `models/Attendance.js`
- [ ] `controllers/attendanceController.js` + `routes/attendance.js` — `POST /attendance` (teacher, own batch only), `GET /attendance/batch/:id`, `GET /attendance/my` (student %)
- [ ] Frontend: attendance grid for teacher (mark whole class in one submit), attendance % view for student

**Checkpoint:** Teacher marks a day's attendance for one batch; student in that batch sees an updated percentage.

---

## Module 7 — Notices (Day 3, ~1 hr) — P1, build if on schedule

**DB step:** create `Notice` model now — `batch (ref Batch, nullable for global), title, body, createdBy (ref User), pinned`.

- [ ] `models/Notice.js`
- [ ] `controllers/noticeController.js` + `routes/notices.js` — `POST /notices` (teacher/admin), `GET /notices` (filter by batch)
- [ ] Frontend: notice feed on student dashboard, create-notice form for teacher

**Checkpoint:** A notice posted to a batch shows up on an enrolled student's dashboard, not on other students'.

---

## Module 8 — Hardening, polish, deploy (Day 4) — no new collections

This module doesn't add data, it protects and ships what already exists.

- [ ] Confirm every write route has both a role guard and Zod validation — do a pass over Modules 1–7's routes with a checklist, don't just trust memory
- [ ] Rate limit `/auth/login` and `/auth/register` (`express-rate-limit`)
- [ ] Add indexes: unique on `User.email`, compound on `Attendance.{batch, date}`
- [ ] Lock CORS to the deployed frontend origin, not `*`
- [ ] Responsive pass — dashboards, enrollment flow, payment flow specifically (what a reviewer clicks first)
- [ ] Seed script: 1 admin, 1 teacher, 2 students, 1 batch, 1 paid enrollment — this becomes your demo credentials
- [ ] Deploy: frontend → Vercel, backend → Render, DB → Atlas
- [ ] Write the final `README.md`: setup steps, `.env.example`, API docs, demo credentials, and an honest "not implemented" section for anything from P1/P2 that didn't make it
- [ ] Run the assignment's own testing checklist end to end before submitting

---

## Module 8a — Auth completion, Profile, Email, Users (added after gap review)

The assignment email requires more than Modules 1–7 covered. See `docs/MODULE_8A_IMPLEMENTATION.md`.

- [x] Refresh tokens (rotating, httpOnly), logout, logout-all, instant revocation via tokenVersion
- [x] Forgot / reset password with emailed single-use link
- [x] Nodemailer email service: reset, password changed, welcome, enrollment, receipt
- [x] Profile page: name, phone, avatar, change password
- [x] Admin Users page: create teacher/student, activate/deactivate
- [x] Upcoming classes on dashboards; revenue from frozen amounts
- [x] React 18 per mandatory stack
- [x] Tests that actually fail (`check()` instead of `console.assert`) + `testAccount.js`

**Checkpoint:** `npm test` → all 9 suites pass.

---

## If you're behind schedule

Cut in this order: Notices first, then Attendance, then dashboard polish (raw numbers are fine, skip charts). Never cut the payment signature verification or the enrollment capacity check — those are the two things a technical reviewer will specifically probe, per their own evaluation criteria.
