import { z } from "zod";
import { email, name, newPassword, phone } from "./authValidation.js";

// Admins create teachers and students. New admins come from the seed script only.
export const createUserSchema = z.object({
  name,
  email,
  phone: phone.optional().default(""),
  role: z.enum(["teacher", "student"], { error: "Role must be teacher or student" }),
  password: newPassword,
});

export const updateUserStatusSchema = z.object({
  isActive: z.boolean({ error: "isActive must be true or false" }),
});
