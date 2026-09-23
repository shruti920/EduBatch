import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const enrollStudentSchema = z.object({
  student: z
    .string({ required_error: "Candidate student ID is required" })
    .regex(objectIdRegex, "Invalid student ObjectId format"),
  batch: z
    .string({ required_error: "Cohort batch ID is required" })
    .regex(objectIdRegex, "Invalid batch ObjectId format"),
  paymentStatus: z
    .enum(["pending", "paid", "waived"])
    .optional()
    .default("pending"),
});

export const updateEnrollmentStatusSchema = z.object({
  paymentStatus: z.enum(["pending", "paid", "waived"]).optional(),
  isActive: z.boolean().optional(),
});
