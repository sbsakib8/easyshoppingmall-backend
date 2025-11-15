"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const isAuth_1 = require("../../middlewares/isAuth");
const cartController_1 = require("../cart/cartController");
const router = express_1.default.Router();
// 🛒 Cart
router.post("/add", cartController_1.addToCart);
router.get("/:userId", isAuth_1.isAuth, cartController_1.getCart);
router.put("/update", cartController_1.updateCartItem);
router.delete("/remove/:userId/:productId", cartController_1.removeFromCart);
router.delete("/clear/:userId", cartController_1.clearCart);
exports.default = router;
