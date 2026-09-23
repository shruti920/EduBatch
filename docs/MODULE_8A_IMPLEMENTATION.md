# Module 8a — Auth completion, Profile, Email, Users, Dashboard fixes

Gap analysis against the assignment email found that Modules 0–7 matched the internal
build plan, but the plan was narrower than the brief. This module closes every
mandatory gap. All 9 server test suites pass; client builds and lints clean.

## 1. Gaps found (before this module)

| Brief requirement | State before | Now |
|---|---|---|
| A. Password reset | Missing | Forgot/reset with emailed single-use link |
| A. JWT auth (spec §7.1 `/auth/refresh`, §10 refresh + httpOnly) | 1-day token in localStorage | 15-min access token in memory + rotating httpOnly refresh cookie |
| H. Profile management | Missing | Profile page: name, phone, avatar, change password, sign out everywhere |
| Mandatory stack: Nodemailer/Resend | Not installed | Nodemailer, 5 transactional templates |
| Mandatory stack: React 18 | React 19 | React 18.3 |
| Spec §4 "Admin: manage users" | Seed script only | Users page: create teacher/student, activate/deactivate |
| G. Upcoming classes | Missing | Computed from batch schedules on all 3 dashboards |
| G. Revenue | Recomputed from current fee over active seats (wrong) | Frozen `amountPaid` per enrollment |
| Testing checklist: reset flow, token refresh, receipt email | Would fail | Covered by `testAccount.js` |

## 2. Bugs found and fixed

1. **Tests could never fail.** 51 `console.assert` calls in testAuth/testBatches/testEnrollments/testRoleGuard
   print and continue, exit code 0. Replaced with `check()` (`scripts/_check.js`), which throws.
2. **Revenue drifted.** Editing a batch fee rewrote history; a paid student who was dropped vanished
   from revenue; dashboard total didn't match the Payments page. Fixed with `Enrollment.amountPaid`.
3. **Double charge on re-enroll.** Re-enrolling a student whose fee was paid online reset it to the
   admin's chosen status (usually pending). Online-paid status is now preserved.
4. **Email would silently fail in production.** Render free tier blocks SMTP 25/465/587 (since Sept 2025).
   Documented Brevo on port 2525; transport has 10s connect timeouts so nothing hangs.
5. **CORS silently fell back to localhost** in production when `CLIENT_URL` was missing. Startup now fails.
6. `seedAttendance.js` used the deprecated Mongoose `new: true` option.

## 3. Implementation plan (as executed)

| Step | Work | Files |
|---|---|---|
| 1 | Env validation, fail-fast in production | `config/env.js`, `server.js` |
| 2 | Session model: RefreshToken collection (hashed, TTL index), rotation + reuse detection, `tokenVersion` | `models/RefreshToken.js`, `models/User.js`, `services/tokenService.js`, `utils/jwt.js`, `middleware/auth.js` |
| 3 | Auth endpoints: refresh, logout, logout-all, profile, change/forgot/reset password | `controllers/authController.js`, `routes/auth.js`, `validations/authValidation.js` |
| 4 | Rate limiters in one place | `middleware/rateLimiters.js` |
| 5 | Email service + templates, log transport for dev/tests | `services/emailService.js` |
| 6 | Hook emails into payments (receipt) and enrollments (confirmation) | `services/paymentService.js`, `controllers/enrollmentController.js` |
| 7 | Admin user management | `controllers/userController.js`, `routes/users.js`, `validations/userValidation.js` |
| 8 | Revenue fix + upcoming classes | `models/Enrollment.js`, `controllers/dashboardController.js`, `utils/schedule.js` |
| 9 | App wiring: cookie-parser, CORS credentials, HTTPS redirect, trust-proxy hops | `app.js` |
| 10 | Client session: in-memory token, single-flight refresh, 401 retry | `api/axios.js`, `context/AuthContext.jsx` |
| 11 | Client pages | `pages/ForgotPassword.jsx`, `pages/ResetPassword.jsx`, `pages/profile/Profile.jsx`, `pages/admin/Users.jsx` |
| 12 | Dashboard widgets, nav, avatar | `components/dashboard/UpcomingClasses.jsx`, `components/Avatar.jsx`, `components/layout/DashboardLayout.jsx`, 3 dashboards |
| 13 | Same-origin API: Vite proxy + Vercel rewrite | `vite.config.js`, `vercel.json`, `client/.env.example` |
| 14 | React 18 downgrade | `client/package.json`, `package-lock.json` |
| 15 | Tests | `scripts/_check.js`, `scripts/testAccount.js`, `scripts/runTests.js`, `scripts/_assertSafeDb.js` |
| 16 | Docs | `Readme.md`, `server/.env.example`, this file |

## 4. Security decisions (for the interview)

- **Why a refresh cookie and not a longer JWT?** A stolen access token is useful for 15 minutes at most.
  The long-lived credential is httpOnly, so JavaScript (and XSS) can't read it.
- **Why rotation + reuse detection?** If a refresh token leaks and both attacker and user use it,
  the second use of an already-rotated token is detectable; the whole session family is revoked.
- **Why a grace window?** Two tabs refreshing at the same moment present the same cookie. Without a
  30s window the legitimate user would be logged out by their own browser.
- **Why `tokenVersion`?** JWTs can't be revoked individually. One integer per user, compared on every
  request, gives instant revocation for password change, reset, deactivation and "sign out everywhere".
- **Why same-origin via proxy?** Safari and Firefox block third-party cookies. `vercel.json` rewrites
  `/api/*` to Render, so the cookie is first-party and `SameSite=Lax` works.
- **CSRF:** cookie endpoints require `X-Requested-With`; cross-site forms can't set it, and a
  cross-origin fetch that does triggers a preflight our CORS policy rejects. The cookie path is
  `/api/v1/auth`, so it's never sent anywhere else.
- **Account enumeration:** forgot-password answers identically for unknown emails.
- **Reset tokens:** 32 random bytes, stored as SHA-256, 15-minute expiry, single use.
- **Demo accounts:** `DEMO_PROTECTED_EMAILS` stops one reviewer changing a shared password.

## 5. New and changed endpoints

| Method | Endpoint | Access |
|---|---|---|
| POST | `/auth/refresh` | Refresh cookie + `X-Requested-With` |
| POST | `/auth/logout` | Refresh cookie + `X-Requested-With` |
| POST | `/auth/logout-all` | Any role |
| PATCH | `/auth/me` | Any role |
| PATCH | `/auth/change-password` | Any role |
| POST | `/auth/forgot-password` | Public |
| POST | `/auth/reset-password` | Public |
| GET / POST | `/users` | Admin |
| PATCH | `/users/:id/status` | Admin |
| GET | `/dashboard/*` | Now includes `upcomingClasses`; admin `fees` adds `collectedOnline` / `collectedOffline` |

Login and register responses keep the `{ user, token }` shape and additionally set the cookie.

## 6. Tests added (`testAccount.js`, 22 checks)

Register sets HttpOnly cookie scoped to `/api/v1/auth` · weak password rejected · refresh without
CSRF header 403 · refresh rotates · parallel-tab grace · replay revokes family · unknown/missing cookie 401 ·
logout revokes · profile update · `javascript:` avatar / role / email changes rejected · no secrets in
`/auth/me` · change password kills other devices and old access token instantly · forgot-password identical
for unknown email, one email, hash only stored · reset single-use and ends sessions · expired link rejected ·
demo accounts locked · admin creates teacher, welcome email has no password · can't create admin, duplicate
409 · deactivation guards · teacher dashboard upcoming classes · revenue unaffected by fee edit and drop ·
deactivation ends sessions · sign out everywhere.

## 7. Before submitting (manual)

- [ ] `npm test` once against Atlas with `MONGO_URI_TEST` set
- [ ] Deploy per README → Deployment; replace the placeholder in `client/vercel.json`
- [ ] Brevo: verify your sender address, create an SMTP key, use port 2525 on Render
- [ ] On the live site: register with your real email → forgot password → receive link → reset
- [ ] Pay a fee in test mode → receipt email arrives
- [ ] Walk the §15 testing checklist, including a phone-width viewport
- [ ] Fill the live URLs into the README table
