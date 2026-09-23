import { z } from "zod";
import { objectId } from "./common.js";

const recordItemSchema = z.object({
  student: objectId("Student"),
  status: z.enum(["present", "absent", "late"], {
    error: "Status must be present, absent, or late",
  }),
  remarks: z.string().trim().max(200, "Remarks cannot exceed 200 characters").optional().default(""),
});

export const markAttendanceSchema = z.object({
  batch: objectId("Batch"),
  date: z
    .string({ error: "Date is required" })
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  records: z.array(recordItemSchema).min(1, "Add at least one student record"),
});
