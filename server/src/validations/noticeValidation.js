import { z } from "zod";
import { objectId } from "./common.js";

const title = z
  .string({ error: "Title is required" })
  .trim()
  .min(3, "Title must be at least 3 characters")
  .max(120, "Title cannot exceed 120 characters");

const body = z
  .string({ error: "Message is required" })
  .trim()
  .min(1, "Message is required")
  .max(2000, "Message cannot exceed 2000 characters");

// "YYYY-MM-DD" (end of that day) or a full ISO timestamp; null clears it
const expiresAt = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date")
  .nullable()
  .optional();

export const createNoticeSchema = z.object({
  // null or omitted = everyone (admins only; enforced in the controller)
  batch: objectId("Batch").nullable().optional(),
  title,
  body,
  pinned: z.boolean().optional().default(false),
  expiresAt,
});

// Audience can't change after posting — delete and repost instead
export const updateNoticeSchema = z
  .object({ title, body, pinned: z.boolean(), expiresAt })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: "Nothing to update" });
