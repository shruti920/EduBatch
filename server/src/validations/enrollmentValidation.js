import { z } from "zod";
import { objectId } from "./common.js";

const paymentStatus = z.enum(["pending", "paid", "waived"], {
  error: "Payment status must be pending, paid, or waived",
});

export const enrollStudentSchema = z.object({
  student: objectId("Student"),
  batch: objectId("Batch"),
  // Admin can record an offline payment or a waiver at enrollment time
  paymentStatus: paymentStatus.optional().default("pending"),
});

export const updateEnrollmentStatusSchema = z
  .object({
    paymentStatus: paymentStatus.optional(),
    isActive: z.boolean().optional(),
  })
  .refine((b) => b.paymentStatus !== undefined || b.isActive !== undefined, {
    message: "Nothing to update",
  });
