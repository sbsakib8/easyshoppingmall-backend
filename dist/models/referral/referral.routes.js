"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const referral_controllers_1 = require("./referral.controllers");
const isAuth_1 = require("../../middlewares/isAuth");
const isAdmin_1 = require("../../middlewares/isAdmin");
const router = express_1.default.Router();
// GET
router.get("/get", referral_controllers_1.getReferralSettings);
// UPDATE
router.put("/update", isAuth_1.isAuth, isAdmin_1.isAdmin, referral_controllers_1.updateReferralSettings);
exports.default = router;
