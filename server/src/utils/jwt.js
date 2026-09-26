import jwt from "jsonwebtoken";

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set. Add it to server/.env before starting the API.");
  }
  return secret;
};


export const accessTokenTtl = () => process.env.JWT_ACCESS_EXPIRES_IN || "15m";

export const signToken = (payload) => jwt.sign(payload, getJwtSecret(), { expiresIn: accessTokenTtl() });


export const signAccessToken = (user) =>
  signToken({ id: user._id.toString(), role: user.role, tv: user.tokenVersion || 0 });

export const verifyToken = (token) => jwt.verify(token, getJwtSecret());
