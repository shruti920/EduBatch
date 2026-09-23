import { z } from "zod";

// Zod v4 uses `error` for custom messages (`required_error` was removed)
const email = z
  .string({ error: "Email is required" })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Enter a valid email address" }));

export const registerSchema = z.object({
  name: z
    .string({ error: "Name is required" })
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters"),
  email,
  password: z
    .string({ error: "Password is required" })
    .min(6, "Password must be at least 6 characters")
    .max(72, "Password cannot exceed 72 characters"),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s]{0,20}$/, "Enter a valid phone number")
    .optional(),
});

export const loginSchema = z.object({
  email,
  password: z.string({ error: "Password is required" }).min(1, "Password is required"),
});
