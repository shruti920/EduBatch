# EduBatch

Batch, enrollment, fee, attendance and notice management for small coaching institutes. Admins create batches and enroll students, teachers mark attendance and post notices for their own batches, and students pay fees online, track attendance and read announcements.

**Stack:** React 18 + Vite + Tailwind CSS v4 · Node.js + Express 5 · MongoDB + Mongoose · JWT (access + rotating refresh) + bcrypt · Zod · Razorpay (test mode) · Nodemailer (SMTP)

| | |
|---|---|
| Frontend | https://edu-batch-shruti.vercel.app/ |
| API | https://edubatch-api-7b76.onrender.com/ |

## Demo accounts

Created by `npm run seed` (see below).

| Role | Email | Password |
|---|---|---|
| Admin | admin@edubatch.com | Admin@123 |
| Teacher | teacher@edubatch.com | Teacher@123 |
| Student | student@edubatch.com | Student@123 |

The three demo accounts are listed in `DEMO_PROTECTED_EMAILS` on the deployed API, so their passwords can't be changed or reset and they can't be deactivated — one reviewer can't lock the others out. To try password change/reset, register your own student account with a real email address, or create one from **Users** as admin.

## Run locally

Requires Node.js 20+ and a MongoDB connection string (a free Atlas M0 cluster works).

```bash
# 1. API
cd server
cp .env.example .env        
npm install
npm run seed                
npm run dev                 

# 2. Frontend (new terminal)
cd client
cp .env.example .env        
npm install
npm run dev                 
```

`npm test` in `server/` runs all 9 API test suites (auth, role guards, batches, enrollments, dashboards, attendance, payments, notices, and account/sessions/users) and stops at the first failure. Assertions throw, so any failed check fails the run with exit code 1. Emails are never sent during tests: they go to an in-memory outbox that the account suite reads reset links from.

- **Use a separate test database.** Set `MONGO_URI_TEST` in `server/.env` (for example the same cluster with `/edubatch_test` at the end). `npm test` then seeds demo data into it and runs every suite there, so your demo data is never touched. Without it, tests fall back to `MONGO_URI` and print a warning.
- The payment tests never call Razorpay: they replace the SDK's network calls with local stand-ins and exercise everything else, including signature checks and webhooks. They write to the configured database, so point `MONGO_URI` at a dev database. They refuse to run with `NODE_ENV=production`.

## Environment variables

**server/.env** — every variable is documented inline in `server/.env.example`.

| Variable | Purpose |
|---|---|
| `MONGO_URI` | MongoDB connection string (required) |
| `MONGO_URI_TEST` | Optional. Separate database for `npm test` |
| `JWT_SECRET` | Signs access tokens (required; 32+ chars in production) |
| `JWT_ACCESS_EXPIRES_IN` | Access token lifetime, default `15m` |
| `REFRESH_TOKEN_TTL_DAYS` | Refresh cookie lifetime, default `7` |
| `COOKIE_SAMESITE` | `lax` (default, same-site via proxy/rewrite) or `none` (direct cross-site calls) |
| `PASSWORD_RESET_TTL_MINUTES` | Reset link lifetime, default `15` |
| `DEMO_PROTECTED_EMAILS` | Comma-separated shared demo logins that can't be locked |
| `CLIENT_URL` | Allowed frontend origin(s) for CORS (required in production, no localhost) |
| `APP_URL` | Public frontend URL used in email links (required in production) |
| `TRUST_PROXY_HOPS` | Proxies in front of the API: `1` on Render, `2` behind the Vercel rewrite |
| `APP_TIMEZONE` | Timezone for "today" (attendance, upcoming classes), default `Asia/Kolkata` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` | Nodemailer SMTP. Empty `SMTP_HOST` = emails printed to the server log |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Razorpay **test** keys (required in production) |
| `RAZORPAY_WEBHOOK_SECRET` | Optional. Secret you set when adding the webhook in the Razorpay dashboard |

In production the API refuses to start if a required variable is missing, `JWT_SECRET` is short, `CLIENT_URL` is `*`/localhost, or live Razorpay keys are set without `ALLOW_LIVE_PAYMENTS=true`.

**client/.env** — `VITE_API_URL`, default `/api/v1`. Keep it relative: the Vite dev proxy (local) and the `vercel.json` rewrite (production) send it to the API, so the refresh cookie stays first-party.

## Project structure

```
client/src
  api/          axios instance + one file per resource
  components/   layout, shared UI, batch/enrollment/payment/notice components
  context/      AuthContext and ToastContext
  hooks/        API, payment, and UI hooks
  pages/        admin/ (incl. Users), teacher/, student/, attendance/, payments/, notices/, profile/, auth pages
  utils/        formatting, CSV export, form validation
server/src
  config/       database, Razorpay SDK, startup env validation
  models/       User, RefreshToken, Batch, Enrollment, Attendance, Payment, WebhookEvent, Notice
  services/     payments, sessions (refresh-token rotation), email (Nodemailer templates)
  validations/  Zod schemas for every write route
  middleware/   protect (JWT + token version), restrictTo (roles), CSRF header check, rate limiters, validateBody, errorHandler
  utils/        JWT, bcrypt, dates, schedule → upcoming classes
  controllers/  route handlers
  routes/       /api/v1/* routers
  scripts/      seed and test scripts
```

## API

Base URL: `/api/v1`. Protected routes need `Authorization: Bearer <token>`. Every response has the shape `{ success, data, message }`. `/auth/refresh` and `/auth/logout` use the `eb_rt` httpOnly cookie instead and require the header `X-Requested-With: XMLHttpRequest`.

| Method | Endpoint | Access | Notes |
|---|---|---|---|
| POST | `/auth/register` | Public | Always creates a **student** account |
| POST | `/auth/login` | Public | Returns `{ user, token }` and sets the refresh cookie. Rate limited (failed attempts) |
| POST | `/auth/refresh` | Refresh cookie | New access token + rotated cookie. Replay of a rotated token revokes the session family |
| POST | `/auth/logout` | Refresh cookie | Revokes this device's refresh token, clears the cookie |
| POST | `/auth/logout-all` | Any role | Ends every session, including issued access tokens |
| POST | `/auth/forgot-password` | Public | Same response whether or not the email exists. 5 / 15 min per IP |
| POST | `/auth/reset-password` | Public | `{ token, password }`. Single use, 15-min expiry, ends all sessions |
| GET | `/auth/me` | Any role | Current user |
| PATCH | `/auth/me` | Any role | `name`, `phone`, `avatar` (https URL) only |
| PATCH | `/auth/change-password` | Any role | Needs current password. Other devices signed out, this one gets a fresh session |
| GET | `/users` | Admin | `role`, `status`, `search`, `page` filters + per-role counts |
| POST | `/users` | Admin | Create a **teacher or student** (not admin). Welcome email, never the password |
| PATCH | `/users/:id/status` | Admin | Activate/deactivate. Not yourself, not admins, not a teacher with open batches. Deactivation ends their sessions |
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
| GET | `/dashboard/admin` · `/teacher` · `/student` | That role | Figures + `upcomingClasses` (admin: today, others: next 7 days). Revenue = money actually received |
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
- **Public sign-up can only create students.** Teachers and students are created by an admin (Users page); admins only by the seed script. Nobody can register themselves into a higher role.
- **Sessions: 15-minute access token in memory + 7-day refresh token in an httpOnly cookie.** Nothing sensitive lives in localStorage. Refresh tokens are stored as SHA-256 hashes, rotate on every use, and a replayed old token revokes that whole login (theft detection), with a 30-second grace window so two tabs refreshing together don't log the user out. The cookie is scoped to `/api/v1/auth` and the cookie endpoints require `X-Requested-With` (CSRF guard).
- **Instant revocation.** Each user has a `tokenVersion` embedded in their access tokens. Changing/resetting the password, "sign out of all devices" and deactivation bump it, so old access tokens stop working immediately instead of in 15 minutes.
- **Same-origin API in every environment.** Vite proxies `/api` locally and `vercel.json` rewrites `/api/*` to Render in production, so the refresh cookie is first-party (Safari and Firefox block third-party cookies) and CORS isn't in the browser's path.
- **Password reset** uses a random 32-byte token, stored hashed, valid 15 minutes, single use. The forgot-password response is identical for unknown emails so the form can't reveal who has an account.
- **Email** (Nodemailer): reset links, password-changed alerts, welcome, enrollment confirmation and payment receipts. Sending never blocks or fails the request that triggered it; the receipt is sent only by whichever of verify/webhook/sync actually marked the payment paid, so it's never duplicated.
- **Revenue is money received, not a recalculation.** Each enrollment freezes `amountPaid` when it becomes paid (Razorpay amount, or the fee at the time for offline payments). Editing a batch fee or dropping a student who paid never changes past revenue.
- **Capacity is enforced in the enrollment controller, not the UI.** Every path that makes an enrollment active (new, re-enroll, reactivate) checks free seats. After writing, it recounts; if two admins took the last seat at the same moment, the later request undoes its own write. A batch can therefore never end up over capacity.
- **Soft deletes.** Dropping a student or archiving a batch keeps enrollment and attendance history.
- **Attendance is one document per batch per day** with a `records` array, so marking a whole class is a single upsert, and a unique `{ batch, date }` index prevents duplicates. "Today" is resolved in IST.
- **Attendance rules are enforced on the server:** only the batch's own teacher (or an admin), only for active batches, no future dates or dates outside the batch's run, each student once, and every student who was enrolled on that day must be included. Late counts as attended.
- **Batch fees are stored in rupees; payments in paise.** The conversion happens once, on the server, when the Razorpay order is created.
- **Security:** bcrypt (10 rounds), Zod validation on every write route, Helmet, CORS limited to `CLIENT_URL`, escaped search input, no stack traces in production responses.
- **Rate limiting:** login/register count only failed attempts (10 / 15 min per IP), so switching between the demo accounts never locks a reviewer out. Forgot-password 5 / 15 min, reset 10 / 15 min, change-password 5 failed / 15 min per user, order creation 20 / 15 min.
- **Production hardening:** HTTPS redirect (except `/health`), Helmet headers incl. HSTS, `x-powered-by` off, CORS locked to `CLIENT_URL` with credentials, fail-fast env validation.
- **Feedback:** results of actions appear as toasts (success closes itself after 5s, errors stay until dismissed; both are announced to screen readers). Page-load and form errors stay inline, next to the problem. There are no browser `alert()`/`confirm()` dialogs anywhere; confirmations use in-app dialogs.
- **Resilience:** a 404 page for unknown links, an error screen instead of a blank page if a view crashes, a "session expired" message when a token runs out, and a "starting the server" hint when the free Render instance is waking up.

## Deployment

**1. MongoDB Atlas** — free M0 cluster. Network Access: allow `0.0.0.0/0` (Render's free tier has no fixed IP). Copy the connection string.

**2. Email (Brevo, free)** — Render's free tier blocks outbound SMTP ports 25/465/587, so use a provider that accepts port 2525. Create a Brevo account → Senders: verify the address you'll send from → SMTP & API: generate an SMTP key. Use `SMTP_HOST=smtp-relay.brevo.com`, `SMTP_PORT=2525`, `SMTP_SECURE=false`, `SMTP_USER=<SMTP login shown by Brevo>`, `SMTP_PASS=<SMTP key>`, `EMAIL_FROM="EduBatch <verified-address>"`. (Locally, Gmail with an App Password on port 587 works too.)

**3. API on Render** — New Web Service from the repo. Root directory `server`, build `npm install`, start `npm start`, health check path `/health`. Environment:

```
NODE_ENV=production
MONGO_URI=...                 JWT_SECRET=<48+ random bytes hex>
CLIENT_URL=https://<app>.vercel.app
APP_URL=https://<app>.vercel.app
TRUST_PROXY_HOPS=2            COOKIE_SAMESITE=lax
DEMO_PROTECTED_EMAILS=admin@edubatch.com,teacher@edubatch.com,student@edubatch.com
RAZORPAY_KEY_ID=rzp_test_...  RAZORPAY_KEY_SECRET=...  RAZORPAY_WEBHOOK_SECRET=...
SMTP_HOST=smtp-relay.brevo.com SMTP_PORT=2525 SMTP_USER=... SMTP_PASS=... EMAIL_FROM=...
```

Then open the Render Shell and run `npm run seed` once.

**4. Frontend on Vercel** — Import the repo, root directory `client`, framework Vite. Before deploying, edit `client/vercel.json` and replace `YOUR-RENDER-SERVICE.onrender.com` with your Render host. Environment: `VITE_API_URL=/api/v1`. The rewrite serves the API from the Vercel domain, which keeps the refresh cookie first-party.

**5. Razorpay webhook (optional)** — URL `https://<render-host>/api/v1/payments/webhook` (direct to Render, not via Vercel), events `payment.captured`, `payment.failed`, `order.paid`.

**6. Check** — `https://<render-host>/health` returns 200; log in with each demo account on the Vercel URL; register with your own email and run forgot → reset; pay a fee with `success@razorpay` and confirm the receipt email.

## Assumptions

- One institute per deployment (no multi-tenancy); all times are in `APP_TIMEZONE` (IST by default).
- Admins are created by the seed script only; the app creates teachers and students. An admin sets a new user's first password and shares it; the user changes it from Profile.
- Avatars are image URLs (https) rather than uploads — the spec lists avatar as a URL field.
- Receipts: printable/save-as-PDF page in the app plus an emailed receipt. No server-generated PDF file.
- "Upcoming classes" are expanded from each batch's weekly schedule within its start/end dates; there's no per-session calendar or holiday list.
- Deactivating a student keeps their seats and history; the admin drops seats explicitly from Enrollments.

## Known limitations

| Item | Status / approach |
|---|---|
| Refunds | Done from the Razorpay dashboard. The app blocks changing an online-paid fee until then. |
| Email on Render free tier | Render's free tier blocks SMTP ports 25/465/587, so production uses Brevo SMTP on port 2525. If no SMTP is configured, emails are logged, not sent. |
| Server-generated PDF receipts | Receipts are printable pages + email; no PDF file is generated server-side. |
| Notice delivery by email / WhatsApp, live push | In-app only (badge + feed). Phase 2 in the spec's roadmap. |
| Attachments on notices, avatar uploads | Not built; URLs only. |
| Editing a user's role or email | Not built; create a new account instead. |
| Session list per device | "Sign out of all devices" exists; there is no per-device session list. |
