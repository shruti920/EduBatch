import { z } from "zod";

const validDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const scheduleSchema = z.object({
  days: z.array(z.enum(validDays)).min(1, "At least one scheduled day is required"),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Start time must be HH:MM in 24h format"),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "End time must be HH:MM in 24h format"),
  venue: z.string().trim().optional(),
});

export const createBatchSchema = z.object({
  name: z
    .string({ required_error: "Batch name is required" })
    .trim()
    .min(3, "Batch name must be at least 3 characters")
    .max(120, "Batch name cannot exceed 120 characters"),
  subject: z
    .string({ required_error: "Subject is required" })
    .trim()
    .min(2, "Subject must be at least 2 characters")
    .max(100, "Subject cannot exceed 100 characters"),
  description: z.string().trim().optional(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  schedule: scheduleSchema.optional(),
  capacity: z
    .number({ required_error: "Capacity is required" })
    .int("Capacity must be an integer")
    .min(1, "Capacity must be at least 1")
    .max(500, "Capacity cannot exceed 500"),
  fee: z
    .number({ required_error: "Fee is required" })
    .min(0, "Fee cannot be negative"),
  teacher: z
    .string({ required_error: "Assigned faculty lead is required" })
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid faculty ID format"),
  status: z.enum(["upcoming", "active", "archived"]).optional(),
});

export const updateBatchSchema = createBatchSchema.partial();

export const batchStatusSchema = z.object({
  status: z.enum(["upcoming", "active", "archived"], {
    required_error: "Valid status is required (upcoming, active, archived)",
  }),
});
