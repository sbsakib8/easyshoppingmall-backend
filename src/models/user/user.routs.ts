import express from "express";
import { registerUser, authUser, getUserProfile } from "./user.controllers";
import { protect } from "../../middlewares/user.middlewares";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", authUser);
router.get("/:id", getUserProfile);

export default router;
