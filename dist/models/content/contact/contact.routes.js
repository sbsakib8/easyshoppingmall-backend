"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const contact_controllers_1 = require("./contact.controllers");
const isAuth_1 = require("../../../middlewares/isAuth");
const isAdmin_1 = require("../../../middlewares/isAdmin");
const router = express_1.default.Router();
router.post("/create", contact_controllers_1.createMessage);
router.get("/get", isAuth_1.isAuth, isAdmin_1.isAdmin, contact_controllers_1.getMessages);
router.delete("/:id", isAuth_1.isAuth, isAdmin_1.isAdmin, contact_controllers_1.deleteMessage);
exports.default = router;
