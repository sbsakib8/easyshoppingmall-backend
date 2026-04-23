import express from "express";
import {
    addToWishlist,
    getWishlist,
    removeFromWishlist,
    clearWishlist,
} from "./wishlist.controller";
import { isAuth } from "../../middlewares/isAuth";

const router = express.Router();

router.use(isAuth); // all routes protected

router.post("/add", addToWishlist);
router.get("/", getWishlist);
router.delete("/remove/:productId", removeFromWishlist);
router.delete("/clear", clearWishlist);

export default router;
