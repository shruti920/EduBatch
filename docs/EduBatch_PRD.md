# EduBatch — Product & Engineering Plan

**Author:** Shruti Gupta · **Timeline:** 4 calendar days · **Stack:** React + Vite + Tailwind, Node + Express, MongoDB, Razorpay

---

## 1. What this document is

This is the build plan for the EduBatch MVP assignment. It follows the assignment brief's own instruction: *"you may prioritize the documented MVP features and demonstrate your ability to make sensible implementation decisions within a constrained timeline."*

Their own documentation (Development Steps, p.12) estimates this MVP at **3–5 weeks full-time** for a solo developer. This plan compresses that into 4 days by explicitly tiering scope — P0 is what gets built to a solid standard, P1 is built if time allows, P2 is documented as a clear next step rather than half-built. This tiering itself is a demonstration of the "sensible prioritization" they're evaluating for, and it's explicitly permitted by their brief.

---

## 2. Scope triage

| Tier | Modules | Reasoning |
|---|---|---|
| **P0 — must ship, done well** | Auth (JWT + RBAC), Batch Management, Student Enrollment, Razorpay payment flow, Admin/Teacher/Student dashboards | These cover every item in the evaluator's own criteria: architecture, DB design, API design, auth/security, and payment integration. |
| **P1 — ship if on schedule** | Attendance marking, Notices/announcements | High visual payoff, low implementation cost once P0 patterns exist (same CRUD + role-guard shape as Batches). |
| **P2 — document, don't build** | Profile management polish, receipt PDF generation, password-reset email flow | Genuinely nice-to-have. Note these explicitly in the README as "not implemented — here's how I'd approach it" rather than shipping a broken half-version. |

A working, secure, deployed P0 beats a sprawling, half-broken full scope. Evaluators reviewing 4-day assignments look for judgment, not just checkbox coverage.

---

## 3. System architecture

Three tiers: a React SPA, a stateless Express API, and MongoDB — with Razorpay and an email service as external dependencies the API calls out to. The frontend never talks to MongoDB or Razorpay directly; everything routes through the API so auth and validation happen in one place. (See the architecture diagram shared above.)

**Request lifecycle for any authenticated action:**
1. Client sends `Authorization: Bearer <token>` with the request.
2. Express middleware verifies the JWT and attaches `req.user`.
3. A role-guard middleware checks `req.user.role` against the route's allowed roles.
4. The controller validates the request body (Zod), then calls a service function.
5. The service talks to Mongoose models (and Razorpay, if it's a payment route).
6. Response returns as `{ success, data, message }` — always this shape, so the frontend has one response contract to handle.

---

## 4. Database design

Six collections. (See the ERD shared above for the full field list and relationships.)

- **users** — one collection for all three roles, distinguished by a `role` enum. Simpler than separate collections per role, and role changes don't require moving documents.
- **batches** — owns schedule, capacity, fee, and a `teacher` reference. `status` (upcoming/active/archived) drives what shows on dashboards.
- **enrollments** — the join between a student and a batch. Carries `paymentStatus` so you can enroll a student before payment clears (useful for admin-added students who pay offline).
- **payments** — one document per Razorpay order, holding `razorpayOrderId`, `razorpayPaymentId`, and `razorpaySignature` for server-side verification. Never trust a client-reported "payment successful" — the signature check is what actually confirms it.
- **attendance** — one document per batch per date, with a `records` array of `{ student, status }`, rather than one document per student per day. Fewer writes, and "mark the whole class" is a single update.
- **notices** — batch-scoped by default; `batch: null` means a global notice.

**Design decision worth stating in your README:** capacity validation happens in the enrollment service, not just the frontend — check current active enrollment count against `batch.capacity` before creating a new enrollment, inside the same request. This is exactly the kind of trade-off the evaluator's criteria calls out ("problem-solving ability... attention to detail").

---

## 5. API contract (P0 scope)

```
POST   /api/v1/auth/register        Public
POST   /api/v1/auth/login           Public          → { accessToken, refreshToken }
GET    /api/v1/auth/me              Authenticated

GET    /api/v1/batches              Authenticated   (role-filtered: teacher sees own, student sees enrolled)
POST   /api/v1/batches              Admin
PUT    /api/v1/batches/:id          Admin
PATCH  /api/v1/batches/:id/status   Admin

POST   /api/v1/enrollments          Admin           (capacity check happens here)
GET    /api/v1/enrollments/my       Student

POST   /api/v1/payments/create-order   Student      → Razorpay orderId
POST   /api/v1/payments/verify         Student      → server-side signature check

GET    /api/v1/dashboard/admin      Admin           → counts, revenue, pending fees
GET    /api/v1/dashboard/teacher    Teacher         → assigned batches, today's classes
GET    /api/v1/dashboard/student    Student         → enrolled batches, fee status
```

P1 adds `/attendance` and `/notices` following the identical pattern (route → role guard → validate → service → model).

---

## 6. Payment flow (Razorpay, test mode)

1. Student clicks "Pay now" on a pending enrollment.
2. Frontend calls `POST /payments/create-order` with the enrollment ID.
3. Server creates a Razorpay order (amount in paise), saves a `Payment` doc with `status: created`, returns `orderId` + public key.
4. Client opens Razorpay Checkout with that `orderId`.
5. On success, Razorpay returns `paymentId` + `signature` to the client.
6. Client calls `POST /payments/verify` with all three values.
7. **Server verifies the signature using the key secret before marking anything paid.** This is the one step that's non-negotiable for security — never mark a payment successful based on what the client claims.

Use Razorpay test/sandbox keys throughout. Never commit real keys, and say so explicitly in `.env.example`.

---

## 7. Day-by-day plan

### Day 1 — Foundation (P0)
- Repo setup: `client/` (Vite + React + Tailwind) and `server/` (Express) as a monorepo.
- MongoDB Atlas cluster + connection config.
- `User` model, `bcrypt` password hashing, JWT issue/verify, role-guard middleware.
- Register/login pages, `AuthContext`, protected route wrapper on the frontend.
- **End of day 1 checkpoint:** you can register as admin/teacher/student and land on a role-specific empty dashboard shell.

### Day 2 — Core domain (P0)
- `Batch` model + full CRUD (admin), batch list/detail views.
- `Enrollment` model + capacity-checked enrollment endpoint.
- Three dashboard shells wired to real data: counts, active batches, pending fees (static queries are fine — skip charts).
- **End of day 2 checkpoint:** admin can create a batch, enroll a student, capacity blocks the batch when full.

### Day 3 — Payments + P1 stretch
- Razorpay create-order + verify endpoints, checkout integration on the frontend, payment history view.
- If on schedule: Attendance (mark + view) and Notices (create + batch-scoped feed).
- **End of day 3 checkpoint:** a student can pay a fee end-to-end in test mode and see their status flip to paid.

### Day 4 — Security, polish, deploy
- Helmet, CORS lock to your frontend origin, rate limiting on `/auth/*`, input validation on every write route.
- Responsive pass on the three dashboards and the enrollment/payment flows specifically (these are what a reviewer will click first).
- Deploy: frontend → Vercel, backend → Render, DB → Atlas (whitelist Render's IP or allow all for evaluation).
- Seed script creating one admin, one teacher, two students with demo data.
- README: setup instructions, `.env.example`, API docs, demo credentials, and an honest "what's not implemented and why" section covering P2 (and P1 items if they slipped).

---

## 8. Security checklist (non-negotiable even under time pressure)

- [ ] bcrypt, salt rounds ≥ 10
- [ ] JWT verified on every protected route, role checked server-side (never trust a client-sent role)
- [ ] Razorpay signature verified server-side before marking a payment paid
- [ ] Input validated on every write endpoint (Zod)
- [ ] `.env` in `.gitignore`; only `.env.example` committed, with placeholder values
- [ ] CORS restricted to your deployed frontend origin, not `*`
- [ ] Helmet enabled
- [ ] Rate limiting on `/auth/login` and `/auth/register`

---

## 9. Design system (UI direction)

Grounded in what this actually is: a tool coaching institutes use daily to run batches, collect fees, and track attendance. It should feel precise and trustworthy — closer to an admit card or a mark sheet than a consumer app. Avoid the generic SaaS look (rounded cards, soft grey shadows, one accent color used everywhere).

**Typography**
- **Headings / brand:** `Newsreader` — an editorial serif with an academic, exam-hall-notice feel. Used only for page titles and the logo wordmark, nowhere else.
- **UI / body / tables:** `IBM Plex Sans` — built for dense, data-heavy interfaces (it's IBM's own product font), reads cleanly at small sizes for attendance grids and fee tables. This is your workhorse font for 95% of the interface.
- Both load free from Google Fonts.

**Color**
| Role | Hex | Use |
|---|---|---|
| Ink (primary) | `#1B2A4A` | Headers, primary buttons, nav |
| Paper (background) | `#F7F6F2` | Page background — warm but not the cliché cream |
| Marigold (accent) | `#D99A2B` | Active states, highlighted fee-due badges — ties to the Indian academic/results visual language without being literal |
| Success | `#2F6E4F` | Paid, present |
| Attention | `#B23A32` | Pending, absent, overdue |
| Text | `#22242B` | Body copy on paper background |

**Layout principles**
- Left-aligned content, dashboards use a fixed sidebar + content area — not a centered marketing layout.
- Status is always color **and** text/icon together (e.g. a "Paid" pill, not just a green dot) — don't rely on color alone, this matters for accessibility and for teachers scanning fee status quickly.
- No decorative numbered steps or eyebrow labels on dashboard cards — those belong on a landing page, not a working tool.

---

## 10. Submission checklist (from the brief)

- [ ] GitHub repo — clean structure, meaningful commits, proper `.gitignore`
- [ ] Live frontend URL (Vercel)
- [ ] Live backend/API URL (Render)
- [ ] Admin, teacher, and student demo credentials
- [ ] README with setup, API docs, DB setup, and assumptions/limitations
- [ ] `.env.example`
- [ ] Brief written note on implementation approach and trade-offs made under the 4-day constraint — this is where the P0/P1/P2 triage from section 2 goes, stated plainly and confidently, not as an apology
