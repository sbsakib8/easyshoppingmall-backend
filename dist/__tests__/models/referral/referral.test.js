"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("../../setup");
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const mongodb_memory_server_1 = require("mongodb-memory-server");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = __importDefault(require("../../../config"));
const referral_routes_1 = __importDefault(require("../../../models/referral/referral.routes"));
const user_routes_1 = __importDefault(require("../../../models/user/user.routes"));
const order_routes_1 = __importDefault(require("../../../models/order/order.routes"));
const referral_model_1 = __importDefault(require("../../../models/referral/referral.model"));
const user_model_1 = __importDefault(require("../../../models/user/user.model"));
const product_model_1 = __importDefault(require("../../../models/product/product.model"));
const category_model_1 = __importDefault(require("../../../models/category/category.model"));
const order_model_1 = __importDefault(require("../../../models/order/order.model"));
const cache_1 = require("../../../utils/cache");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
let mongoServer;
let app;
let adminToken;
let testAdmin;
beforeAll(async () => {
    mongoServer = await mongodb_memory_server_1.MongoMemoryServer.create();
    await mongoose_1.default.connect(mongoServer.getUri());
    app = (0, express_1.default)();
    app.use(express_1.default.json());
    app.use((0, cookie_parser_1.default)());
    app.use("/api/referral", referral_routes_1.default);
    app.use("/api/users", user_routes_1.default);
    app.use("/api/orders", order_routes_1.default);
    testAdmin = await user_model_1.default.create({
        name: "Admin",
        email: "admin@test.com",
        password: "password123",
        role: "ADMIN",
    });
    adminToken = jsonwebtoken_1.default.sign({ userId: testAdmin._id.toString() }, config_1.default.jwtsecret, { expiresIn: "30d" });
});
afterAll(async () => {
    await mongoose_1.default.disconnect();
    await mongoServer.stop();
});
beforeEach(async () => {
    await cache_1.cache.delByPrefix("");
    await order_model_1.default.deleteMany({});
    await referral_model_1.default.deleteMany({});
    await product_model_1.default.deleteMany({});
    await category_model_1.default.deleteMany({});
    await user_model_1.default.deleteMany({ email: { $ne: "admin@test.com" } });
});
describe("Referral Settings Endpoints", () => {
    describe("GET /api/referral/get", () => {
        it("should return default referral settings when none exist", async () => {
            const res = await (0, supertest_1.default)(app).get("/api/referral/get");
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.referralPercentage).toBe(0);
            expect(res.body.data.referralBonusPerProduct).toBe(0);
        });
        it("should return existing referral settings", async () => {
            await referral_model_1.default.create({
                referralPercentage: 50,
                referralBonusPerProduct: 10,
            });
            const res = await (0, supertest_1.default)(app).get("/api/referral/get");
            expect(res.status).toBe(200);
            expect(res.body.data.referralPercentage).toBe(50);
            expect(res.body.data.referralBonusPerProduct).toBe(10);
        });
        it("should create default settings on first call if none exist", async () => {
            const beforeCount = await referral_model_1.default.countDocuments();
            expect(beforeCount).toBe(0);
            await (0, supertest_1.default)(app).get("/api/referral/get");
            const afterCount = await referral_model_1.default.countDocuments();
            expect(afterCount).toBe(1);
        });
    });
    describe("PUT /api/referral/update", () => {
        it("should update referral settings as admin", async () => {
            const res = await (0, supertest_1.default)(app)
                .put("/api/referral/update")
                .set("Cookie", [`token=${adminToken}`])
                .send({ referralPercentage: 100, referralBonusPerProduct: 25 });
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.referralPercentage).toBe(100);
            expect(res.body.data.referralBonusPerProduct).toBe(25);
        });
        it("should create settings if none exist then update", async () => {
            const res = await (0, supertest_1.default)(app)
                .put("/api/referral/update")
                .set("Cookie", [`token=${adminToken}`])
                .send({ referralPercentage: 75, referralBonusPerProduct: 15 });
            expect(res.status).toBe(200);
            const settings = await referral_model_1.default.findOne();
            expect(settings?.referralPercentage).toBe(75);
            expect(settings?.referralBonusPerProduct).toBe(15);
        });
        it("should return 401 without admin token", async () => {
            const res = await (0, supertest_1.default)(app)
                .put("/api/referral/update")
                .send({ referralPercentage: 50 });
            expect(res.status).toBe(401);
        });
        it("should default to 0 for missing fields", async () => {
            const res = await (0, supertest_1.default)(app)
                .put("/api/referral/update")
                .set("Cookie", [`token=${adminToken}`])
                .send({ referralPercentage: 200 });
            expect(res.status).toBe(200);
            expect(res.body.data.referralPercentage).toBe(200);
            expect(res.body.data.referralBonusPerProduct).toBe(0);
        });
    });
});
describe("Referral Code Registration", () => {
    it("should register user with referral code and set referredBy", async () => {
        const referrer = await user_model_1.default.create({
            name: "Referrer",
            email: "referrer-reg@test.com",
            password: "password123",
            referralCode: "MYCODE123",
            role: "DROPSHIPPING",
        });
        const res = await (0, supertest_1.default)(app)
            .post("/api/users/signup")
            .send({
            name: "Referred User",
            email: "referred-reg@test.com",
            password: "password123",
            referralCode: "MYCODE123",
        });
        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        const referredUser = await user_model_1.default.findOne({ email: "referred-reg@test.com" });
        expect(referredUser).toBeTruthy();
        expect(referredUser?.referredBy?.toString()).toBe(referrer._id.toString());
        const updatedReferrer = await user_model_1.default.findById(referrer._id);
        expect(updatedReferrer?.referralCount).toBe(1);
    });
    it("should generate unique referral code for new user", async () => {
        const res = await (0, supertest_1.default)(app)
            .post("/api/users/signup")
            .send({
            name: "New User",
            email: "newreg@test.com",
            password: "password123",
        });
        expect(res.status).toBe(201);
        const user = await user_model_1.default.findOne({ email: "newreg@test.com" });
        expect(user?.referralCode).toBeTruthy();
        expect(user?.referralCode?.length).toBe(8);
    });
    it("should set referredBy to null when no referral code provided", async () => {
        const res = await (0, supertest_1.default)(app)
            .post("/api/users/signup")
            .send({
            name: "No Referral",
            email: "norefreg@test.com",
            password: "password123",
        });
        expect(res.status).toBe(201);
        const user = await user_model_1.default.findOne({ email: "norefreg@test.com" });
        expect(user?.referredBy).toBeNull();
    });
    it("should not fail when invalid referral code is provided", async () => {
        const res = await (0, supertest_1.default)(app)
            .post("/api/users/signup")
            .send({
            name: "Bad Code",
            email: "badcodereg@test.com",
            password: "password123",
            referralCode: "INVALID999",
        });
        expect(res.status).toBe(201);
        const user = await user_model_1.default.findOne({ email: "badcodereg@test.com" });
        expect(user?.referredBy).toBeNull();
    });
    it("should increment referralCount for each referred user", async () => {
        const referrer = await user_model_1.default.create({
            name: "Referrer",
            email: "refcount@test.com",
            password: "password123",
            referralCode: "REF1CODE",
            role: "DROPSHIPPING",
        });
        await (0, supertest_1.default)(app)
            .post("/api/users/signup")
            .send({ name: "User1", email: "u1count@test.com", password: "pass123", referralCode: "REF1CODE" });
        await (0, supertest_1.default)(app)
            .post("/api/users/signup")
            .send({ name: "User2", email: "u2count@test.com", password: "pass123", referralCode: "REF1CODE" });
        const updated = await user_model_1.default.findById(referrer._id);
        expect(updated?.referralCount).toBe(2);
    });
});
describe("Referral Bonus on Order Delivery", () => {
    let referrer;
    let referredUser;
    let testProduct;
    beforeEach(async () => {
        referrer = await user_model_1.default.create({
            name: "Referrer",
            email: "referrer-del@test.com",
            password: "password123",
            referralCode: "DSREF123",
            role: "DROPSHIPPING",
            roles: ["DROPSHIPPING"],
        });
        referredUser = await user_model_1.default.create({
            name: "Referred",
            email: "referred-del@test.com",
            password: "password123",
            referralCode: "USERCODE",
            referredBy: referrer._id,
            role: "USER",
        });
        const category = await category_model_1.default.create({
            name: "Test Category",
            image: "http://example.com/cat.jpg",
        });
        testProduct = await product_model_1.default.create({
            productName: "Referral Product",
            description: "Test",
            category: [category._id],
            price: 500,
            productStock: 10,
            publish: true,
        });
    });
    it("should credit referral bonus when order is delivered with bonusPerProduct", async () => {
        await referral_model_1.default.create({
            referralPercentage: 0,
            referralBonusPerProduct: 20,
        });
        const order = await order_model_1.default.create({
            userId: referredUser._id,
            orderId: `REF-ORDER-${Date.now()}`,
            products: [
                { productId: testProduct._id, name: "Product", image: [], quantity: 3, price: 500, totalPrice: 1500 },
            ],
            address: {
                customer_name: "Test",
                address_line: "123 St",
                district: "Dhaka",
                division: "Dhaka",
                upazila_thana: "Uttara",
                pincode: "1230",
                country: "Bangladesh",
                mobile: 1234567890,
            },
            payment_method: "manual",
            payment_type: "full",
            amount_paid: 1580,
            amount_due: 0,
            deliveryCharge: 80,
            subTotalAmt: 1500,
            totalAmt: 1580,
            order_status: "processing",
            referralBonusPerProduct: 20,
        });
        const res = await (0, supertest_1.default)(app)
            .put(`/api/orders/${order._id}/status`)
            .set("Cookie", [`token=${adminToken}`])
            .send({ status: "delivered" });
        expect(res.status).toBe(200);
        const updatedOrder = await order_model_1.default.findById(order._id);
        expect(updatedOrder?.referralBonusGiven).toBe(true);
        expect(updatedOrder?.referralBonusAmount).toBe(60);
        const updatedReferrer = await user_model_1.default.findById(referrer._id);
        expect(updatedReferrer?.balance).toBe(60);
    });
    it("should credit referral bonus using referralPercentage when bonusPerProduct is 0", async () => {
        await referral_model_1.default.create({
            referralPercentage: 100,
            referralBonusPerProduct: 0,
        });
        const order = await order_model_1.default.create({
            userId: referredUser._id,
            orderId: `REF-ORDER2-${Date.now()}`,
            products: [
                { productId: testProduct._id, name: "Product", image: [], quantity: 1, price: 500, totalPrice: 500 },
            ],
            address: {
                customer_name: "Test",
                address_line: "123 St",
                district: "Dhaka",
                division: "Dhaka",
                upazila_thana: "Uttara",
                pincode: "1230",
                country: "Bangladesh",
                mobile: 1234567890,
            },
            payment_method: "manual",
            payment_type: "full",
            amount_paid: 580,
            amount_due: 0,
            deliveryCharge: 80,
            subTotalAmt: 500,
            totalAmt: 580,
            order_status: "processing",
            referralBonusPerProduct: 0,
        });
        await (0, supertest_1.default)(app)
            .put(`/api/orders/${order._id}/status`)
            .set("Cookie", [`token=${adminToken}`])
            .send({ status: "delivered" });
        const updatedOrder = await order_model_1.default.findById(order._id);
        expect(updatedOrder?.referralBonusGiven).toBe(true);
        expect(updatedOrder?.referralBonusAmount).toBe(100);
        const updatedReferrer = await user_model_1.default.findById(referrer._id);
        expect(updatedReferrer?.balance).toBe(100);
    });
    it("should use legacy tiered bonus when both settings are 0 and totalAmt >= 500", async () => {
        await referral_model_1.default.create({
            referralPercentage: 0,
            referralBonusPerProduct: 0,
        });
        const order = await order_model_1.default.create({
            userId: referredUser._id,
            orderId: `REF-ORDER3-${Date.now()}`,
            products: [
                { productId: testProduct._id, name: "Product", image: [], quantity: 1, price: 500, totalPrice: 500 },
            ],
            address: {
                customer_name: "Test",
                address_line: "123 St",
                district: "Dhaka",
                division: "Dhaka",
                upazila_thana: "Uttara",
                pincode: "1230",
                country: "Bangladesh",
                mobile: 1234567890,
            },
            payment_method: "manual",
            payment_type: "full",
            amount_paid: 580,
            amount_due: 0,
            deliveryCharge: 80,
            subTotalAmt: 500,
            totalAmt: 580,
            order_status: "processing",
            referralBonusPerProduct: 0,
        });
        await (0, supertest_1.default)(app)
            .put(`/api/orders/${order._id}/status`)
            .set("Cookie", [`token=${adminToken}`])
            .send({ status: "delivered" });
        const updatedOrder = await order_model_1.default.findById(order._id);
        expect(updatedOrder?.referralBonusGiven).toBe(true);
        expect(updatedOrder?.referralBonusAmount).toBe(10);
    });
    it("should NOT credit bonus if referrer is not DROPSHIPPING role", async () => {
        await referral_model_1.default.create({ referralPercentage: 50, referralBonusPerProduct: 10 });
        const normalReferrer = await user_model_1.default.create({
            name: "Normal Referrer",
            email: "normalref-del@test.com",
            password: "password123",
            referralCode: "NORMALREF",
            role: "USER",
        });
        referredUser.referredBy = normalReferrer._id;
        await referredUser.save();
        const order = await order_model_1.default.create({
            userId: referredUser._id,
            orderId: `REF-ORDER4-${Date.now()}`,
            products: [
                { productId: testProduct._id, name: "Product", image: [], quantity: 1, price: 500, totalPrice: 500 },
            ],
            address: {
                customer_name: "Test",
                address_line: "123 St",
                district: "Dhaka",
                division: "Dhaka",
                upazila_thana: "Uttara",
                pincode: "1230",
                country: "Bangladesh",
                mobile: 1234567890,
            },
            payment_method: "manual",
            payment_type: "full",
            amount_paid: 580,
            amount_due: 0,
            deliveryCharge: 80,
            subTotalAmt: 500,
            totalAmt: 580,
            order_status: "processing",
            referralBonusPerProduct: 10,
        });
        await (0, supertest_1.default)(app)
            .put(`/api/orders/${order._id}/status`)
            .set("Cookie", [`token=${adminToken}`])
            .send({ status: "delivered" });
        const updatedOrder = await order_model_1.default.findById(order._id);
        expect(updatedOrder?.referralBonusGiven).toBe(false);
        expect(updatedOrder?.referralBonusAmount).toBe(0);
    });
    it("should NOT credit bonus if order already has referralBonusGiven", async () => {
        await referral_model_1.default.create({ referralPercentage: 50, referralBonusPerProduct: 10 });
        const order = await order_model_1.default.create({
            userId: referredUser._id,
            orderId: `REF-ORDER5-${Date.now()}`,
            products: [
                { productId: testProduct._id, name: "Product", image: [], quantity: 1, price: 500, totalPrice: 500 },
            ],
            address: {
                customer_name: "Test",
                address_line: "123 St",
                district: "Dhaka",
                division: "Dhaka",
                upazila_thana: "Uttara",
                pincode: "1230",
                country: "Bangladesh",
                mobile: 1234567890,
            },
            payment_method: "manual",
            payment_type: "full",
            amount_paid: 580,
            amount_due: 0,
            deliveryCharge: 80,
            subTotalAmt: 500,
            totalAmt: 580,
            order_status: "delivered",
            referralBonusPerProduct: 10,
            referralBonusGiven: true,
            referralBonusAmount: 10,
        });
        await (0, supertest_1.default)(app)
            .put(`/api/orders/${order._id}/status`)
            .set("Cookie", [`token=${adminToken}`])
            .send({ status: "completed" });
        const updatedOrder = await order_model_1.default.findById(order._id);
        expect(updatedOrder?.referralBonusAmount).toBe(10);
    });
    it("should NOT credit bonus if user has no referredBy", async () => {
        await referral_model_1.default.create({ referralPercentage: 50, referralBonusPerProduct: 10 });
        const unreferredUser = await user_model_1.default.create({
            name: "Unreferred",
            email: "unreferred-del@test.com",
            password: "password123",
            referralCode: "UNREF001",
            role: "USER",
        });
        const order = await order_model_1.default.create({
            userId: unreferredUser._id,
            orderId: `REF-ORDER6-${Date.now()}`,
            products: [
                { productId: testProduct._id, name: "Product", image: [], quantity: 1, price: 500, totalPrice: 500 },
            ],
            address: {
                customer_name: "Test",
                address_line: "123 St",
                district: "Dhaka",
                division: "Dhaka",
                upazila_thana: "Uttara",
                pincode: "1230",
                country: "Bangladesh",
                mobile: 1234567890,
            },
            payment_method: "manual",
            payment_type: "full",
            amount_paid: 580,
            amount_due: 0,
            deliveryCharge: 80,
            subTotalAmt: 500,
            totalAmt: 580,
            order_status: "processing",
            referralBonusPerProduct: 10,
        });
        await (0, supertest_1.default)(app)
            .put(`/api/orders/${order._id}/status`)
            .set("Cookie", [`token=${adminToken}`])
            .send({ status: "delivered" });
        const updatedOrder = await order_model_1.default.findById(order._id);
        expect(updatedOrder?.referralBonusGiven).toBe(false);
    });
    it("should NOT credit bonus if order is not fully paid (delivery type with amount due)", async () => {
        await referral_model_1.default.create({ referralPercentage: 50, referralBonusPerProduct: 10 });
        const order = await order_model_1.default.create({
            userId: referredUser._id,
            orderId: `REF-ORDER7-${Date.now()}`,
            products: [
                { productId: testProduct._id, name: "Product", image: [], quantity: 1, price: 500, totalPrice: 500 },
            ],
            address: {
                customer_name: "Test",
                address_line: "123 St",
                district: "Dhaka",
                division: "Dhaka",
                upazila_thana: "Uttara",
                pincode: "1230",
                country: "Bangladesh",
                mobile: 1234567890,
            },
            payment_method: "manual",
            payment_type: "delivery",
            amount_paid: 200,
            amount_due: 380,
            deliveryCharge: 80,
            subTotalAmt: 500,
            totalAmt: 580,
            order_status: "processing",
            referralBonusPerProduct: 10,
        });
        await (0, supertest_1.default)(app)
            .put(`/api/orders/${order._id}/status`)
            .set("Cookie", [`token=${adminToken}`])
            .send({ status: "delivered" });
        const updatedOrder = await order_model_1.default.findById(order._id);
        expect(updatedOrder?.referralBonusGiven).toBe(false);
    });
    it("should accumulate referral bonus across multiple deliveries", async () => {
        await referral_model_1.default.create({ referralPercentage: 0, referralBonusPerProduct: 25 });
        for (let i = 0; i < 3; i++) {
            const order = await order_model_1.default.create({
                userId: referredUser._id,
                orderId: `REF-MULTI-${Date.now()}-${i}`,
                products: [
                    { productId: testProduct._id, name: "Product", image: [], quantity: 1, price: 500, totalPrice: 500 },
                ],
                address: {
                    customer_name: "Test",
                    address_line: "123 St",
                    district: "Dhaka",
                    division: "Dhaka",
                    upazila_thana: "Uttara",
                    pincode: "1230",
                    country: "Bangladesh",
                    mobile: 1234567890,
                },
                payment_method: "manual",
                payment_type: "full",
                amount_paid: 580,
                amount_due: 0,
                deliveryCharge: 80,
                subTotalAmt: 500,
                totalAmt: 580,
                order_status: "processing",
                referralBonusPerProduct: 25,
            });
            await (0, supertest_1.default)(app)
                .put(`/api/orders/${order._id}/status`)
                .set("Cookie", [`token=${adminToken}`])
                .send({ status: "delivered" });
        }
        const updatedReferrer = await user_model_1.default.findById(referrer._id);
        expect(updatedReferrer?.balance).toBe(75);
    });
});
