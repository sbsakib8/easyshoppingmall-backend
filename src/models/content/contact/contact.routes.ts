import express from "express";
import { createMessage, deleteMessage, getMessages } from "./contact.controllers";
import { isAuth } from "../../../middlewares/isAuth";
import { isDashboardAccess } from "../../../middlewares/isDashboardAccess";

const router = express.Router();

router.post("/create", createMessage);
router.get("/get",isAuth,isDashboardAccess("content"), getMessages);
router.delete("/:id",isAuth,isDashboardAccess("content"), deleteMessage);

export default router;
