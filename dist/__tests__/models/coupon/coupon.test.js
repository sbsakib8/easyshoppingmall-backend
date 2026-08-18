"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("../../setup");
const mongoose_1 = __importDefault(require("mongoose"));
const mongodb_memory_server_1 = require("mongodb-memory-server");
const coupon_service_1 = require("../../../models/coupon/coupon.service");
const coupon_model_1 = __importDefault(require("../../../models/coupon/coupon.model"));
const product_model_1 = __importDefault(require("../../../models/product/product.model"));
const category_model_1 = __importDefault(require("../../../models/category/category.model"));
const subcategory_model_1 = __importDefault(require("../../../models/subcategory/subcategory.model"));
const user_model_1 = __importDefault(require("../../../models/user/user.model"));
let mongoServer;
let testUser;
let testProduct;
let testCategory;
let testSubCategory;
beforeAll(async () => {
    mongoServer = await mongodb_memory_server_1.MongoMemoryServer.create();
    await mongoose_1.default.connect(mongoServer.getUri());
    testUser = await user_model_1.default.create({
        name: "Test User",
        email: "user@test.com",
        password: "password123",
        role: "USER",
    });
    testCategory = await category_model_1.default.create({
        name: "Electronics",
        image: "http://example.com/cat.jpg",
    });
    testSubCategory = await subcategory_model_1.default.create({
        name: "Phones",
        image: "http://example.com/sub.jpg",
        category: testCategory._id,
    });
    testProduct = await product_model_1.default.create({
        productName: "Test Product",
        description: "Test",
        category: [testCategory._id],
        subCategory: [testSubCategory._id],
        price: 500,
        productStock: 10,
        publish: true,
    });
});
afterAll(async () => {
    await mongoose_1.default.disconnect();
    await mongoServer.stop();
});
beforeEach(async () => {
    const collections = mongoose_1.default.connection.collections;
    for (const key in collections) {
        if (key !== "users" && key !== "categories" && key !== "subcategories" && key !== "products") {
            await collections[key].deleteMany({});
        }
    }
});
describe("Coupon Service - validateAndCalculateDiscount", () => {
    const getValidCartItems = () => [
        { productId: testProduct._id.toString(), quantity: 2, price: 500 },
    ];
    it("should throw error if coupon code is missing", async () => {
        await expect((0, coupon_service_1.validateAndCalculateDiscount)({
            code: "",
            cartItems: getValidCartItems(),
            userId: testUser._id.toString(),
        })).rejects.toThrow(/Coupon code was not provided/);
    });
    it("should throw error if cart is empty", async () => {
        await expect((0, coupon_service_1.validateAndCalculateDiscount)({
            code: "TESTCODE",
            cartItems: [],
            userId: testUser._id.toString(),
        })).rejects.toThrow(/Cart is empty/);
    });
    it("should throw error for invalid coupon", async () => {
        await expect((0, coupon_service_1.validateAndCalculateDiscount)({
            code: "NONEXISTENT",
            cartItems: getValidCartItems(),
            userId: testUser._id.toString(),
        })).rejects.toThrow(/Invalid or inactive/);
    });
    it("should throw error for expired coupon", async () => {
        await coupon_model_1.default.create({
            code: "EXPIRED",
            discountType: "flat",
            discountAmount: 100,
            minOrderAmount: 0,
            validFrom: new Date("2020-01-01"),
            validUntil: new Date("2020-12-31"),
            isActive: true,
        });
        await expect((0, coupon_service_1.validateAndCalculateDiscount)({
            code: "EXPIRED",
            cartItems: getValidCartItems(),
            userId: testUser._id.toString(),
        })).rejects.toThrow(/expired or is not yet active/);
    });
    it("should calculate flat discount correctly", async () => {
        await coupon_model_1.default.create({
            code: "FLAT100",
            discountType: "flat",
            discountAmount: 100,
            minOrderAmount: 0,
            validFrom: new Date("2020-01-01"),
            validUntil: new Date("2030-12-31"),
            isActive: true,
        });
        const result = await (0, coupon_service_1.validateAndCalculateDiscount)({
            code: "FLAT100",
            cartItems: getValidCartItems(),
            userId: testUser._id.toString(),
        });
        expect(result.discountAmount).toBe(100);
    });
    it("should calculate percentage discount correctly", async () => {
        await coupon_model_1.default.create({
            code: "PERCENT10",
            discountType: "percentage",
            discountAmount: 10,
            minOrderAmount: 0,
            validFrom: new Date("2020-01-01"),
            validUntil: new Date("2030-12-31"),
            isActive: true,
        });
        const result = await (0, coupon_service_1.validateAndCalculateDiscount)({
            code: "PERCENT10",
            cartItems: getValidCartItems(),
            userId: testUser._id.toString(),
        });
        expect(result.discountAmount).toBe(100);
    });
    it("should cap percentage discount at maxDiscountAmount", async () => {
        await coupon_model_1.default.create({
            code: "CAPPED20",
            discountType: "percentage",
            discountAmount: 50,
            maxDiscountAmount: 200,
            minOrderAmount: 0,
            validFrom: new Date("2020-01-01"),
            validUntil: new Date("2030-12-31"),
            isActive: true,
        });
        const result = await (0, coupon_service_1.validateAndCalculateDiscount)({
            code: "CAPPED20",
            cartItems: getValidCartItems(),
            userId: testUser._id.toString(),
        });
        expect(result.discountAmount).toBe(200);
    });
    it("should throw error if min order amount not met", async () => {
        await coupon_model_1.default.create({
            code: "MINORDER",
            discountType: "flat",
            discountAmount: 50,
            minOrderAmount: 5000,
            validFrom: new Date("2020-01-01"),
            validUntil: new Date("2030-12-31"),
            isActive: true,
        });
        await expect((0, coupon_service_1.validateAndCalculateDiscount)({
            code: "MINORDER",
            cartItems: getValidCartItems(),
            userId: testUser._id.toString(),
        })).rejects.toThrow(/Minimum order amount/);
    });
    it("should clamp discount to applicable amount for flat discount", async () => {
        await coupon_model_1.default.create({
            code: "BIGFLAT",
            discountType: "flat",
            discountAmount: 2000,
            minOrderAmount: 0,
            validFrom: new Date("2020-01-01"),
            validUntil: new Date("2030-12-31"),
            isActive: true,
        });
        const result = await (0, coupon_service_1.validateAndCalculateDiscount)({
            code: "BIGFLAT",
            cartItems: getValidCartItems(),
            userId: testUser._id.toString(),
        });
        expect(result.discountAmount).toBe(1000);
    });
    it("should only apply scoped coupon to matching products", async () => {
        const otherProduct = await product_model_1.default.create({
            productName: "Other Product",
            description: "Other",
            price: 300,
            productStock: 5,
            publish: true,
        });
        await coupon_model_1.default.create({
            code: "SCOPED",
            discountType: "flat",
            discountAmount: 50,
            minOrderAmount: 0,
            validFrom: new Date("2020-01-01"),
            validUntil: new Date("2030-12-31"),
            isActive: true,
            applicableProduct: testProduct._id,
        });
        const mixedCartItems = [
            { productId: testProduct._id.toString(), quantity: 1, price: 500 },
            { productId: otherProduct._id.toString(), quantity: 1, price: 300 },
        ];
        const result = await (0, coupon_service_1.validateAndCalculateDiscount)({
            code: "SCOPED",
            cartItems: mixedCartItems,
            userId: testUser._id.toString(),
        });
        expect(result.discountAmount).toBe(50);
    });
    it("should throw error for inactive coupon", async () => {
        await coupon_model_1.default.create({
            code: "INACTIVE",
            discountType: "flat",
            discountAmount: 100,
            minOrderAmount: 0,
            validFrom: new Date("2020-01-01"),
            validUntil: new Date("2030-12-31"),
            isActive: false,
        });
        await expect((0, coupon_service_1.validateAndCalculateDiscount)({
            code: "INACTIVE",
            cartItems: getValidCartItems(),
            userId: testUser._id.toString(),
        })).rejects.toThrow(/Invalid or inactive/);
    });
});
