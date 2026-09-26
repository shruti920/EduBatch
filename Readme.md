# EduBatch

Batch, enrollment, fee, attendance and notice management for small coaching institutes.

Admins create batches, assign teachers and enroll students. Teachers mark attendance and post notices for their own batches. Students pay fees online, track their attendance and read announcements.

| | |
|---|---|
| Live app | https://edu-batch-shruti.vercel.app |
| API | https://edubatch-api-7b76.onrender.com/health |
| Repository | https://github.com/shruti920/EduBatch |

The API runs on Render's free tier and sleeps when idle, so the first request after a quiet period can take up to a minute.

## Contents

- [Demo accounts](#demo-accounts)
- [Features](#features)
- [Tech stack](#tech-stack)
- [Run it locally](#run-it-locally)
- [Database setup](#database-setup)
- [Environment variables](#environment-variables)
- [Tests](#tests)
- [API reference](#api-reference)
- [How payments work](#how-payments-work)
- [Implementation approach](#implementation-approach)
- [Project structure](#project-structure)
- [Deployment](#deployment)
- [Assumptions](#assumptions)
- [Known limitations](#known-limitations)
- [Troubleshooting](#troubleshooting)

## Demo accounts

Created by `npm run seed`. The login page has one-click buttons for all three.

| Role | Email | Password |
|---|---|---|
| Admin | admin@edubatch.com | Admin@123 |
| Teacher | teacher@edubatch.com | Teacher@123 |
| Student | student@edubatch.com | Student@123 |

On the live site these accounts can't have their password changed or reset and can't be deactivated, so one reviewer can't lock another out. To try registration, password change or password reset, sign up with your own email address (check spam for the reset email), or create a user from the admin's **Users** page.

**Test payment:** log in as the student, click **Pay now** on a pending fee, choose UPI in Razorpay Checkout and enter `success@razorpay`. Use `failure@razorpay` to see a failed payment.

## Features

**Admin**
- Create, edit, archive batches: name, subject, weekly schedule, start and end dates, capacity, fee, teacher, status.
- Enroll and drop students. Enrollment is refused when a batch is full.
- Record offline payments or waive a fee.
- Create teacher and student accounts; deactivate users.
- Dashboard: students, active batches, fees collected (online and offline), pending fees, today's classes, and six months of fees, enrollments and attendance.
- Mark attendance for any batch; post notices to everyone or to one batch.

**Teacher**
- Sees only the batches assigned to them, with rosters.
- Marks attendance by date: Present, Late or Absent, with an optional note. Saving the same date again updates it.
- Posts notices to their own batches.

**Student**
- Sees enrolled batches, schedules and upcoming classes.
- Pays fees through Razorpay, sees payment history and prints or saves receipts.
- Sees attendance overall and per batch, with a warning below 75% and how many classes are needed to get back to it.
- Reads notices for their batches, with an unread badge.

**Everyone**
- Profile: name, phone, photo (upload, drag and drop or paste, then crop) and password change.
- Forgot password by email; sign out of all devices.
- Works on phone and desktop.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS 4, React Router, Axios |
| Backend | Node.js 22, Express 5 |
| Database | MongoDB with Mongoose |
| Auth | JWT access tokens, rotating refresh tokens, bcrypt |
| Validation | Zod |
| Payments | Razorpay (test mode) |
| Email | Nodemailer over SMTP (Brevo in production) |
| Hosting | Vercel (frontend), Render (API), MongoDB Atlas (database) |

UI libraries: Motion (animations), Sonner (toasts), react-easy-crop (profile photo cropping), lucide-react (icons). Charts are plain SVG.

## Run it locally

**You need:** Node.js 22 (22.13 or newer) and a MongoDB database. A free MongoDB Atlas cluster works; see [Database setup](#database-setup).

```bash
git clone https://github.com/shruti920/EduBatch.git
cd EduBatch
```

### 1. API

```bash
cd server
cp .env.example .env        # Windows: copy .env.example .env
```

Open `server/.env` and set:

- `MONGO_URI`: your MongoDB connection string, including a database name (see [Database setup](#database-setup)).
- `JWT_SECRET`: a long random string. Generate one with
  `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
- Leave `NODE_ENV=development`. Production mode forces HTTPS and secure cookies, which breaks login on localhost.

Everything else can stay as it is for a first run. Without Razorpay keys, online payment is switched off. Without SMTP settings, emails such as password reset links are printed in the API terminal instead of being sent.

```bash
npm install
npm run seed                # demo accounts, batches, enrollments and attendance
npm run dev                 # API on http://localhost:5000
```

### 2. Frontend

In a second terminal:

```bash
cd client
cp .env.example .env        # Windows: copy .env.example .env
npm install
npm run dev                 # open http://localhost:5173
```

Keep `VITE_API_URL=/api/v1`. The Vite dev server forwards `/api` to `localhost:5000`, so the browser sees one origin, the same as in production.

Log in with any of the [demo accounts](#demo-accounts).

### 3. Online payments (optional)

1. Create a free account at [razorpay.com](https://razorpay.com) and switch the dashboard to **Test Mode**. No KYC is needed for test mode.
2. **Account & Settings → API Keys → Generate Test Key.**
3. Put the key ID and secret into `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in `server/.env`, then restart the API.

### 4. Real emails (optional)

Fill in the `SMTP_*` and `EMAIL_FROM` variables. Locally, Gmail works: `smtp.gmail.com`, port `587`, your address, and an App Password (Google Account → Security → 2-Step Verification → App passwords).

## Database setup

### Option A: MongoDB Atlas (free)

1. Create a free **M0** cluster at [cloud.mongodb.com](https://cloud.mongodb.com).
2. **Database Access:** add a database user with a password.
3. **Network Access:** add your IP address. For Render, add `0.0.0.0/0`, because its free tier has no fixed IP.
4. **Connect → Drivers:** copy the connection string and replace `<db_password>` with your password.
5. Add a database name between `.mongodb.net/` and `?`:

   ```
   mongodb+srv://user:password@cluster0.xxxxx.mongodb.net/edubatch?appName=Cluster0
   ```

   Without a name, MongoDB quietly uses a database called `test`, and the API won't find the seeded demo accounts.

### Option B: MongoDB on your machine

```
MONGO_URI=mongodb://127.0.0.1:27017/edubatch
```

### Collections and demo data

There are no migrations. Collections and indexes are created on first use, and `npm run seed` adds the demo data. The seed is safe to run more than once; it doesn't create duplicates.

Using one database per purpose keeps them apart:

| Use | Example database name |
|---|---|
| Local development | `edubatch_dev` |
| Tests (`MONGO_URI_TEST`) | `edubatch_test` |
| Live site | `edubatch` |

## Environment variables

Both templates are in the repo: `server/.env.example` (every variable is explained inline) and `client/.env.example`.

### server/.env

| Variable | Required | Purpose |
|---|---|---|
| `MONGO_URI` | Yes | MongoDB connection string with a database name |
| `JWT_SECRET` | Yes | Signs access tokens. 32+ characters in production |
| `NODE_ENV` | | `development` locally, `production` on Render |
| `PORT` | | Default `5000`. Render sets its own |
| `MONGO_URI_TEST` | | Separate database for `npm test` |
| `JWT_ACCESS_EXPIRES_IN` | | Access token lifetime, default `15m` |
| `REFRESH_TOKEN_TTL_DAYS` | | Refresh cookie lifetime, default `7` |
| `COOKIE_SAMESITE` | | `lax` (default) when the frontend reaches the API on the same site |
| `PASSWORD_RESET_TTL_MINUTES` | | Reset link lifetime, default `15` |
| `DEMO_PROTECTED_EMAILS` | | Comma-separated shared demo logins that can't be changed or deactivated |
| `CLIENT_URL` | Production | Frontend origin(s) allowed by CORS. No `*` or localhost in production |
| `APP_URL` | Production | Frontend URL used in email links |
| `TRUST_PROXY_HOPS` | | Proxies in front of the API: `1` locally, `2` on Render behind the Vercel rewrite |
| `APP_TIMEZONE` | | Timezone for "today", default `Asia/Kolkata` |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Production | Razorpay test keys |
| `RAZORPAY_WEBHOOK_SECRET` | | Secret you set when adding the webhook in Razorpay |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` | | SMTP settings. Empty `SMTP_HOST` prints emails to the log |

In production the API refuses to start if a required variable is missing, `JWT_SECRET` is shorter than 32 characters, `CLIENT_URL` is `*` or localhost, or live Razorpay keys are used without `ALLOW_LIVE_PAYMENTS=true`. The error names the problem.

### client/.env

| Variable | Value |
|---|---|
| `VITE_API_URL` | `/api/v1`. Keep it relative: the Vite proxy (local) and `vercel.json` (production) route it to the API |

## Tests

```bash
cd server
npm test
```

This runs 9 integration test suites against the real app and a real database: auth, role guards, batches, enrollments, dashboards, attendance, payments, notices, and accounts (sessions, password reset, users, profile photos). It stops at the first failure and exits with code 1.

- Set `MONGO_URI_TEST` to a separate database. The tests seed their own demo data there and clean up after themselves, so your development data isn't touched. Without it they fall back to `MONGO_URI` and print a warning.
- No real emails are sent; messages go to an in-memory outbox that the tests read reset links from.
- The payment tests don't call Razorpay. They replace its network calls with local stand-ins and test everything else, including signature checks and webhooks.
- They refuse to run with `NODE_ENV=production`.

Lint and build the frontend with `npm run lint` and `npm run build` in `client/`.

## API reference

Base URL: `/api/v1`. Health check: `GET /health`.

- Protected routes need `Authorization: Bearer <access token>`.
- `/auth/refresh` and `/auth/logout` use the `eb_rt` httpOnly cookie instead, and require the header `X-Requested-With: XMLHttpRequest`.
- Every response has the same shape: `{ "success": true | false, "data": ..., "message": "..." }`. Validation errors also include `errors` with one message per field.

| Code | Meaning |
|---|---|
| 400 | Invalid input |
| 401 | Not logged in, or the session ended |
| 403 | Logged in but not allowed |
| 404 | Not found |
| 409 | Conflict, e.g. email already used or batch full |
| 413 | Upload too large |
| 429 | Too many attempts |

### Auth and profile

| Method | Endpoint | Access | Notes |
|---|---|---|---|
| POST | `/auth/register` | Public | Always creates a student account |
| POST | `/auth/login` | Public | Returns `{ user, token }` and sets the refresh cookie. 10 failed attempts per 15 min per IP |
| POST | `/auth/refresh` | Refresh cookie | New access token; the cookie is rotated |
| POST | `/auth/logout` | Refresh cookie | Ends this device's session |
| POST | `/auth/logout-all` | Any role | Ends every session of the user |
| POST | `/auth/forgot-password` | Public | Same response whether or not the email exists. 5 per 15 min |
| POST | `/auth/reset-password` | Public | `{ token, password }`. Single use, 15-minute expiry, ends all sessions |
| GET | `/auth/me` | Any role | Current user |
| PATCH | `/auth/me` | Any role | `name`, `phone` |
| PATCH | `/auth/change-password` | Any role | Needs the current password. Other devices are signed out |
| PUT | `/auth/me/avatar` | Any role | Raw image bytes, JPG/PNG/WebP, max 300 KB |
| DELETE | `/auth/me/avatar` | Any role | Remove the photo |
| GET | `/avatars/:userId/:file` | Public | Serves a photo; the URL contains a random key that changes on every upload |

### Users

| Method | Endpoint | Access | Notes |
|---|---|---|---|
| GET | `/users` | Admin | Filters: `role`, `status`, `search`, `page` |
| POST | `/users` | Admin | Creates a teacher or student. The welcome email never contains the password |
| PATCH | `/users/:id/status` | Admin | Activate or deactivate. Deactivation ends that user's sessions |

### Batches

| Method | Endpoint | Access | Notes |
|---|---|---|---|
| GET | `/batches` | Any role | Admin: all (filters `status`, `search`, `subject`). Teacher: own. Student: enrolled |
| GET | `/batches/:id` | Any role | Teacher: own only. Student: enrolled only |
| POST | `/batches` | Admin | |
| PUT | `/batches/:id` | Admin | Capacity can't go below current enrollment |
| PATCH | `/batches/:id/status` | Admin | `upcoming`, `active` or `archived` |
| DELETE | `/batches/:id` | Admin | Archives the batch; history is kept |
| GET | `/batches/meta/teachers` | Admin | Teacher options for the batch form |

### Enrollments

| Method | Endpoint | Access | Notes |
|---|---|---|---|
| POST | `/enrollments` | Admin | Refused if the batch is full |
| GET | `/enrollments` | Admin | Filters: `batch`, `paymentStatus`, `search` |
| GET | `/enrollments/my` | Student | Own enrollments |
| GET | `/enrollments/batch/:batchId` | Admin, batch's teacher | Roster |
| GET | `/enrollments/students` | Admin | Student options for the enroll form |
| PATCH | `/enrollments/:id/status` | Admin | Offline payment, waiver or reactivation |
| DELETE | `/enrollments/:id` | Admin | Drops the student and frees the seat; history is kept |

### Payments

| Method | Endpoint | Access | Notes |
|---|---|---|---|
| POST | `/payments/create-order` | Student | Own pending enrollment. The amount comes from the batch fee on the server |
| POST | `/payments/verify` | Student | Checks Razorpay's signature before marking anything paid |
| POST | `/payments/failure` | Student | Records a failed or cancelled attempt |
| POST | `/payments/:id/sync` | Student (own), Admin | Asks Razorpay whether the order was paid |
| GET | `/payments/history` | Student (own), Admin (all) | Filters: `status`, `batch` |
| POST | `/payments/webhook` | Razorpay (signed) | `payment.captured`, `order.paid`, `payment.failed` |

### Attendance

| Method | Endpoint | Access | Notes |
|---|---|---|---|
| POST | `/attendance` | Admin, batch's teacher | One record per batch per day; saving a date again updates it |
| GET | `/attendance/batch/:batchId` | Admin, batch's teacher | History by date |
| GET | `/attendance/batch/:batchId/date/:date` | Admin, batch's teacher | One day, to pre-fill the form |
| GET | `/attendance/my` | Student | Overall and per-batch percentages |

### Notices

| Method | Endpoint | Access | Notes |
|---|---|---|---|
| GET | `/notices` | Any role | Filtered by role. Pinned first. `?batch=`, `?before=`, `?limit=` |
| GET | `/notices/unread-count` | Any role | Unread badge |
| POST | `/notices/seen` | Any role | Marks all as read |
| POST | `/notices` | Admin, teacher | Admin: everyone or any batch. Teacher: own batches |
| PATCH | `/notices/:id` | Author or admin | Title, message, pin, "show until" |
| DELETE | `/notices/:id` | Author or admin | |

Who sees what: admins see all notices; teachers see notices for everyone plus their own batches; students see notices for everyone plus the batches they're currently enrolled in. Messages are plain text and never rendered as HTML.

### Dashboards

| Method | Endpoint | Access | Notes |
|---|---|---|---|
| GET | `/dashboard/admin` | Admin | Counts, fees collected and pending, batches, today's classes |
| GET | `/dashboard/admin/analytics` | Admin | Per month: fees received (online and offline), new enrollments, attendance rate. `?months=3` to `12`, default 6 |
| GET | `/dashboard/teacher` | Teacher | Own batches and upcoming classes |
| GET | `/dashboard/student` | Student | Enrollments, attendance, fees due, upcoming classes |

## How payments work

```
Student ── Pay now ──▶ API: create order (amount from the batch fee) ──▶ Razorpay
Razorpay Checkout ── success ──▶ API: /verify
    checks HMAC_SHA256(stored order_id + "|" + payment_id, key secret)
    valid → payment and enrollment marked paid, receipt emailed
Razorpay ── signed webhook ──▶ API: /webhook   (if the browser closed before /verify)
Student or admin ── Check status ──▶ API: /sync   (asks Razorpay directly)
```

- The server never takes the browser's word that a payment succeeded. Only a valid signature, a signed webhook or Razorpay's own API can mark a fee paid.
- The signature is checked against the order ID stored on the server, not the one the browser sends back.
- `/verify`, the webhook and `/sync` can all run for the same payment; only the first one changes anything and sends the receipt. Repeated webhook deliveries are recognised by their event ID.
- A late `payment.failed` event can never undo a successful payment.
- Clicking Pay twice, or in two tabs, reuses the same open order, so a fee can't be paid twice.
- Amounts are stored in paise (whole numbers) for Razorpay; batch fees are in rupees.

**Webhook setup (optional):** Razorpay Dashboard → Webhooks → Add. URL: `https://<render-host>/api/v1/payments/webhook`. Events: `payment.captured`, `payment.failed`, `order.paid`. Put the secret you choose into `RAZORPAY_WEBHOOK_SECRET`.

## Implementation approach

The frontend is a React single-page app. It talks only to a stateless Express REST API, and the API is the only place business rules live: roles, batch ownership, capacity, attendance rules and payment state are all checked on the server, and the frontend's route guards exist only for navigation.

The main decisions:

- **Sessions.** A 15-minute access token kept in memory, plus a 7-day refresh token in an httpOnly cookie that JavaScript can't read. Refresh tokens are stored hashed and replaced on every use. If an old one is used again, that whole login is ended, since it means the token was copied. Each user also has a token version inside their access tokens: changing or resetting a password, signing out everywhere or being deactivated ends existing sessions immediately.
- **One origin.** Locally, Vite forwards `/api` to the API; in production, `vercel.json` rewrites `/api/*` to Render. The browser only ever talks to one site, so the refresh cookie isn't blocked as a third-party cookie (Safari and Firefox block those).
- **Roles.** One `users` collection with a `role` field. Public sign-up only creates students. Teachers and students are created by an admin; admins only by the seed script.
- **Capacity.** After an enrollment is written, active seats are counted again. If two admins took the last seat at the same moment, the later request undoes its own write, so a batch can't go over capacity.
- **Money.** Each enrollment stores the amount actually received and when (`amountPaid`, `paidAt`). Editing a batch fee or dropping a student who paid never changes past revenue, and analytics put each payment in the right month.
- **Attendance.** One document per batch per day holding every student's mark, with a unique index on batch and date. Marking a class is a single write, and saving the same date again updates it. Only the batch's teacher or an admin can mark it, only for active batches, never for future dates. "Today" is calculated in IST.
- **History is kept.** Archiving a batch, dropping a student and deactivating a user are soft changes, so attendance and payment history stay intact.
- **Security.** bcrypt for passwords, Zod validation on every write route, Helmet headers, CORS limited to the frontend, rate limits on login and password endpoints, HTTPS in production, search input escaped, and no stack traces in production responses. Password reset tokens are random, stored hashed, single use and expire in 15 minutes, and the forgot-password form answers the same way for unknown emails.
- **Email never blocks.** Emails are sent in the background; if sending fails, the signup or payment still succeeds.
- **Profile photos** are cropped and shrunk to 256×256 in the browser before upload. The server checks the file's actual bytes (not its name) and stores it in MongoDB, so no extra storage service is needed.

## Project structure

```
client/
  src/
    api/          Axios instance and one file of API calls per resource
    components/   shared UI, layout, brand, dashboard, payment and profile components
    context/      AuthContext (session) and ToastContext
    hooks/        data fetching, Razorpay payment flow, UI helpers
    pages/        admin, teacher, student, attendance, payments, notices, profile, auth
    utils/        formatting, validation, attendance helpers
  vercel.json     /api rewrite to Render and SPA fallback
server/
  src/
    config/       database connection, Razorpay client, environment checks
    models/       User, RefreshToken, Batch, Enrollment, Attendance, Payment,
                  WebhookEvent, Notice, Avatar
    routes/       /api/v1 routers
    middleware/   auth and role guards, validation, rate limits, error handler
    validations/  Zod schemas
    controllers/  request handlers
    services/     payments, sessions, email
    utils/        JWT, bcrypt, dates, class schedule
    scripts/      seed scripts and test suites
```

## Deployment

1. **MongoDB Atlas:** free M0 cluster. In Network Access allow `0.0.0.0/0`. Use a connection string ending in `/edubatch?...`.
2. **Email (Brevo, free):** Render's free tier blocks the usual SMTP ports (25, 465, 587), so production uses Brevo on port 2525. Verify a sender address, create an SMTP key, and set `SMTP_HOST=smtp-relay.brevo.com`, `SMTP_PORT=2525`, `SMTP_SECURE=false`, `SMTP_USER` (the SMTP login Brevo shows), `SMTP_PASS` (the SMTP key) and `EMAIL_FROM`.
3. **API on Render:** New Web Service from the repo. Root directory `server`, build `npm install`, start `npm start`, health check `/health`. Environment:

   ```
   NODE_ENV=production
   MONGO_URI=<atlas uri with /edubatch>
   JWT_SECRET=<long random string>
   CLIENT_URL=https://<your-app>.vercel.app
   APP_URL=https://<your-app>.vercel.app
   TRUST_PROXY_HOPS=2
   COOKIE_SAMESITE=lax
   DEMO_PROTECTED_EMAILS=admin@edubatch.com,teacher@edubatch.com,student@edubatch.com
   RAZORPAY_KEY_ID=rzp_test_...
   RAZORPAY_KEY_SECRET=...
   RAZORPAY_WEBHOOK_SECRET=...
   SMTP_HOST=smtp-relay.brevo.com
   SMTP_PORT=2525
   SMTP_SECURE=false
   SMTP_USER=...
   SMTP_PASS=...
   EMAIL_FROM=EduBatch <verified-sender@example.com>
   ```

4. **Seed the live database** from your machine (Render's free tier has no shell): in `server/`, set `MONGO_URI` to the same value as on Render and run `npm run seed`. In PowerShell: `$env:MONGO_URI="<uri>"; npm run seed`.
5. **Frontend on Vercel:** import the repo, root directory `client`, framework Vite, environment `VITE_API_URL=/api/v1`. `client/vercel.json` rewrites `/api/*` to `https://edubatch-api-7b76.onrender.com`; change it if your Render URL is different.
6. **Razorpay webhook (optional):** point it directly at Render (not Vercel), as described in [How payments work](#how-payments-work).
7. **Check:** `/health` on Render returns OK; each demo account can log in on the Vercel URL; reloading keeps you logged in; a test payment with `success@razorpay` marks the fee paid and sends a receipt.

Pushes to `main` deploy both automatically. Work is done on feature branches and merged through pull requests.

## Assumptions

- One institute per deployment. All dates and "today" use `APP_TIMEZONE` (IST by default).
- Admin accounts come only from the seed script. The app creates teachers and students; the admin sets a first password and shares it, and the user changes it from Profile.
- Admins can mark attendance for any batch, as cover for an absent teacher; teachers only for their own. Every record stores who marked it.
- Late counts as attended. 75% is used as the required attendance.
- Upcoming classes are worked out from each batch's weekly schedule between its start and end dates. There is no holiday calendar.
- Deactivating a student keeps their seats and history; the admin drops seats from Enrollments if needed.

## Known limitations

| Limitation | Notes |
|---|---|
| Refunds | Done from the Razorpay dashboard. The app won't change an online-paid fee back to pending |
| Receipts | A printable page (save as PDF from the browser) and an email. No server-generated PDF |
| Notices | In-app only, no email, SMS or push delivery. No attachments |
| Multi-institute | Out of scope; one institute per deployment |
| Free hosting | The API sleeps when idle, so the first request can take up to a minute |
| Email deliverability | Sent through Brevo from a personal address without a custom domain, so emails may land in spam |
| Rate limits | Kept in memory; running several API instances would need a shared store such as Redis |
| Sessions | "Sign out of all devices" exists, but there's no list of individual devices |

## Troubleshooting

| Problem | Fix |
|---|---|
| `MongoDB connection failed … IP that isn't whitelisted` | Atlas → Network Access → add your IP (or `0.0.0.0/0`) and wait until it shows Active |
| Demo login says "Invalid email or password" | The seed went to a different database than the API uses. Check `MONGO_URI` includes the same database name in both places, then run `npm run seed` again |
| Requests go to `https://localhost` or fail with `ERR_SSL_PROTOCOL_ERROR` | `NODE_ENV=production` in your local `server/.env`. Set it to `development`, restart, and clear the browser cache (browsers remember HTTPS redirects) |
| Logged out on every reload | `VITE_API_URL` in `client/.env` is a full URL. Set it to `/api/v1` and restart the frontend |
| "Too many failed attempts" | Login rate limit: 10 failed attempts per 15 minutes. Wait, or restart the API locally. Successful logins don't count |
| No reset email | Without SMTP settings the link is printed in the API terminal. With SMTP, check spam |
| Paying a fee fails locally with a payment configuration error | Add Razorpay test keys to `server/.env` and restart the API |
| First request to the live site is slow | Render's free instance is waking up; wait up to a minute |