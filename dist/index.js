"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const db_connect_1 = __importDefault(require("./config/db.connect"));
const address_routs_1 = __importDefault(require("./models/address/address.routs"));
const centerBanner_routs_1 = __importDefault(require("./models/banners/centerBanner/centerBanner.routs"));
const homeBanner_routs_1 = __importDefault(require("./models/banners/homeBanner/homeBanner.routs"));
const leftBanner_routs_1 = __importDefault(require("./models/banners/leftBanner/leftBanner.routs"));
const rightBanner_routs_1 = __importDefault(require("./models/banners/rightBanner/rightBanner.routs"));
const cart_routs_1 = __importDefault(require("./models/cart/cart.routs"));
const category_routs_1 = __importDefault(require("./models/category/category.routs"));
const blogs_routs_1 = __importDefault(require("./models/content/blogs/blogs.routs"));
const contact_routs_1 = __importDefault(require("./models/content/contact/contact.routs"));
const websiteinfo_routs_1 = __importDefault(require("./models/content/websiteInfo/websiteinfo.routs"));
const notification_routs_1 = __importDefault(require("./models/notification/notification.routs"));
const order_routs_1 = __importDefault(require("./models/order/order.routs"));
const payment_route_1 = __importDefault(require("./models/payment/payment.route"));
const product_routs_1 = __importDefault(require("./models/product/product.routs"));
const review_routs_1 = __importDefault(require("./models/review/review.routs"));
const subcategory_routs_1 = __importDefault(require("./models/subcategory/subcategory.routs"));
const user_routs_1 = __importDefault(require("./models/user/user.routs"));
const wishlist_routs_1 = __importDefault(require("./models/wishlist/wishlist.routs"));
// middleware
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cookie_parser_1.default)());
// cors
app.use((0, cors_1.default)({
    origin: ["http://localhost:3000",
        "https://easyshoppingmallbd.com",
        "https://easyshoppingmallbd.vercel.app"],
    credentials: true,
}));
(0, db_connect_1.default)();
//  route
app.use("/api/users", user_routs_1.default);
app.use("/api/products", product_routs_1.default);
app.use("/api/address", address_routs_1.default);
app.use("/api/categories", category_routs_1.default);
app.use("/api/subcategories", subcategory_routs_1.default);
app.use("/api/homeBannerRoutes", homeBanner_routs_1.default);
app.use("/api/CenterBanner", centerBanner_routs_1.default);
app.use("/api/LeftBanner", leftBanner_routs_1.default);
app.use("/api/RightBanner", rightBanner_routs_1.default);
app.use("/api/blog", blogs_routs_1.default);
app.use("/api/websiteinfo", websiteinfo_routs_1.default);
app.use("/api/contact", contact_routs_1.default);
app.use("/api/notification", notification_routs_1.default);
app.use("/api/cart", cart_routs_1.default);
app.use("/api/orders", order_routs_1.default);
app.use("/api/wishlist", wishlist_routs_1.default);
app.use("/api/payment", payment_route_1.default);
app.use('/api/review', review_routs_1.default);
app.get("/", (req, res) => {
    res.send("APi  is running...");
});
exports.default = app;
