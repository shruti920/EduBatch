import { z } from "zod";

// Zod v4 uses `error` for custom messages (`required_error` was removed)
export const email = z
  .string({ error: "Email is required" })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Enter a valid email address" }));

export const name = z
  .string({ error: "Name is required" })
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(100, "Name cannot exceed 100 characters");

export const phone = z
  .string()
  .trim()
  .regex(/^[0-9+\-\s]{0,20}$/, "Enter a valid phone number");

// One rule for every new password: register, admin-created, change, reset.
// 72 is bcrypt's input limit; longer input would be silently truncated.
export const newPassword = z
  .string({ error: "Password is required" })
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password cannot exceed 72 characters")
  .regex(/[A-Za-z]/, "Password must include a letter")
  .regex(/[0-9]/, "Password must include a number");

export const registerSchema = z.object({
  name,
  email,
  password: newPassword,
  phone: phone.optional(),
});

export const loginSchema = z.object({
  email,
  password: z.string({ error: "Password is required" }).min(1, "Password is required").max(200),
});

export const updateProfileSchema = z
  // Avatar is set by uploading a photo (PUT /auth/me/avatar), not by URL
  .object({ name, phone })
  .partial()
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: "Nothing to update" });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string({ error: "Current password is required" }).min(1, "Current password is required"),
    newPassword,
  })
  .refine((v) => v.currentPassword !== v.newPassword, {
    message: "New password must be different from the current one",
    path: ["newPassword"],
  });

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z.object({
  token: z.string({ error: "Reset link is invalid" }).regex(/^[a-f0-9]{64}$/, "Reset link is invalid"),
  password: newPassword,
});
