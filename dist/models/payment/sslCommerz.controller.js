"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentIpn = exports.paymentCancel = exports.paymentFail = exports.paymentSuccess = exports.initPayment = void 0;
const sslcommerz_lts_1 = __importDefault(require("sslcommerz-lts"));
const order_model_1 = __importDefault(require("../order/order.model"));
/**
 * POST /api/payment/init
<<<<<<< HEAD
 * body: { dbOrderId: string, user: { name, email, phone, address } }
 */
const initPayment = async (req, res) => {
    try {
        const { dbOrderId, user } = req.body;
        console.log("initPayment body:", req.body);
        if (!dbOrderId) {
            return res
                .status(400)
                .json({ message: "dbOrderId (order _id) is required" });
=======
 * body: { dbOrderId: string, user: { name, email, phone, address }, method: "manual" | "sslcommerz" }
 */
const initPayment = async (req, res) => {
    try {
        const { dbOrderId, user, method } = req.body;
        if (!dbOrderId) {
            return res.status(400).json({ message: "dbOrderId (order _id) is required" });
>>>>>>> d8b16845ce4fce345ccf6a83ebac5e1e7ffabb24
        }
        const order = await order_model_1.default.findById(dbOrderId);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
<<<<<<< HEAD
        console.log("initPayment order:", {
            _id: order._id,
            orderId: order.orderId,
            totalAmt: order.totalAmt,
        });
        // 1) SAFE amount → must be a number and > 0
        const totalAmount = Number(order.totalAmt) || 1;
        // 2) Use your sandbox credentials directly to avoid env confusion
        const store_id = "easys690b843505473";
        const store_passwd = "easys690b843505473@ssl";
        const is_live = false; // sandbox
        // 3) For sandbox, use your registered frontend URL for success/fail/cancel
=======
        // If manual payment → no SSL needed
        if (method === "manual") {
            order.payment_method = "manual";
            order.payment_status = "pending";
            await order.save();
            return res.status(200).json({
                message: "Manual payment selected",
                orderId: order.orderId,
            });
        }
        // SSLCommerz payment process
        order.payment_method = "sslcommerz";
        const totalAmount = Number(order.totalAmt) || 1;
        const store_id = "easys690b843505473";
        const store_passwd = "easys690b843505473@ssl";
        const is_live = false;
>>>>>>> d8b16845ce4fce345ccf6a83ebac5e1e7ffabb24
        const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
        const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5001";
        const data = {
            total_amount: totalAmount,
            currency: "BDT",
<<<<<<< HEAD
            tran_id: order.orderId, // UUID from OrderModel
            // Browser redirects (use registered URL for sandbox)
            success_url: `${FRONTEND_URL}/payment/success`,
            fail_url: `${FRONTEND_URL}/payment/fail`,
            cancel_url: `${FRONTEND_URL}/payment/cancel`,
            // Server-to-server IPN callback → backend
            ipn_url: `${BACKEND_URL}/api/payment/ipn`,
            shipping_method: "Courier",
=======
            tran_id: order.orderId,
            success_url: `${BACKEND_URL}/api/payment/success`,
            fail_url: `${BACKEND_URL}/api/payment/fail`,
            cancel_url: `${BACKEND_URL}/api/payment/cancel`,
            ipn_url: `${BACKEND_URL}/api/payment/ipn`,
>>>>>>> d8b16845ce4fce345ccf6a83ebac5e1e7ffabb24
            product_name: "Order Checkout",
            product_category: "Ecommerce",
            product_profile: "general",
            cus_name: user?.name || "Guest",
            cus_email: user?.email || "no-reply@local",
            cus_phone: user?.phone || "0000000000",
            cus_add1: user?.address || "",
            cus_city: "Dhaka",
            cus_country: "Bangladesh",
            ship_name: user?.name || "Guest",
            ship_add1: user?.address || "",
            ship_city: "Dhaka",
            ship_country: "Bangladesh",
            ship_postcode: "1207",
<<<<<<< HEAD
            shipping_method: "YES"
        };
        console.log("SSLCommerz init payload:", data);
=======
            shipping_method: "YES",
        };
>>>>>>> d8b16845ce4fce345ccf6a83ebac5e1e7ffabb24
        const sslcz = new sslcommerz_lts_1.default(store_id, store_passwd, is_live);
        const apiResponse = await sslcz.init(data);
        console.log("SSLCommerz init response:", apiResponse);
        if (apiResponse?.GatewayPageURL) {
            order.payment_session_key = apiResponse.sessionkey;
            await order.save();
            return res.status(200).json({
                message: "Payment session created",
                url: apiResponse.GatewayPageURL,
            });
        }
        else {
            return res.status(400).json({
                message: "Failed to create payment session",
<<<<<<< HEAD
                details: apiResponse, // TEMP: see real error
=======
                details: apiResponse,
>>>>>>> d8b16845ce4fce345ccf6a83ebac5e1e7ffabb24
            });
        }
    }
    catch (error) {
        console.error("initPayment error:", error);
<<<<<<< HEAD
        return res
            .status(500)
            .json({ message: error.message || "Internal Server Error" });
    }
};
exports.initPayment = initPayment;
/**
 * SSLCommerz will POST form-data to these endpoints.
 * Ensure express.urlencoded({ extended: true }) is enabled.
 */
// success
const paymentSuccess = async (req, res) => {
    try {
        // SSLCommerz sends tran_id in form body
        const tran_id = req.body?.tran_id || req.body?.value_a || null;
        if (!tran_id) {
            console.warn("paymentSuccess: tran_id missing", req.body);
            return res.status(400).send("tran_id missing");
        }
        await order_model_1.default.findOneAndUpdate({ orderId: tran_id }, { payment_status: "paid", order_status: "processing" });
        // redirect to frontend success page (you can pass tran_id)
        return res.redirect(`${process.env.FRONTEND_URL}/payment/success?tranId=${tran_id}`);
    }
    catch (error) {
        console.error("paymentSuccess error:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};
exports.paymentSuccess = paymentSuccess;
// fail
const paymentFail = async (req, res) => {
    try {
        const tran_id = req.body?.tran_id || null;
=======
        return res.status(500).json({
            message: error.message || "Internal Server Error",
        });
    }
};
exports.initPayment = initPayment;
// SUCCESS
const paymentSuccess = async (req, res) => {
    try {
        const tran_id = req.body?.tran_id;
        if (!tran_id)
            return res.status(400).send("tran_id missing");
        await order_model_1.default.findOneAndUpdate({ orderId: tran_id }, { payment_status: "paid", order_status: "processing" });
        return res.redirect(`${process.env.FRONTEND_URL}/payment/success?tranId=${tran_id}`);
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.paymentSuccess = paymentSuccess;
// FAIL
const paymentFail = async (req, res) => {
    try {
        const tran_id = req.body?.tran_id;
>>>>>>> d8b16845ce4fce345ccf6a83ebac5e1e7ffabb24
        if (tran_id) {
            await order_model_1.default.findOneAndUpdate({ orderId: tran_id }, { payment_status: "failed", order_status: "cancelled" });
        }
        return res.redirect(`${process.env.FRONTEND_URL}/payment/fail`);
    }
    catch (error) {
<<<<<<< HEAD
        console.error("paymentFail error:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};
exports.paymentFail = paymentFail;
// cancel
const paymentCancel = async (req, res) => {
    try {
        const tran_id = req.body?.tran_id || null;
=======
        return res.status(500).json({ message: error.message });
    }
};
exports.paymentFail = paymentFail;
// CANCEL
const paymentCancel = async (req, res) => {
    try {
        const tran_id = req.body?.tran_id;
>>>>>>> d8b16845ce4fce345ccf6a83ebac5e1e7ffabb24
        if (tran_id) {
            await order_model_1.default.findOneAndUpdate({ orderId: tran_id }, { payment_status: "failed", order_status: "cancelled" });
        }
        return res.redirect(`${process.env.FRONTEND_URL}/payment/cancel`);
    }
    catch (error) {
<<<<<<< HEAD
        console.error("paymentCancel error:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};
exports.paymentCancel = paymentCancel;
// IPN (instant payment notification) — asynchronous server-to-server callback
const paymentIpn = async (req, res) => {
    try {
        const tran_id = req.body?.tran_id;
        const status = req.body?.status || req.body?.status_code || null;
        console.log("IPN received", req.body);
=======
        return res.status(500).json({ message: error.message });
    }
};
exports.paymentCancel = paymentCancel;
// IPN
const paymentIpn = async (req, res) => {
    try {
        const tran_id = req.body?.tran_id;
        const status = req.body?.status;
>>>>>>> d8b16845ce4fce345ccf6a83ebac5e1e7ffabb24
        const order = await order_model_1.default.findOne({ orderId: tran_id });
        if (!order)
            return res.status(404).send("Order not found");
        if (status === "VALID" || status === "VALIDATED" || status === "200") {
            order.payment_status = "paid";
            order.order_status = "processing";
        }
        else {
            order.payment_status = "failed";
            order.order_status = "cancelled";
        }
        await order.save();
        return res.status(200).send("IPN processed");
    }
    catch (error) {
<<<<<<< HEAD
        console.error("paymentIpn error:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
=======
        return res.status(500).json({ message: error.message });
>>>>>>> d8b16845ce4fce345ccf6a83ebac5e1e7ffabb24
    }
};
exports.paymentIpn = paymentIpn;
