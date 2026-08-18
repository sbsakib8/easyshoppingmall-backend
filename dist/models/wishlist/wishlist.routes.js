"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const wishlist_controller_1 = require("./wishlist.controller");
const isAuth_1 = require("../../middlewares/isAuth");
const router = express_1.default.Router();
router.use(isAuth_1.isAuth); // all routes protected
router.post("/add", wishlist_controller_1.addToWishlist);
router.get("/", wishlist_controller_1.getWishlist);
router.delete("/remove/:productId", wishlist_controller_1.removeFromWishlist);
router.delete("/clear", wishlist_controller_1.clearWishlist);
exports.default = router;
