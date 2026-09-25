# Changelog

## Admin analytics, payment and receipt fixes

**Added**
- Admin dashboard "Last 6 months": fees received per month (online solid, offline hatched),
  new enrollments per month, attendance rate against the 75% line, and a this-month vs
  last-month sentence. `GET /api/v1/dashboard/admin/analytics?months=6` (admin only, 3–12 months).
- `Enrollment.paidAt`: when a fee was received (Razorpay capture time, or when an admin marked
  it paid offline), so revenue lands in the right month.

**Fixed**
- Pay buttons: clicking one fee disabled and greyed out every fee, so it looked like all were
  clicked. Now only the clicked fee changes ("Opening…" → "Paying…"); a synchronous lock stops a
  double tap or a second fee from opening a second Checkout.
- Receipt printing produced two pages (the hidden app behind the modal still took up space).
  A dedicated print copy is mounted on `<body>` and the print stylesheet hides the app, so the
  receipt is always one A4 page.
- Login showed "Check your email and password" when the server was unreachable. It now says the
  server couldn't be reached, or that it's waking up.
- Razorpay Checkout used the old navy; now the brand ink blue. Checkout description no longer
  uses a middle dot.
- Analytics bars no longer print "₹0" labels for empty months.
