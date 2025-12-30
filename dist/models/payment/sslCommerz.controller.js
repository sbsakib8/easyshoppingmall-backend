"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentIpn = exports.paymentCancel = exports.paymentFail = exports.paymentSuccess = exports.initSslPayment = void 0;
const sslcommerz_lts_1 = __importDefault(require("sslcommerz-lts"));
const cart_model_1 = require("../cart/cart.model");
const order_model_1 = __importDefault(require("../order/order.model"));
/**
 * POST /api/payment/init
 * body: { dbOrderId: string, user: { name, email, phone, address }, method: "manual" | "sslcommerz" }
 */
const initSslPayment = async (req, res) => {
    try {
        const { dbOrderId, user } = req.body;
        const order = await order_model_1.default.findById(dbOrderId);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        // ✅ ALWAYS calculate fresh
        const subTotal = order.subTotalAmt || 0;
        const deliveryCharge = order.deliveryCharge || 0;
        const amount = order.payment_type === "delivery"
            ? deliveryCharge
            : subTotal + deliveryCharge;
        const sslData = {
            total_amount: Number(amount.toFixed(2)),
            currency: "BDT",
            tran_id: order.orderId,
            product_name: order.payment_type === "delivery"
                ? "Delivery Charge"
                : "Products + Delivery",
            product_category: "Ecommerce",
            product_profile: "general",
            cus_name: user.name,
            cus_email: user.email,
            cus_phone: user.phone,
            cus_add1: user.address,
            success_url: `${process.env.BACKEND_URL}/api/payment/ssl/success`,
            fail_url: `${process.env.BACKEND_URL}/api/payment/ssl/fail`,
            cancel_url: `${process.env.BACKEND_URL}/api/payment/ssl/cancel`,
        };
        const sslcz = new sslcommerz_lts_1.default(process.env.SSLCOMMERZ_STORE_ID, process.env.SSLCOMMERZ_STORE_PASSWORD, false);
        const apiResponse = await sslcz.init(sslData);
        order.payment_details = { sessionKey: apiResponse.sessionkey || "" };
        await order.save();
        // console.log("PAYMENT TYPE:", order.payment_type);
        // console.log("DELIVERY CHARGE:", order.deliveryCharge);
        // console.log("TOTAL AMOUNT:", order.totalAmt);
        return res.json({ url: apiResponse.GatewayPageURL });
    }
    catch (err) {
        console.error("SSL init error:", err);
        res.status(500).json({ message: "SSL payment initialization failed" });
    }
};
exports.initSslPayment = initSslPayment;
// SUCCESS
const paymentSuccess = async (req, res) => {
    try {
        const { tran_id } = req.body;
        if (!tran_id) {
            return res.status(400).redirect(`${process.env.FRONTEND_URL}/payment/fail?error=InvalidTransactionID`);
        }
        const order = await order_model_1.default.findOne({ orderId: tran_id });
        if (!order) {
            return res.status(404).redirect(`${process.env.FRONTEND_URL}/payment/fail?error=OrderNotFound`);
        }
        // =================================================================
        // 🔒 CRITICAL: VALIDATE THE PAYMENT WITH SSLCOMMERZ
        // =================================================================
        const storeId = process.env.SSLCOMMERZ_STORE_ID;
        const storePassword = process.env.SSLCOMMERZ_STORE_PASSWORD;
        if (!storeId || !storePassword) {
            throw new Error("SSLCommerz store ID and password must be set in environment variables.");
        }
        const sslcz = new sslcommerz_lts_1.default(storeId, storePassword, false // false for live, true for sandbox
        );
        const validation = await sslcz.validate(req.body);
        if (validation?.status !== 'VALID' && validation?.status !== 'VALIDATED') {
            // Payment is not valid
            await order_model_1.default.findOneAndUpdate({ orderId: tran_id }, {
                payment_status: "failed",
                order_status: "cancelled",
                payment_details: req.body
            });
            return res.redirect(`${process.env.FRONTEND_URL}/payment/fail?error=ValidationFailed`);
        }
        // =================================================================
        // ✅ PAYMENT IS VALID - UPDATE ORDER & CART
        // =================================================================
        // Update payment status and details
        order.payment_status = "paid";
        order.order_status = "processing";
        order.payment_details = req.body;
        // Calculate amount_paid and amount_due based on payment type
        if (order.payment_type === "delivery") {
            order.amount_paid = order.deliveryCharge;
            order.amount_due = order.subTotalAmt;
        }
        else { // "full" payment
            order.amount_paid = order.totalAmt;
            order.amount_due = 0;
        }
        await order.save();
        // Clear user's cart
        const cart = await cart_model_1.CartModel.findOne({ userId: order.userId });
        if (cart) {
            cart.products = [];
            cart.subTotalAmt = 0;
            cart.totalAmt = 0;
            await cart.save();
        }
        return res.redirect(`${process.env.FRONTEND_URL}/payment/success?tranId=${tran_id}`);
    }
    catch (error) {
        console.error("Payment Success Error:", error);
        return res.status(500).redirect(`${process.env.FRONTEND_URL}/payment/fail?error=ServerError`);
    }
};
exports.paymentSuccess = paymentSuccess;
// FAIL
const paymentFail = async (req, res) => {
    try {
        const { tran_id } = req.body;
        if (tran_id) {
            await order_model_1.default.findOneAndUpdate({ orderId: tran_id }, {
                payment_status: "failed",
                order_status: "cancelled",
                payment_details: req.body
            });
        }
        return res.redirect(`${process.env.FRONTEND_URL}/payment/fail`);
    }
    catch (error) {
        console.error("Payment Fail Error:", error);
        return res.status(500).redirect(`${process.env.FRONTEND_URL}/payment/fail?error=ServerError`);
    }
};
exports.paymentFail = paymentFail;
// CANCEL
const paymentCancel = async (req, res) => {
    try {
        const { tran_id } = req.body;
        if (tran_id) {
            await order_model_1.default.findOneAndUpdate({ orderId: tran_id }, {
                payment_status: "failed",
                order_status: "cancelled",
                payment_details: req.body
            });
        }
        return res.redirect(`${process.env.FRONTEND_URL}/payment/cancel`);
    }
    catch (error) {
        console.error("Payment Cancel Error:", error);
        return res.status(500).redirect(`${process.env.FRONTEND_URL}/payment/cancel?error=ServerError`);
    }
};
exports.paymentCancel = paymentCancel;
// IPN - Instant Payment Notification
const paymentIpn = async (req, res) => {
    try {
        const ipnData = req.body;
        const { tran_id } = ipnData;
        if (!tran_id) {
            return res.status(400).send("IPN: tran_id missing");
        }
        // =================================================================
        // 🔒 CRITICAL: VALIDATE THE IPN DATA WITH SSLCOMMERZ
        // =================================================================
        const storeId = process.env.SSLCOMMERZ_STORE_ID;
        const storePassword = process.env.SSLCOMMERZ_STORE_PASSWORD;
        if (!storeId || !storePassword) {
            throw new Error("SSLCommerz store ID and password must be set in environment variables.");
        }
        const sslcz = new sslcommerz_lts_1.default(storeId, storePassword, false // false for live, true for sandbox
        );
        const validation = await sslcz.validate(ipnData);
        if (validation?.status !== 'VALID' && validation?.status !== 'VALIDATED') {
            // Payment is not valid, log it but don't necessarily fail the order yet,
            // as the primary success/fail handlers are the source of truth.
            console.log(`IPN validation failed for tran_id: ${tran_id}`);
            return res.status(200).send("IPN Handled - Validation Failed");
        }
        // =================================================================
        // ✅ IPN IS VALID - UPDATE ORDER IF IT'S STILL PENDING
        // =================================================================
        const order = await order_model_1.default.findOne({ orderId: tran_id });
        if (!order) {
            return res.status(404).send("IPN: Order not found");
        }
        // Only update if the primary success handler hasn't already
        if (order.payment_status === "pending") {
            order.payment_status = "paid";
            order.order_status = "processing";
            order.payment_details = ipnData;
            if (order.payment_type === "delivery") {
                order.amount_paid = order.deliveryCharge;
                order.amount_due = order.subTotalAmt;
            }
            else {
                order.amount_paid = order.totalAmt;
                order.amount_due = 0;
            }
            await order.save();
            const cart = await cart_model_1.CartModel.findOne({ userId: order.userId });
            if (cart) {
                cart.products = [];
                cart.subTotalAmt = 0;
                cart.totalAmt = 0;
                await cart.save();
            }
            console.log(`IPN processed successfully for tran_id: ${tran_id}`);
        }
        return res.status(200).send("IPN Handled");
    }
    catch (error) {
        console.error("IPN Error:", error);
        return res.status(500).json({ message: "IPN processing failed" });
    }
};
exports.paymentIpn = paymentIpn;
