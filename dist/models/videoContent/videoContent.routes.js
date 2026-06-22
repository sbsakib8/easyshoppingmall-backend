"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const videoContent_controllers_1 = require("./videoContent.controllers");
const isAuth_1 = require("../../middlewares/isAuth");
const isDashboardAccess_1 = require("../../middlewares/isDashboardAccess");
const optionalAuth_1 = require("../../middlewares/optionalAuth");
const router = express_1.default.Router();
router.get("/all", optionalAuth_1.optionalAuth, videoContent_controllers_1.getAllVideos);
// Admin / Manager routes (dropshipping manage video)
router.get("/admin/all", isAuth_1.isAuth, (0, isDashboardAccess_1.isDashboardAccess)("dropshipping"), videoContent_controllers_1.adminGetAllVideos);
router.post("/create", isAuth_1.isAuth, (0, isDashboardAccess_1.isDashboardAccess)("dropshipping"), videoContent_controllers_1.createVideo);
router.patch("/update/:id", isAuth_1.isAuth, (0, isDashboardAccess_1.isDashboardAccess)("dropshipping"), videoContent_controllers_1.updateVideo);
router.delete("/delete/:id", isAuth_1.isAuth, (0, isDashboardAccess_1.isDashboardAccess)("dropshipping"), videoContent_controllers_1.deleteVideo);
exports.default = router;
