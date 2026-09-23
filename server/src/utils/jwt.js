import jwt from "jsonwebtoken";

const getJwtSecret = () => {
  return process.env.JWT_SECRET || "edubatch_super_secure_jwt_secret_dev_key_2026";
};

const getJwtExpiresIn = () => {
  return process.env.JWT_EXPIRES_IN || "7d";
};

/**
 * Sign a JWT token with payload.
 * @param {object} payload
 * @returns {string}
 */
export const signToken = (payload) => {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: getJwtExpiresIn(),
  });
};

/**
 * Verify and decode a JWT token.
 * @param {string} token
 * @returns {object}
 */
export const verifyToken = (token) => {
  return jwt.verify(token, getJwtSecret());
};
