import crypto from "crypto";
import Avatar from "../models/Avatar.js";
import AppError from "../utils/AppError.js";

export const AVATAR_MAX_BYTES = 300 * 1024;
const EXT = { "image/webp": "webp", "image/png": "png", "image/jpeg": "jpg" };

/**
 * Identify the image from its first bytes, never from the declared Content-Type
 * or a file name, so a renamed file or HTML can't be stored as an "image".
 */
export const sniffImageType = (buf) => {
  if (!Buffer.isBuffer(buf) || buf.length < 12) return null;
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (buf[0] === 0x89 && buf.toString("ascii", 1, 4) === "PNG") return "image/png";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  return null;
};

// PUT /auth/me/avatar — body is the raw image bytes
export const uploadAvatar = async (req, res, next) => {
  try {
    const data = req.body;
    if (!Buffer.isBuffer(data) || data.length === 0) {
      return next(new AppError("Choose an image to upload.", 400));
    }
    const contentType = sniffImageType(data);
    if (!contentType) {
      return next(new AppError("Upload a JPG, PNG or WebP image.", 400));
    }

    const key = crypto.randomBytes(12).toString("hex");
    await Avatar.findOneAndUpdate(
      { user: req.user._id },
      { user: req.user._id, key, contentType, data, size: data.length },
      { upsert: true, setDefaultsOnInsert: true }
    );

    req.user.avatar = `/api/v1/avatars/${req.user._id}/${key}.${EXT[contentType]}`;
    await req.user.save();

    res.status(200).json({ success: true, data: { user: req.user.toJSON() }, message: "Photo updated." });
  } catch (error) {
    next(error);
  }
};

// DELETE /auth/me/avatar
export const deleteAvatar = async (req, res, next) => {
  try {
    await Avatar.deleteOne({ user: req.user._id });
    req.user.avatar = "";
    await req.user.save();
    res.status(200).json({ success: true, data: { user: req.user.toJSON() }, message: "Photo removed." });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /avatars/:userId/:file — public, because <img> can't send an auth header.
 * The random key in the file name acts as the access token; a stale or guessed
 * key is a 404.
 */
export const getAvatar = async (req, res, next) => {
  try {
    const [key] = String(req.params.file || "").split(".");
    if (!/^[a-f0-9]{24}$/.test(key)) return next(new AppError("Not found.", 404));

    const avatar = await Avatar.findOne({ user: req.params.userId, key });
    if (!avatar) return next(new AppError("Not found.", 404));

    res.set({
      "Content-Type": avatar.contentType,
      "Content-Length": avatar.size,
      // The URL changes whenever the photo does, so it can be cached forever
      "Cache-Control": "public, max-age=31536000, immutable",
      // Even if opened directly, nothing in this response can run
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'",
    });
    res.status(200).end(avatar.data);
  } catch (error) {
    next(error);
  }
};
