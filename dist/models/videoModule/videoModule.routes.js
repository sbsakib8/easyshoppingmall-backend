"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const videoModule_controllers_1 = require("./videoModule.controllers");
const isAuth_1 = require("../../middlewares/isAuth");
const isDashboardAccess_1 = require("../../middlewares/isDashboardAccess");
const router = express_1.default.Router();
// Public / Dropshipper route
router.get("/all", videoModule_controllers_1.getActiveModules);
// Admin / Manager routes (dropshipping manage video)
router.post("/admin/create", isAuth_1.isAuth, (0, isDashboardAccess_1.isDashboardAccess)("dropshipping"), videoModule_controllers_1.createModule);
router.get("/admin/all", isAuth_1.isAuth, (0, isDashboardAccess_1.isDashboardAccess)("dropshipping"), videoModule_controllers_1.getAllModulesAdmin);
router.put("/admin/:id", isAuth_1.isAuth, (0, isDashboardAccess_1.isDashboardAccess)("dropshipping"), videoModule_controllers_1.updateModule);
router.delete("/admin/:id", isAuth_1.isAuth, (0, isDashboardAccess_1.isDashboardAccess)("dropshipping"), videoModule_controllers_1.deleteModule);
exports.default = router;
