import AppError from "../utils/AppError.js";

/**
 * Higher-order middleware to validate request bodies against a Zod schema.
 * @param {import('zod').ZodSchema} schema
 */
export const validateBody = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    const formattedErrors = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join(".") || "error";
      formattedErrors[key] = issue.message;
    }

    const firstErrorMessage =
      result.error.issues[0]?.message || "Validation failed";

    return next(new AppError(firstErrorMessage, 400, formattedErrors));
  }

  // Assign parsed/sanitized data back to req.body
  req.body = result.data;
  next();
};

export default validateBody;
