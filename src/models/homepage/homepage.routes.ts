import { Router } from "express";
import { getHomepageData, getPopularProducts } from "./homepage.controller";

const router = Router();

router.get("/", getHomepageData);
router.post("/popular-products", getPopularProducts);

export default router;
