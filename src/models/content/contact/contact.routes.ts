import express from "express";
import { createMessage, deleteMessage, getMessages } from "./contact.controllers";
import { isAuth } from "../../../middlewares/isAuth";
import { isAdmin } from "../../../middlewares/isAdmin";

const router = express.Router();

router.post("/create", createMessage);
router.get("/get",isAuth,isAdmin, getMessages);
router.delete("/:id",isAuth,isAdmin, deleteMessage);

export default router;
