"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("../setup");
const deliveryCharge_1 = require("../../utils/deliveryCharge");
describe("calculateDeliveryCharge", () => {
    it("should return 60 for Dhaka district", () => {
        expect((0, deliveryCharge_1.calculateDeliveryCharge)("Dhaka")).toBe(60);
    });
    it("should return 60 for Uttara (Dhaka area)", () => {
        expect((0, deliveryCharge_1.calculateDeliveryCharge)("Uttara")).toBe(60);
    });
    it("should return 60 for Mirpur (Dhaka area)", () => {
        expect((0, deliveryCharge_1.calculateDeliveryCharge)("Mirpur")).toBe(60);
    });
    it("should return 60 for ঢাকা (Bengali Dhaka)", () => {
        expect((0, deliveryCharge_1.calculateDeliveryCharge)("ঢাকা")).toBe(60);
    });
    it("should return 120 for non-Dhaka district", () => {
        expect((0, deliveryCharge_1.calculateDeliveryCharge)("Chittagong")).toBe(120);
    });
    it("should return 120 for Sylhet", () => {
        expect((0, deliveryCharge_1.calculateDeliveryCharge)("Sylhet")).toBe(120);
    });
    it("should return 120 for undefined district", () => {
        expect((0, deliveryCharge_1.calculateDeliveryCharge)(undefined)).toBe(120);
    });
    it("should return 120 for empty string", () => {
        expect((0, deliveryCharge_1.calculateDeliveryCharge)("")).toBe(120);
    });
    it("should be case insensitive", () => {
        expect((0, deliveryCharge_1.calculateDeliveryCharge)("DHAKA")).toBe(60);
        expect((0, deliveryCharge_1.calculateDeliveryCharge)("dhaka")).toBe(60);
    });
    it("should match partial string containing Dhaka", () => {
        expect((0, deliveryCharge_1.calculateDeliveryCharge)("Dhaka Division")).toBe(60);
        expect((0, deliveryCharge_1.calculateDeliveryCharge)("Dhaka District")).toBe(60);
    });
    it("should return 120 for random unknown district", () => {
        expect((0, deliveryCharge_1.calculateDeliveryCharge)("Comilla")).toBe(120);
    });
    it("should return 60 for Gulshan", () => {
        expect((0, deliveryCharge_1.calculateDeliveryCharge)("Gulshan")).toBe(60);
    });
    it("should return 60 for Mohammadpur", () => {
        expect((0, deliveryCharge_1.calculateDeliveryCharge)("Mohammadpur")).toBe(60);
    });
});
