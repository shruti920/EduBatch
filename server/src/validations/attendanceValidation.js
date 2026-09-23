import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const recordItemSchema = z.object({
  student: z
    .string({ required_error: "Candidate student ID is required" })
    .regex(objectIdRegex, "Invalid student ObjectId format"),
  status: z.enum(["present", "absent", "late"], {
    required_error: "Attendance status is required (present, absent, or late)",
  }),
  remarks: z.string().max(200, "Remarks cannot exceed 200 characters").optional().default(""),
});

export const markAttendanceSchema = z.object({
  batch: z
    .string({ required_error: "Cohort batch ID is required" })
    .regex(objectIdRegex, "Invalid batch ObjectId format"),
  date: z
    .string({ required_error: "Attendance register date is required" })
    .refine((val) => !isNaN(Date.parse(val)), {
      message: "Invalid date format. Expected ISO-8601 or YYYY-MM-DD.",
    }),
  records: z
    .array(recordItemSchema)
    .min(1, "Attendance register must contain at least one candidate record"),
});
