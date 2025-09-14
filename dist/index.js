"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_connect_1 = __importDefault(require("./config/db.connect"));
const user_routs_1 = __importDefault(require("./models/user/user.routs"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
// middleware
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
// mongodb 
(0, db_connect_1.default)();
//  route
app.use("/api/users", user_routs_1.default);
app.get("/", (req, res) => {
    res.send("APi sarkar is running...");
});
exports.default = app;
