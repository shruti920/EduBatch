# EduBatch

Batch, enrollment, fee, attendance and notice management for small coaching institutes. Admins create batches and enroll students, teachers mark attendance and post notices for their own batches, and students pay fees online, track attendance and read announcements.

**Stack:** React 19 + Vite + Tailwind CSS v4 · Node.js + Express 5 · MongoDB + Mongoose · JWT + bcrypt · Zod · Razorpay (test mode)

| | |
|---|---|
| Frontend | _add Vercel URL_ |
| API | _add Render URL_ |

## Demo accounts

Created by `npm run seed` (see below).

| Role | Email | Password |
|---|---|---|
| Admin | admin@edubatch.com | Admin@123 |
| Teacher | teacher@edubatch.com | Teacher@123 |
| Student | student@edubatch.com | Student@123 |

## Run locally

Requires Node.js 20+ and a MongoDB connection string (a free Atlas M0 cluster works).

```bash
# 1. API
cd server
cp .env.example .env        # fill in MONGO_URI and JWT_SECRET
npm install
npm run seed                # demo users, batches, enrollments, attendance
npm run dev                 # http://localhost:5000

# 2. Frontend (new terminal)
cd client
cp .env.example .env        # VITE_API_URL=http://localhost:5000/api/v1
npm install
npm run dev                 # http://localhost:5173
```

`npm test` in `server/` runs all 8 API test suites (auth, role guards, batches, enrollments, dashboards, attendance, payments, notices) and stops at the first failure.

- **Use a separate test database.** Set `MONGO_URI_TEST` in `server/.env` (for example the same cluster with `/edubatch_test` at the end). `npm test` then seeds demo data into it and runs every suite there, so your demo data is never touched. Without it, tests fall back to `MONGO_URI` and print a warning.
- The payment tests never call Razorpay: they replace the SDK's network calls with local stand-ins and exercise everything else, including signature checks and webhooks. They write to the configured database, so point `MONGO_URI` at a dev database. They refuse to run with `NODE_ENV=production`.

## Environment variables

**server/.env**

| Variable | Purpose |
|---|---|
| `MONGO_URI` | MongoDB connection string (required) |
| `JWT_SECRET` | Long random string used to sign tokens (required — the API won't start without it) |
| `JWT_EXPIRES_IN` | Token lifetime, default `1d` |
| `MONGO_URI_TEST` | Optional. Separate database for `npm test` |
| `CLIENT_URL` | Allowed frontend origin(s) for CORS, comma-separated |
| `APP_TIMEZONE` | Timezone used to decide "today" for attendance, default `Asia/Kolkata` |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Razorpay **test** keys. Without them the app runs and "Pay now" shows a clear message |
| `RAZORPAY_WEBHOOK_SECRET` | Optional. Secret you set when adding the webhook in the Razorpay dashboard |

**client/.env** — `VITE_API_URL`, the API base URL including `/api/v1`.

## Project structure

```
client/src
  api/          axios instance + one file per resource
  components/   layout, shared UI, batch/enrollment/payment/notice components
  context/      AuthContext and ToastContext
  hooks/        API, payment, and UI hooks
  pages/        admin/, teacher/, student/, attendance/, payments/, notices/, auth pages
  utils/        formatting and CSV export
server/src
  config/       database connection and Razorpay SDK
  models/       User, Batch, Enrollment, Attendance, Payment, WebhookEvent, Notice
  services/     payment verification and status reconciliation
  validations/  Zod schemas for every write route
  middleware/   protect (JWT), restrictTo (roles), validateBody, errorHandler
  controllers/  route handlers
  routes/       /api/v1/* routers
  scripts/      seed and test scripts
```

## API

Base URL: `/api/v1`. Protected routes need `Authorization: Bearer <token>`. Every response has the shape `{ success, data, message }`.

| Method | Endpoint | Access | Notes |
|---|---|---|---|
| POST | `/auth/register` | Public | Always creates a **student** account |
| POST | `/auth/login` | Public | Returns `{ user, token }` |
| GET | `/auth/me` | Any role | Current user |
| GET | `/batches` | Any role | Admin: all (`status`, `search`, `subject` filters). Teacher: own. Student: enrolled only |
| GET | `/batches/:id` | Any role | Teacher: own only. Student: enrolled only |
| POST | `/batches` | Admin | |
| PUT | `/batches/:id` | Admin | Capacity can't go below current enrollment |
| PATCH | `/batches/:id/status` | Admin | `upcoming` / `active` / `archived` |
| DELETE | `/batches/:id` | Admin | Soft archive; history kept |
| GET | `/batches/meta/teachers` | Admin | Options for the batch form |
| POST | `/enrollments` | Admin | Capacity-checked |
| GET | `/enrollments` | Admin | Filters: `batch`, `paymentStatus`, `search` |
| GET | `/enrollments/my` | Student | |
| GET | `/enrollments/batch/:batchId` | Admin, batch's teacher | Roster |
| GET | `/enrollments/students` | Admin | Options for the enroll form |
| PATCH | `/enrollments/:id/status` | Admin | Offline payment / waiver / reactivate (capacity-checked) |
| DELETE | `/enrollments/:id` | Admin | Soft drop; frees the seat |
| POST | `/attendance` | Admin, batch's teacher | One document per batch per day; re-posting a date updates it |
| GET | `/attendance/batch/:batchId` | Admin, batch's teacher | Session history |
| GET | `/attendance/batch/:batchId/date/:date` | Admin, batch's teacher | Pre-fills the marking form |
| GET | `/attendance/my` | Student | Overall and per-batch rates |
| GET | `/dashboard/admin` · `/teacher` · `/student` | That role | Dashboard figures |
| POST | `/payments/create-order` | Student | Own pending enrollment only. Amount comes from the batch fee on the server |
| POST | `/payments/verify` | Student | Checks Razorpay's signature before marking anything paid |
| POST | `/payments/failure` | Student | Records a failed/cancelled attempt (history only) |
| POST | `/payments/:id/sync` | Student (own), Admin | Asks Razorpay whether an order was paid |
| GET | `/payments/history` | Student (own), Admin (all + totals) | Filters: `status`, `batch` |
| GET | `/notices` | Any role | Scoped by role. Pinned first, then newest. `?batch=all\|everyone\|<id>`, `?before=` cursor, `?limit=` |
| GET | `/notices/unread-count` | Any role | Sidebar badge |
| POST | `/notices/seen` | Any role | Marks everything up to now as read |
| POST | `/notices` | Admin, teacher | Admin: everyone or any batch. Teacher: own batches only |
| PATCH | `/notices/:id` | Author or admin | Title, message, pin, "show until". Audience can't change |
| DELETE | `/notices/:id` | Author or admin | |
| POST | `/payments/webhook` | Razorpay (signed) | `payment.captured`, `order.paid`, `payment.failed` |

## Paying a fee (test mode)

1. Log in as the demo student, open **Payments** (or the dashboard) and click **Pay now** on a pending fee.
2. In Razorpay Checkout choose UPI and enter `success@razorpay` (or `failure@razorpay` to see a failure), or use any Razorpay test card with a future expiry and any CVV.
3. The fee flips to **Paid** once the server has verified the payment, and a receipt is available under Payments.

**How a payment is confirmed**

```
Student ──Pay now──▶ API: create order (amount from batch fee, in paise) ──▶ Razorpay
   │                                   │ reuses the open order on a second click
   ▼                                   ▼
Razorpay Checkout ── success ──▶ API: /verify
                                   HMAC_SHA256(stored order_id + "|" + payment_id, key secret)
                                   must equal the signature → Payment + Enrollment marked paid
Razorpay ── webhook (signed) ──▶ API: /webhook   (backup if the browser closed before /verify)
Admin/student ── Check status ─▶ API: /sync      (asks Razorpay directly; works without webhooks)
```

- The server never trusts the client's word that a payment succeeded. Only a valid signature, a signed webhook, or Razorpay's own API can mark a fee paid.
- The order ID used for the signature is the one stored on the server, not the one the browser sends back.
- "Mark paid" is idempotent: `/verify`, the webhook and `/sync` can all run for the same payment and only the first changes anything. Duplicate webhook deliveries are detected with `x-razorpay-event-id`.
- A failed or late `payment.failed` event can never undo a payment that already succeeded.
- One open order per enrollment: clicking Pay twice, or in two tabs, reuses the same order, and Razorpay accepts only one payment per order, so a fee can't be paid twice.
- Admins can't set an online-paid fee back to pending or waived from the app; that needs a refund in the Razorpay dashboard first.

**Webhook setup (optional):** Razorpay Dashboard → Webhooks → Add. URL: `<API URL>/api/v1/payments/webhook`. Events: `payment.captured`, `payment.failed`, `order.paid`. Put the secret you choose there into `RAZORPAY_WEBHOOK_SECRET`.

## Notices

| Who | Can post to | Sees |
|---|---|---|
| Admin | Everyone, or any batch | All notices |
| Teacher | Only batches they teach | "Everyone" notices + their own batches |
| Student | — | "Everyone" notices + batches they're actively enrolled in |

- A student dropped from a batch stops seeing its notices immediately; notices of archived batches and expired notices ("show until" passed) are hidden from students.
- Messages are **plain text**, rendered as text with line breaks kept — never as HTML — so pasted markup can't run in anyone's browser.
- **Unread badge:** each user has a `noticesSeenAt` time. Notices you can see that were posted after it (and not by you) are unread; opening Notices clears the badge. One date per user instead of a growing "read by" list on every notice.
- Pinned notices always stay at the top; the rest page 20 at a time ("Load older notices").

## Design decisions

- **One `users` collection with a `role` field.** Role changes don't move documents, and every role check happens on the server — the client's idea of the role is never trusted.
- **Public sign-up can only create students.** Admin and teacher accounts come from the seed script, so nobody can register themselves into a higher role.
- **Capacity is enforced in the enrollment controller, not the UI.** Every path that makes an enrollment active (new, re-enroll, reactivate) checks free seats. After writing, it recounts; if two admins took the last seat at the same moment, the later request undoes its own write. A batch can therefore never end up over capacity.
- **Soft deletes.** Dropping a student or archiving a batch keeps enrollment and attendance history.
- **Attendance is one document per batch per day** with a `records` array, so marking a whole class is a single upsert, and a unique `{ batch, date }` index prevents duplicates. "Today" is resolved in IST.
- **Attendance rules are enforced on the server:** only the batch's own teacher (or an admin), only for active batches, no future dates or dates outside the batch's run, each student once, and every student who was enrolled on that day must be included. Late counts as attended.
- **Batch fees are stored in rupees; payments in paise.** The conversion happens once, on the server, when the Razorpay order is created.
- **Security:** bcrypt (10 rounds), Zod validation on every write route, Helmet, CORS limited to `CLIENT_URL`, escaped search input, no stack traces in production responses.
- **Rate limiting counts only failed logins/registrations** (10 per 15 minutes per IP). Switching between the three demo accounts never locks a reviewer out; guessing passwords still does.
- **Feedback:** results of actions appear as toasts (success closes itself after 5s, errors stay until dismissed; both are announced to screen readers). Page-load and form errors stay inline, next to the problem. There are no browser `alert()`/`confirm()` dialogs anywhere; confirmations use in-app dialogs.
- **Resilience:** a 404 page for unknown links, an error screen instead of a blank page if a view crashes, a "session expired" message when a token runs out, and a "starting the server" hint when the free Render instance is waking up.

## Not implemented yet

| Item | Status / approach |
|---|---|
| Refunds | Done from the Razorpay dashboard. The app blocks changing an online-paid fee until then. |
| Emailed receipts | Receipts can be printed or saved as PDF from the Payments page; emailing them is planned with Resend. |
| Refresh tokens | Single access token (default 1 day). Next step: short-lived access token plus a rotating refresh token in an httpOnly cookie. |
| Password reset email | Planned with Resend. |
| Notice delivery by email / WhatsApp, live push | In-app only for now (badge + feed). Delivery channels are Phase 2 in the spec's roadmap. |
| Attachments on notices | Not built. Would use the same upload approach as avatars. |
| Admin UI for creating teachers | Teachers come from the seed script for now. |
| Profile editing | Not built. |
