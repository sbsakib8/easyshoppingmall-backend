"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const isAuth_1 = require("../../middlewares/isAuth");
const teamSystem_controller_1 = require("./teamSystem.controller");
const teamSystemRoutes = (0, express_1.Router)();
teamSystemRoutes.get("/", isAuth_1.isAuth, teamSystem_controller_1.getTeamSystem);
exports.default = teamSystemRoutes;
