import jwt from "jsonwebtoken";

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set. Add it to server/.env before starting the API.");
  }
  return secret;
};

// Short-lived by design: a stolen access token is only useful for minutes.
// Sessions are kept alive by the rotating refresh token (see services/tokenService.js).
export const accessTokenTtl = () => process.env.JWT_ACCESS_EXPIRES_IN || "15m";

export const signToken = (payload) => jwt.sign(payload, getJwtSecret(), { expiresIn: accessTokenTtl() });

/**
 * `tv` (token version) is copied from the user. Changing or resetting the password,
 * "log out everywhere" and deactivation bump user.tokenVersion, which makes every
 * access token issued before that moment invalid immediately — not in 15 minutes.
 */
export const signAccessToken = (user) =>
  signToken({ id: user._id.toString(), role: user.role, tv: user.tokenVersion || 0 });

export const verifyToken = (token) => jwt.verify(token, getJwtSecret());
