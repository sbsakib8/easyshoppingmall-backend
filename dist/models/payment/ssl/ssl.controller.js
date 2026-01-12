"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sslSuccess = void 0;
const payment_model_1 = require("../payment.model");
const order_model_1 = __importDefault(require("../../order/order.model"));
const sslSuccess = async (req, res) => {
    const { tran_id, amount } = req.body;
    const payment = await payment_model_1.PaymentModel.findOne({ tran_id });
    if (!payment)
        return res.status(404).send("Invalid transaction");
    // 🔐 Replay protection
    if (payment.status === "paid") {
        return res.status(409).send("Already processed");
    }
    if (Number(amount) !== payment.payable_amount) {
        payment.status = "failed";
        await payment.save();
        return res.status(400).send("Amount mismatch");
    }
    payment.status = "paid";
    payment.paid_amount = Number(amount);
    payment.gateway_response = req.body;
    await payment.save();
    const order = await order_model_1.default.findById(payment.orderId);
    if (!order)
        return res.send("Order missing");
    order.payment_status =
        payment.payment_type === "full" ? "paid" : "partial";
    await order.save();
    res.redirect(`${process.env.FRONTEND_URL}/payment-success`);
};
exports.sslSuccess = sslSuccess;
