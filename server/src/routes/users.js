import express from "express";
import { createUser, listUsers, updateUserStatus } from "../controllers/userController.js";
import { protect, restrictTo } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { createUserSchema, updateUserStatusSchema } from "../validations/userValidation.js";

const router = express.Router();

router.use(protect, restrictTo("admin"));

router.get("/", listUsers);
router.post("/", validateBody(createUserSchema), createUser);
router.patch("/:id/status", validateBody(updateUserStatusSchema), updateUserStatus);

export default router;
