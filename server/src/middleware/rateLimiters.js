import rateLimit from "express-rate-limit";

const limited = (message) => ({ success: false, data: null, message });

const make = (options) =>
  rateLimit({
    standardHeaders: "draft-7",
    legacyHeaders: false,
    ...options,
  });

// Login/register: only failed attempts count, so a reviewer switching between the
// three demo accounts is never locked out, while password guessing still is.
export const authLimiter = make({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  message: limited("Too many failed attempts. Try again in 15 minutes."),
});

// Every request counts: stops using the form to spam someone's inbox
export const forgotPasswordLimiter = make({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: limited("Too many reset requests. Try again in 15 minutes."),
});

export const resetPasswordLimiter = make({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: limited("Too many attempts. Request a new reset link in 15 minutes."),
});

// Keyed per user (route is behind `protect`): stops guessing the current password
export const changePasswordLimiter = make({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `user:${req.user?._id}`,
  message: limited("Too many failed attempts. Try again in 15 minutes."),
});

export const refreshLimiter = make({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  message: limited("Too many requests. Try again shortly."),
});
