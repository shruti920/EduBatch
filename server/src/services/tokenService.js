import crypto from "crypto";
import RefreshToken from "../models/RefreshToken.js";
import User from "../models/User.js";
import AppError from "../utils/AppError.js";
import { signAccessToken } from "../utils/jwt.js";

export const REFRESH_COOKIE = "eb_rt";

const COOKIE_PATH = "/api/v1/auth";

const REUSE_GRACE_MS = 30 * 1000;

const refreshTtlMs = () => Number(process.env.REFRESH_TOKEN_TTL_DAYS || 7) * 24 * 60 * 60 * 1000;

export const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

const cookieOptions = () => {
  const isProd = process.env.NODE_ENV === "production";
 
  const sameSite = (process.env.COOKIE_SAMESITE || "lax").toLowerCase();
  return {
    httpOnly: true,
    secure: sameSite === "none" || isProd,
    sameSite,
    path: COOKIE_PATH,
  };
};

export const setRefreshCookie = (res, rawToken) =>
  res.cookie(REFRESH_COOKIE, rawToken, { ...cookieOptions(), maxAge: refreshTtlMs() });

export const clearRefreshCookie = (res) => res.clearCookie(REFRESH_COOKIE, cookieOptions());

const createRefreshToken = async (user, req, family = crypto.randomUUID()) => {
  const raw = crypto.randomBytes(48).toString("base64url");
  await RefreshToken.create({
    user: user._id,
    tokenHash: sha256(raw),
    family,
    expiresAt: new Date(Date.now() + refreshTtlMs()),
    userAgent: (req.get("user-agent") || "").slice(0, 200),
    ip: req.ip || "",
  });
  return raw;
};

/** Login / register / password change: new access token + a new refresh-token family. */
export const issueSession = async (res, user, req) => {
  const refresh = await createRefreshToken(user, req);
  setRefreshCookie(res, refresh);
  return signAccessToken(user);
};

/**
 * POST /auth/refresh: validates the cookie, rotates it, returns a new access token.
 * Throws 401 for anything that isn't a live token owned by an active user.
 */
export const rotateSession = async (res, rawToken, req) => {
  if (!rawToken) throw new AppError("Please log in to continue.", 401);

  const stored = await RefreshToken.findOne({ tokenHash: sha256(rawToken) });
  if (!stored || stored.expiresAt <= new Date()) {
    clearRefreshCookie(res);
    throw new AppError("Your session has ended. Please log in again.", 401);
  }

  if (stored.revokedAt) {
    const benignRace =
      stored.revokedReason === "rotated" && Date.now() - stored.revokedAt.getTime() < REUSE_GRACE_MS;
    if (!benignRace) {
      // A rotated (or logged-out) token came back: treat it as stolen and end that session everywhere
      if (stored.revokedReason === "rotated") {
        await RefreshToken.updateMany(
          { family: stored.family, revokedAt: null },
          { revokedAt: new Date(), revokedReason: "reuse_detected" }
        );
        console.warn(`Refresh token reuse detected for user ${stored.user} (family ${stored.family})`);
      }
      clearRefreshCookie(res);
      throw new AppError("Your session has ended. Please log in again.", 401);
    }
  }

  const user = await User.findById(stored.user);
  if (!user || !user.isActive) {
    clearRefreshCookie(res);
    throw new AppError("Your session has ended. Please log in again.", 401);
  }

  if (!stored.revokedAt) {
    await RefreshToken.updateOne(
      { _id: stored._id, revokedAt: null },
      { revokedAt: new Date(), revokedReason: "rotated" }
    );
  }

  const next = await createRefreshToken(user, req, stored.family);
  setRefreshCookie(res, next);
  return { user, accessToken: signAccessToken(user) };
};


export const revokeByRawToken = async (rawToken) => {
  if (!rawToken) return;
  await RefreshToken.updateOne(
    { tokenHash: sha256(rawToken), revokedAt: null },
    { revokedAt: new Date(), revokedReason: "logout" }
  );
};


export const revokeAllSessions = async (userId, reason) => {
  await Promise.all([
    RefreshToken.updateMany({ user: userId, revokedAt: null }, { revokedAt: new Date(), revokedReason: reason }),
    User.updateOne({ _id: userId }, { $inc: { tokenVersion: 1 } }),
  ]);
};
