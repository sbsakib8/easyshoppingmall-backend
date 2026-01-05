"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initiatePayment = void 0;
const order_model_1 = __importDefault(require("../order/order.model")); // Corrected import path
const payment_model_1 = require("./payment.model"); // Corrected import path
const ssl_service_1 = require("./ssl/ssl.service");
const generateTranId_1 = require("../../utils/generateTranId"); // Assuming this utility exists
const initiatePayment = async (req, res) => {
    const { orderId, payment_type } = req.body;
    const userId = req.user._id;
    const order = await order_model_1.default.findById(orderId);
    if (!order)
        return res.status(404).json({ message: "Order not found" });
    const payable_amount = payment_type === "delivery"
        ? order.deliveryCharge
        : order.totalAmt;
    const payment = await payment_model_1.PaymentModel.create({
        orderId,
        userId,
        provider: "sslcommerz",
        payment_type,
        payable_amount,
        tran_id: (0, generateTranId_1.generateTranId)(),
    });
    const sslResponse = await (0, ssl_service_1.initSslPayment)({
        total_amount: payable_amount,
        currency: "BDT",
        tran_id: payment.tran_id,
        success_url: `${process.env.BACKEND_URL}/api/ssl/success`,
        fail_url: `${process.env.BACKEND_URL}/api/ssl/fail`,
        cancel_url: `${process.env.BACKEND_URL}/api/ssl/cancel`,
        cus_name: req.user.name,
        cus_phone: req.user.phone,
    });
    res.json({ url: sslResponse.GatewayPageURL });
};
exports.initiatePayment = initiatePayment;
