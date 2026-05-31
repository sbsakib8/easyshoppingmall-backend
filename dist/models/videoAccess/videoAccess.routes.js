"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const videoAccess_controllers_1 = require("./videoAccess.controllers");
const isAuth_1 = require("../../middlewares/isAuth");
const isAdmin_1 = require("../../middlewares/isAdmin");
const router = express_1.default.Router();
router.post("/create", isAuth_1.isAuth, videoAccess_controllers_1.createVideoAccessRequest);
router.get("/my-access", isAuth_1.isAuth, videoAccess_controllers_1.getMyVideoAccess);
// Admin routes
router.get("/all", isAuth_1.isAuth, isAdmin_1.isAdmin, videoAccess_controllers_1.getAllVideoAccessRequests);
router.patch("/update/:requestId", isAuth_1.isAuth, isAdmin_1.isAdmin, videoAccess_controllers_1.updateVideoAccessStatus);
exports.default = router;
