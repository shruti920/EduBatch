import jwt from "jsonwebtoken";

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set. Add it to server/.env before starting the API.");
  }
  return secret;
};

const getJwtExpiresIn = () => process.env.JWT_EXPIRES_IN || "1d";

export const signToken = (payload) =>
  jwt.sign(payload, getJwtSecret(), { expiresIn: getJwtExpiresIn() });

export const verifyToken = (token) => jwt.verify(token, getJwtSecret());
