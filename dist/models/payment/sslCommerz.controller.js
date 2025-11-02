"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentIpn = exports.paymentCancel = exports.paymentFail = exports.paymentSuccess = exports.initPayment = void 0;
const sslcommerz_lts_1 = __importDefault(require("sslcommerz-lts"));
const order_model_1 = __importDefault(require("../order/order.model"));
const sslcommerze_1 = require("../../config/sslcommerze");
// 🧾 Initialize Payment
const initPayment = async (req, res) => {
    try {
        const { orderId, user } = req.body;
        const order = await order_model_1.default.findById(orderId);
        if (!order)
            return res.status(404).json({ message: "Order not found" });
        const data = {
            total_amount: order.totalAmt,
            currency: "BDT",
            tran_id: order.orderId, // Must be unique
            success_url: `${process.env.BACKEND_URL}/api/payment/success`,
            fail_url: `${process.env.BACKEND_URL}/api/payment/fail`,
            cancel_url: `${process.env.BACKEND_URL}/api/payment/cancel`,
            ipn_url: `${process.env.BACKEND_URL}/api/payment/ipn`,
            shipping_method: "Courier",
            product_name: "Ekomart Checkout",
            product_category: "Ecommerce",
            product_profile: "general",
            cus_name: user.name,
            cus_email: user.email,
            cus_phone: user.phone,
            cus_add1: user.address,
            cus_city: "Dhaka",
            cus_country: "Bangladesh",
            ship_name: user.name,
            ship_add1: user.address,
            ship_city: "Dhaka",
            ship_country: "Bangladesh",
        };
        const sslcz = new sslcommerz_lts_1.default(sslcommerze_1.sslConfig.store_id, sslcommerze_1.sslConfig.store_passwd, sslcommerze_1.sslConfig.is_live);
        const apiResponse = await sslcz.init(data);
        if (apiResponse?.GatewayPageURL) {
            // Optionally save session key for later verification
            order.payment_session_key = apiResponse.sessionkey;
            await order.save();
            return res.status(200).json({
                message: "Payment session created successfully",
                url: apiResponse.GatewayPageURL,
            });
        }
        else {
            return res.status(400).json({ message: "Failed to create payment session" });
        }
    }
    catch (error) {
        console.error("initPayment Error:", error);
        return res.status(500).json({ message: error.message });
    }
};
exports.initPayment = initPayment;
// ✅ SUCCESS
const paymentSuccess = async (req, res) => {
    try {
        const { tran_id } = req.body;
        await order_model_1.default.findOneAndUpdate({ orderId: tran_id }, {
            payment_status: "paid",
            order_status: "processing",
        });
        return res.redirect(`${process.env.FRONTEND_URL}/payment/success?tranId=${tran_id}`);
    }
    catch (error) {
        console.error("paymentSuccess Error:", error);
        return res.status(500).json({ message: error.message });
    }
};
exports.paymentSuccess = paymentSuccess;
// ❌ FAIL
const paymentFail = async (req, res) => {
    try {
        const { tran_id } = req.body;
        await order_model_1.default.findOneAndUpdate({ orderId: tran_id }, {
            payment_status: "failed",
            order_status: "cancelled",
        });
        return res.redirect(`${process.env.FRONTEND_URL}/payment/fail`);
    }
    catch (error) {
        console.error("paymentFail Error:", error);
        return res.status(500).json({ message: error.message });
    }
};
exports.paymentFail = paymentFail;
// 🚫 CANCEL
const paymentCancel = async (req, res) => {
    try {
        const { tran_id } = req.body;
        await order_model_1.default.findOneAndUpdate({ orderId: tran_id }, {
            payment_status: "failed",
            order_status: "cancelled",
        });
        return res.redirect(`${process.env.FRONTEND_URL}/payment/cancel`);
    }
    catch (error) {
        console.error("paymentCancel Error:", error);
        return res.status(500).json({ message: error.message });
    }
};
exports.paymentCancel = paymentCancel;
// 📩 IPN — Instant Payment Notification (for async verification)
const paymentIpn = async (req, res) => {
    try {
        const { tran_id, status } = req.body;
        console.log("SSLCommerz IPN received:", req.body);
        const order = await order_model_1.default.findOne({ orderId: tran_id });
        if (!order)
            return res.status(404).send("Order not found");
        if (status === "VALID" || status === "VALIDATED") {
            order.payment_status = "paid";
            order.order_status = "processing";
        }
        else {
            order.payment_status = "failed";
            order.order_status = "cancelled";
        }
        await order.save();
        return res.status(200).send("IPN received successfully");
    }
    catch (error) {
        console.error("paymentIpn Error:", error);
        return res.status(500).json({ message: error.message });
    }
};
exports.paymentIpn = paymentIpn;
