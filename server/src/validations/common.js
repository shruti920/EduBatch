import { z } from "zod";

export const objectId = (label) =>
  z
    .string({ error: `${label} is required` })
    .regex(/^[0-9a-fA-F]{24}$/, `${label} is not a valid ID`);
