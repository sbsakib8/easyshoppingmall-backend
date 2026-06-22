"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const isAuth_1 = require("../../middlewares/isAuth");
const isDashboardAccess_1 = require("../../middlewares/isDashboardAccess");
const videoRequest_controllers_1 = require("./videoRequest.controllers");
const router = express_1.default.Router();
// User routes
router.post("/create", isAuth_1.isAuth, videoRequest_controllers_1.createVideoRequest);
router.get("/my-requests", isAuth_1.isAuth, videoRequest_controllers_1.getMyVideoRequests);
// Admin / Manager routes (dropshipping manage video)
router.get("/all", isAuth_1.isAuth, (0, isDashboardAccess_1.isDashboardAccess)("dropshipping"), videoRequest_controllers_1.adminGetAllVideoRequests);
router.patch("/update/:requestId", isAuth_1.isAuth, (0, isDashboardAccess_1.isDashboardAccess)("dropshipping"), videoRequest_controllers_1.adminUpdateVideoRequestStatus);
exports.default = router;
