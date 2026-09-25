import express from "express";
import { getAvatar } from "../controllers/avatarController.js";

const router = express.Router();

router.get("/:userId/:file", getAvatar);

export default router;
