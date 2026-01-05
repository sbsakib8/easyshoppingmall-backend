"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrderPayments = exports.getAllOrders = exports.getAllPayments = void 0;
const payment_model_1 = require("../payment/payment.model");
const order_model_1 = __importDefault(require("../order/order.model")); // Corrected import path
const getAllPayments = async (_req, res) => {
    const payments = await payment_model_1.PaymentModel.find()
        .populate("orderId")
        .populate("userId");
    res.json(payments);
};
exports.getAllPayments = getAllPayments;
const getAllOrders = async (_req, res) => {
    const orders = await order_model_1.default.find()
        .populate("userId")
        .populate("products.product")
        .populate("delivery_address");
    res.json(orders);
};
exports.getAllOrders = getAllOrders;
const getOrderPayments = async (req, res) => {
    const payments = await payment_model_1.PaymentModel.find({
        orderId: req.params.orderId,
    });
    res.json(payments);
};
exports.getOrderPayments = getOrderPayments;
