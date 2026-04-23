"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const compression_1 = __importDefault(require("compression"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const db_connect_1 = __importDefault(require("./config/db.connect"));
const address_routes_1 = __importDefault(require("./models/address/address.routes"));
const centerBanner_routes_1 = __importDefault(require("./models/banners/centerBanner/centerBanner.routes"));
const homeBanner_routes_1 = __importDefault(require("./models/banners/homeBanner/homeBanner.routes"));
const leftBanner_routes_1 = __importDefault(require("./models/banners/leftBanner/leftBanner.routes"));
const rightBanner_routes_1 = __importDefault(require("./models/banners/rightBanner/rightBanner.routes"));
const cart_routes_1 = __importDefault(require("./models/cart/cart.routes"));
const category_routes_1 = __importDefault(require("./models/category/category.routes"));
const blogs_routes_1 = __importDefault(require("./models/content/blogs/blogs.routes"));
const contact_routes_1 = __importDefault(require("./models/content/contact/contact.routes"));
const websiteinfo_routes_1 = __importDefault(require("./models/content/websiteInfo/websiteinfo.routes"));
const notification_routes_1 = __importDefault(require("./models/notification/notification.routes"));
const order_routes_1 = __importDefault(require("./models/order/order.routes"));
const payment_route_1 = __importDefault(require("./models/payment/payment.route"));
const errorHandler_1 = __importDefault(require("./middlewares/errorHandler"));
const admin_route_1 = __importDefault(require("./models/admin/admin.route"));
const product_routes_1 = __importDefault(require("./models/product/product.routes"));
const review_routes_1 = __importDefault(require("./models/review/review.routes"));
const subcategory_routes_1 = __importDefault(require("./models/subcategory/subcategory.routes"));
const user_routes_1 = __importDefault(require("./models/user/user.routes"));
const wishlist_routes_1 = __importDefault(require("./models/wishlist/wishlist.routes"));
const coupon_routes_1 = __importDefault(require("./models/coupon/coupon.routes"));
// middleware
const app = (0, express_1.default)();
app.set("trust proxy", 1);
app.use((0, compression_1.default)()); // Compress all responses
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cookie_parser_1.default)());
// cors
app.use((0, cors_1.default)({
    origin: [
        "http://localhost:3000",
        "https://easyshoppingmallbd.com",
        "https://www.easyshoppingmallbd.com",
        "https://easyshoppingmallbd.vercel.app"
    ],
    credentials: true,
}));
// Ensure database is connected before processing any requests (Crucial for Vercel Serverless)
app.use(async (req, res, next) => {
    try {
        await (0, db_connect_1.default)();
        next();
    }
    catch (error) {
        next(error);
    }
});
//  route
const analytics_routes_1 = __importDefault(require("./models/analytics/analytics.routes"));
app.use("/api/users", user_routes_1.default);
app.use("/api/products", product_routes_1.default);
app.use("/api/address", address_routes_1.default);
app.use("/api/categories", category_routes_1.default);
app.use("/api/subcategories", subcategory_routes_1.default);
app.use("/api/homeBannerRoutes", homeBanner_routes_1.default);
app.use("/api/CenterBanner", centerBanner_routes_1.default);
app.use("/api/LeftBanner", leftBanner_routes_1.default);
app.use("/api/RightBanner", rightBanner_routes_1.default);
app.use("/api/blog", blogs_routes_1.default);
app.use("/api/websiteinfo", websiteinfo_routes_1.default);
app.use("/api/contact", contact_routes_1.default);
app.use("/api/notification", notification_routes_1.default);
app.use("/api/cart", cart_routes_1.default);
app.use("/api/orders", order_routes_1.default);
app.use("/api/wishlist", wishlist_routes_1.default);
app.use("/api/payment", payment_route_1.default);
app.use('/api/review', review_routes_1.default);
app.use("/api/coupon", coupon_routes_1.default);
app.use("/api/analytics", analytics_routes_1.default);
app.use("/api/admin", admin_route_1.default);
app.get("/", (req, res) => {
    res.send("APi  is running...");
});
// Centralized error handling middleware (must be last)
app.use(errorHandler_1.default);
exports.default = app;
