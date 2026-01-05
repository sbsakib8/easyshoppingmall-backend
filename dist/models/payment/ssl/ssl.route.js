"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ssl_controller_1 = require("./ssl.controller");
const router = (0, express_1.Router)();
router.post("/success", ssl_controller_1.sslSuccess);
exports.default = router;
