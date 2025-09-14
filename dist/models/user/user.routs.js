"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const user_controllers_1 = require("./user.controllers");
const router = express_1.default.Router();
router.post("/register", user_controllers_1.registerUser);
router.post("/login", user_controllers_1.authUser);
router.get("/:id", user_controllers_1.getUserProfile);
exports.default = router;
