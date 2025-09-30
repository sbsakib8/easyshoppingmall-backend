"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const db_connect_1 = __importDefault(require("./config/db.connect"));
const user_routs_1 = __importDefault(require("./models/user/user.routs"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const product_routs_1 = __importDefault(require("./models/product/product.routs"));
const address_routs_1 = __importDefault(require("./models/address/address.routs"));
// middleware
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
app.use((0, cors_1.default)({
    origin: ["http://localhost:3000", "https://easyshopingmall-b14r.vercel.app/"],
    credentials: true,
}));
// mongodb 
(0, db_connect_1.default)();
//  route
app.use("/api/users", user_routs_1.default);
app.use("/api/products", product_routs_1.default);
app.use("/api/address", address_routs_1.default);
app.get("/", (req, res) => {
    res.send("APi sarkar is running...");
});
exports.default = app;
