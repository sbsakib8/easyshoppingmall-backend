"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const websiteinfo_controllers_1 = require("./websiteinfo.controllers");
const isAuth_1 = require("../../../middlewares/isAuth");
const isAdmin_1 = require("../../../middlewares/isAdmin");
const router = express_1.default.Router();
// CREATE
router.post("/create", isAuth_1.isAuth, isAdmin_1.isAdmin, websiteinfo_controllers_1.createWebsiteInfo);
// READ
router.get("/get", websiteinfo_controllers_1.getAllWebsiteInfo);
// UPDATE
router.put("/:id", isAuth_1.isAuth, isAdmin_1.isAdmin, websiteinfo_controllers_1.updateWebsiteInfo);
// DELETE
router.delete("/:id", isAuth_1.isAuth, isAdmin_1.isAdmin, websiteinfo_controllers_1.deleteWebsiteInfo);
exports.default = router;
