import { z } from "zod";
import { objectId } from "./common.js";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

const scheduleSchema = z
  .object({
    days: z.array(z.enum(DAYS)).min(1, "Pick at least one class day"),
    startTime: z.string().regex(TIME, "Start time must be HH:MM (24h)"),
    endTime: z.string().regex(TIME, "End time must be HH:MM (24h)"),
    venue: z.string().trim().max(100, "Venue cannot exceed 100 characters").optional(),
  })
  .refine((s) => s.endTime > s.startTime, {
    message: "End time must be after start time",
    path: ["endTime"],
  });

const dateString = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date")
  .nullable()
  .optional();

const batchFields = {
  name: z
    .string({ error: "Batch name is required" })
    .trim()
    .min(3, "Batch name must be at least 3 characters")
    .max(120, "Batch name cannot exceed 120 characters"),
  subject: z
    .string({ error: "Subject is required" })
    .trim()
    .min(2, "Subject must be at least 2 characters")
    .max(100, "Subject cannot exceed 100 characters"),
  description: z.string().trim().max(1000, "Description cannot exceed 1000 characters").optional(),
  startDate: dateString,
  endDate: dateString,
  schedule: scheduleSchema,
  capacity: z
    .number({ error: "Capacity must be a number" })
    .int("Capacity must be a whole number")
    .min(1, "Capacity must be at least 1")
    .max(500, "Capacity cannot exceed 500"),
  fee: z.number({ error: "Fee must be a number" }).min(0, "Fee cannot be negative"),
  teacher: objectId("Teacher"),
  status: z.enum(["upcoming", "active", "archived"]).optional(),
};

const datesInOrder = (b) => !b.startDate || !b.endDate || new Date(b.endDate) >= new Date(b.startDate);
const datesMessage = { message: "End date cannot be before start date", path: ["endDate"] };

export const createBatchSchema = z.object(batchFields).refine(datesInOrder, datesMessage);

export const updateBatchSchema = z
  .object(batchFields)
  .partial()
  .refine(datesInOrder, datesMessage);

export const batchStatusSchema = z.object({
  status: z.enum(["upcoming", "active", "archived"], {
    error: "Status must be upcoming, active, or archived",
  }),
});
