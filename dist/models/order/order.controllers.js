"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteOrder = exports.payDueAmount = exports.confirmManualPayment = exports.getOrdersByStatus = exports.getAllOrders = exports.createManualOrder = exports.ManualPayment = exports.updateOrderStatus = exports.getOrderDetails = exports.getMyOrders = exports.createOrder = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const cart_utils_1 = require("../../utils/cart.utils");
const cart_model_1 = require("../cart/cart.model");
const user_model_1 = __importDefault(require("../user/user.model"));
const order_model_1 = __importDefault(require("./order.model"));
const coupon_model_1 = __importDefault(require("../coupon/coupon.model"));
const websiteinfo_model_1 = __importDefault(require("../content/websiteInfo/websiteinfo.model"));
const referral_model_1 = __importDefault(require("../referral/referral.model"));
const { v4: uuidv4 } = require('uuid');
/**
 * @desc Create a new order from user's cart
 * @route POST /api/orders/create
 * @access Private (User)
 */
const createOrder = async (req, res) => {
    try {
        const { delivery_address, payment_method, payment_details, payment_type, appliedCoupon } = req.body; // Renamed paymentMethod to payment_method, paymentDetails to payment_details
        const userId = req.userId; // Get userId from AuthRequest
        const subtotalFromReq = Number(req.body.subtotal) || 0; // Not used in this version after product price calculation
        if (!userId || !delivery_address) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields (userId, delivery_address)",
            });
        }
        // Validate delivery_address structure
        const requiredAddressFields = ["address_line", "district", "division", "upazila_thana", "pincode", "country", "mobile"];
        const missingAddressFields = requiredAddressFields.filter(field => !delivery_address[field]);
        if (missingAddressFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Missing required address fields: ${missingAddressFields.join(", ")}`,
            });
        }
        const cart = await cart_model_1.CartModel.findOne({ userId }).populate({
            path: "products.productId",
            populate: [
                { path: "category", model: "Category" },
                { path: "subCategory", model: "SubCategory" }
            ]
        });
        if (!cart || cart.products.length === 0) {
            return res.status(404).json({ success: false, message: "Cart is empty" });
        }
        const validProducts = cart.products.filter((item) => item.productId && "_id" in item.productId);
        if (validProducts.length === 0) {
            return res.status(400).json({ success: false, message: "No valid products in cart" });
        }
        const orderProducts = validProducts.map((item) => {
            const product = item.productId;
            const productPrice = Number(product.price) || 0;
            const quantity = Number(item.quantity) || 0;
            return {
                productId: product._id,
                name: product.productName || "Unnamed Product",
                image: product.images || [],
                quantity: quantity,
                price: productPrice,
                totalPrice: quantity * productPrice,
                size: item.size,
                color: item.color,
                weight: item.weight,
            };
        });
        // Create order
        if (!payment_method) {
            return res.status(400).json({
                success: false,
                message: "Payment method is required for this endpoint.",
            });
        }
        // Verify Delivery Charge on Server
        const dhakaDistricts = [
            "Dhaka", "ঢাকা", "Dhanmondi", "Gulshan", "Mirpur", "Motijheel",
            "Uttara", "Mohammadpur", "Tejgaon", "Kamrangirchar"
        ];
        let calculatedDeliveryCharge = 130;
        if (delivery_address?.district) {
            const district = delivery_address.district;
            if (dhakaDistricts.some(d => district.includes(d))) {
                calculatedDeliveryCharge = 80;
            }
        }
        // Handle Coupon applying
        let couponDiscount = 0;
        if (appliedCoupon) {
            const coupon = await coupon_model_1.default.findOne({ code: appliedCoupon.toUpperCase(), isActive: true });
            if (coupon) {
                let subTotalCalc = orderProducts.reduce((acc, p) => acc + p.totalPrice, 0);
                // Optional checks (same as applyCoupon logic):
                const now = new Date();
                const validTime = now >= coupon.validFrom && now <= coupon.validUntil;
                const withinLimits = (coupon.usageLimit === 0 || coupon.usedCount < coupon.usageLimit);
                const meetsMinimum = subTotalCalc >= coupon.minOrderAmount;
                if (validTime && withinLimits && meetsMinimum) {
                    if (coupon.discountType === "flat") {
                        couponDiscount = coupon.discountAmount;
                    }
                    else if (coupon.discountType === "percentage") {
                        couponDiscount = subTotalCalc * (coupon.discountAmount / 100);
                        if (coupon.maxDiscountAmount > 0 && couponDiscount > coupon.maxDiscountAmount) {
                            couponDiscount = coupon.maxDiscountAmount;
                        }
                    }
                    if (couponDiscount > subTotalCalc)
                        couponDiscount = subTotalCalc;
                    // Increment usage
                    coupon.usedCount += 1;
                    await coupon.save();
                }
                else {
                    // You might reject the order if coupon is invalid, or just proceed without discount
                    // For now, proceeding with 0 discount if it fails validation at last second
                    console.warn(`Coupon ${appliedCoupon} failed final checkout validation`);
                }
            }
        }
        // Fetch current financial settings for snapshot
        const websiteInfo = await websiteinfo_model_1.default.findOne();
        const referralSettings = await referral_model_1.default.findOne();
        const referralBonusPerProduct = referralSettings?.referralBonusPerProduct || 0;
        const profitPerProduct = websiteInfo?.profitPerProduct || 0;
        // Create order
        const order = new order_model_1.default({
            userId,
            cart: cart._id,
            orderId: uuidv4(),
            products: orderProducts,
            address: delivery_address,
            payment_method: payment_method,
            payment_status: "pending",
            payment_details: payment_details || null,
            payment_type: payment_type || "full",
            order_status: "pending",
            deliveryCharge: calculatedDeliveryCharge,
            appliedCoupon: appliedCoupon || null,
            couponDiscount: couponDiscount || 0,
            referralBonusPerProduct,
            profitPerProduct,
        });
        await order.save();
        // Cart will be cleared after payment is confirmed (in paymentSuccess, confirmManualPayment, paymentIpn)
        await user_model_1.default.findByIdAndUpdate(userId, {
            $push: { orderHistory: order._id },
        });
        res.status(201).json({
            success: true,
            message: "Order placed successfully",
            data: order,
        });
    }
    catch (error) {
        console.error("Order Creation Error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error",
        });
    }
};
exports.createOrder = createOrder;
const getMyOrders = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized user" });
            return;
        }
        const orders = await order_model_1.default.find({ userId })
            .populate({
            path: "products.productId",
            populate: [
                { path: "category", model: "Category" },
                { path: "subCategory", model: "SubCategory" }
            ]
        })
            .sort({ createdAt: -1 });
        res.json({
            success: true,
            message: "User orders fetched successfully",
            data: orders,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error",
        });
    }
};
exports.getMyOrders = getMyOrders;
const getOrderDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const order = await order_model_1.default.findById(id)
            .populate({
            path: "products.productId",
            populate: [
                { path: "category", model: "Category" },
                { path: "subCategory", model: "SubCategory" }
            ]
        })
            .populate("userId", "name email mobile");
        if (!order) {
            res.status(404).json({ success: false, message: "Order not found" });
            return;
        }
        res.json({ success: true, data: order });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getOrderDetails = getOrderDetails;
/**
 * @desc Update order status (Admin only)
 * @route PUT /api/orders/:id/status
 * @access Private (Admin)
 */
const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!status) {
            res.status(400).json({ success: false, message: "Status is required" });
            return;
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ success: false, message: "Invalid order ID" });
            return;
        }
        const allowedStatuses = ["pending", "processing", "shipped", "delivered", "cancelled", "completed"];
        if (!allowedStatuses.includes(status)) {
            res.status(400).json({
                success: false,
                message: `Invalid status provided. Allowed statuses are: ${allowedStatuses.join(", ")}`,
            });
            return;
        }
        const order = await order_model_1.default.findById(id).populate("userId");
        if (!order) {
            res.status(404).json({ success: false, message: "Order not found" });
            return;
        }
        order.order_status = status;
        // Referral/Profit Logic
        const isFinished = status === "delivered" || status === "completed";
        const user = order.userId;
        console.log(`[Order Update] ID: ${id}, Status: ${status}, IsFinished: ${isFinished}`);
        if (isFinished) {
            order.payment_status = "paid";
            order.amount_paid = order.totalAmt;
            order.amount_due = 0;
            const orderItemCount = order.products.reduce((acc, p) => acc + (p.quantity || 1), 0);
            // 1. Referral Bonus Logic for DROPSHIPPING (Referrer)
            if (!order.referralBonusGiven && user && user.referredBy) {
                const referrer = await user_model_1.default.findById(user.referredBy);
                if (referrer && (referrer.roles?.includes("DROPSHIPPING") || referrer.role === "DROPSHIPPING")) {
                    let bonusAmount = 0;
                    // Priority 1: Snapshotted Fixed per Product Bonus
                    if ((order.referralBonusPerProduct ?? 0) > 0) {
                        bonusAmount = (order.referralBonusPerProduct ?? 0) * orderItemCount;
                    }
                    else {
                        // Priority 2: Live/Legacy Settings
                        const referralSettings = await referral_model_1.default.findOne();
                        const referralBonus = referralSettings?.referralPercentage || 0;
                        if (referralBonus > 0) {
                            bonusAmount = referralBonus;
                        }
                        else {
                            if (order.totalAmt >= 500) {
                                bonusAmount = Math.floor(order.totalAmt / 500) * 10;
                            }
                            else {
                                referrer.deliveredItemsCount = (referrer.deliveredItemsCount || 0) + orderItemCount;
                                if (referrer.deliveredItemsCount > 10) {
                                    bonusAmount = 10;
                                }
                            }
                        }
                    }
                    if (bonusAmount > 0) {
                        referrer.balance = (referrer.balance || 0) + bonusAmount;
                        order.referralBonusGiven = true;
                        order.referralBonusAmount = bonusAmount;
                        await referrer.save();
                    }
                }
            }
            // 2. Profit Logic for DROPSHIPPING (Order Owner)
            if (!order.profitGiven && user && (user.roles?.includes("DROPSHIPPING") || user.role === "DROPSHIPPING")) {
                let totalProfit = 0;
                // Priority 1: Snapshotted Fixed per Product Profit
                if ((order.profitPerProduct ?? 0) > 0) {
                    totalProfit = (order.profitPerProduct ?? 0) * orderItemCount;
                }
                else {
                    // Priority 2: (Selling - Cost) Calculation
                    totalProfit = order.products.reduce((sum, p) => {
                        const cost = Number(p.costPrice || p.price) || 0;
                        const selling = Number(p.sellingPrice) || 0;
                        const itemProfit = selling > cost ? (selling - cost) * (p.quantity || 1) : 0;
                        return sum + itemProfit;
                    }, 0);
                }
                if (totalProfit > 0) {
                    await user_model_1.default.findByIdAndUpdate(user._id, {
                        $inc: { balance: totalProfit }
                    });
                    order.profitGiven = true;
                    order.profitAmount = totalProfit;
                }
            }
        }
        await order.save();
        res.json({
            success: true,
            message: "Order status updated successfully",
            data: order,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error",
        });
    }
};
exports.updateOrderStatus = updateOrderStatus;
// POST /order/manual-payment
const ManualPayment = async (req, res) => {
    try {
        const { orderId, provider, senderNumber, transactionId } = req.body;
        if (!orderId || !provider || !senderNumber || !transactionId) {
            return res.status(400).json({
                success: false,
                message: "Order ID, provider, sender number, and transaction ID are required.",
            });
        }
        const allowedManualProviders = ["bkash", "nagad", "rocket", "upay"];
        if (!allowedManualProviders.includes(provider)) {
            return res.status(400).json({
                success: false,
                message: `Invalid manual payment provider. Must be one of: ${allowedManualProviders.join(", ")}`,
            });
        }
        // ❌ HARD BLOCK: duplicate transactionId (cloud-safe)
        const existingTxn = await order_model_1.default.findOne({ transactionId });
        if (existingTxn) {
            return res.status(409).json({
                success: false,
                message: "This transaction ID has already been used.",
            });
        }
        /**
         * 🔒 ATOMIC UPDATE (CRITICAL)
         * - Order must be manual
         * - Payment must be pending
         * - transactionId must not exist
         */
        const order = await order_model_1.default.findOneAndUpdate({
            _id: orderId,
            payment_method: "manual",
            payment_status: "pending",
            transactionId: { $exists: false },
        }, {
            $set: {
                transactionId,
                payment_status: "submitted",
                payment_details: {
                    manual: {
                        provider,
                        senderNumber,
                        transactionId,
                        paidFor: undefined, // backend decides below
                    },
                },
            },
        }, { new: true });
        if (!order) {
            return res.status(409).json({
                success: false,
                message: "Order not found or payment already submitted.",
            });
        }
        // ==============================
        // 🧠 BACKEND-CONTROLLED LOGIC
        // ==============================
        if (order.payment_type === "delivery") {
            order.amount_paid = order.deliveryCharge;
            order.amount_due = order.totalAmt - order.deliveryCharge;
        }
        else {
            order.amount_paid = order.totalAmt;
            order.amount_due = 0;
        }
        order.payment_details.manual.paidFor = order.payment_type;
        await order.save();
        // ✅ Add order to user's history (idempotent safe)
        await user_model_1.default.findByIdAndUpdate(order.userId, {
            $addToSet: { orderHistory: order._id },
        });
        return res.json({
            success: true,
            message: "Manual payment info submitted, pending admin confirmation",
            order,
        });
    }
    catch (err) {
        console.error("Manual Payment Error:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};
exports.ManualPayment = ManualPayment;
/**
 * @desc Create a new manual order from user's cart
 * @route POST /api/orders/manual
 * @access Private (User)
 */
const createManualOrder = async (req, res) => {
    let order = null;
    try {
        const { delivery_address, payment_details, payment_type, payment_method, appliedCoupon } = req.body;
        const userId = req.userId;
        // ✅ 1. Basic validation
        if (!userId || !delivery_address) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields (userId, delivery_address)",
            });
        }
        // ✅ 2. Validate delivery_address
        const requiredAddressFields = [
            "address_line",
            "district",
            "division",
            "upazila_thana",
            "country",
            "mobile",
        ];
        const missingFields = requiredAddressFields.filter(field => !delivery_address[field]);
        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Missing required address fields: ${missingFields.join(", ")}`,
            });
        }
        // ✅ 3. Validate products (Priority: req.body.products > database cart)
        let orderProducts = [];
        let cartId = null;
        if (req.body.products && Array.isArray(req.body.products) && req.body.products.length > 0) {
            orderProducts = req.body.products.map((p) => ({
                productId: p.productId,
                name: p.name || "Product",
                image: p.image || [],
                quantity: Number(p.quantity) || 1,
                price: Number(p.costPrice || p.price) || 0,
                costPrice: Number(p.costPrice || p.price) || 0,
                sellingPrice: Number(p.sellingPrice) || Number(p.price) || 0,
                totalPrice: (Number(p.quantity) || 1) * (Number(p.sellingPrice || p.price) || 0),
                size: p.size ?? null,
                color: p.color ?? null,
                weight: p.weight ?? null,
            }));
        }
        else {
            const cart = await cart_model_1.CartModel.findOne({ userId }).populate({
                path: "products.productId",
                populate: [
                    { path: "category", model: "Category" },
                    { path: "subCategory", model: "SubCategory" }
                ]
            });
            if (!cart || cart.products.length === 0) {
                return res.status(404).json({ success: false, message: "Cart is empty" });
            }
            cartId = cart._id;
            const validProducts = cart.products.filter((item) => {
                const product = item.productId;
                return product && typeof product === "object" && "_id" in product;
            });
            if (validProducts.length === 0) {
                return res.status(400).json({ success: false, message: "No valid products in cart" });
            }
            orderProducts = validProducts.map((item) => {
                const product = item.productId;
                const quantity = Number(item.quantity) || 0;
                const price = Number(product.price) || 0;
                return {
                    productId: product._id,
                    name: product.productName || "Unnamed Product",
                    image: product.images || [],
                    quantity,
                    price,
                    sellingPrice: price, // Default for manual/B2C
                    totalPrice: quantity * price,
                    size: item.size ?? null,
                    color: item.color ?? null,
                    weight: item.weight ?? null,
                };
            });
        }
        // Handle Coupon applying first so that balance check is accurate
        let couponDiscount = 0;
        if (appliedCoupon) {
            const coupon = await coupon_model_1.default.findOne({ code: appliedCoupon.toUpperCase(), isActive: true });
            if (coupon) {
                let subTotalCalc = orderProducts.reduce((acc, p) => acc + p.totalPrice, 0);
                // Optional checks (same as applyCoupon logic):
                const now = new Date();
                const validTime = now >= coupon.validFrom && now <= coupon.validUntil;
                const withinLimits = (coupon.usageLimit === 0 || coupon.usedCount < coupon.usageLimit);
                const meetsMinimum = subTotalCalc >= coupon.minOrderAmount;
                if (validTime && withinLimits && meetsMinimum) {
                    if (coupon.discountType === "flat") {
                        couponDiscount = coupon.discountAmount;
                    }
                    else if (coupon.discountType === "percentage") {
                        couponDiscount = subTotalCalc * (coupon.discountAmount / 100);
                        if (coupon.maxDiscountAmount > 0 && couponDiscount > coupon.maxDiscountAmount) {
                            couponDiscount = coupon.maxDiscountAmount;
                        }
                    }
                    if (couponDiscount > subTotalCalc)
                        couponDiscount = subTotalCalc;
                    // Increment usage
                    coupon.usedCount += 1;
                    await coupon.save();
                }
                else {
                    console.warn(`Coupon ${appliedCoupon} failed final checkout validation`);
                }
            }
        }
        // ✅ 4. Payment validation
        if (payment_method === "manual") {
            if (!payment_details || !payment_details.transactionId) {
                return res.status(400).json({
                    success: false,
                    message: "Transaction ID is required for manual payment",
                });
            }
            const existingOrder = await order_model_1.default.findOne({
                payment_method: "manual",
                "payment_details.manual.transactionId": payment_details.transactionId,
            });
            if (existingOrder) {
                return res.status(400).json({
                    success: false,
                    message: "এই ট্রানজ্যাকশন আইডি ইতিমধ্যেই ব্যবহার হয়েছে!",
                });
            }
        }
        else if (payment_method === "balance") {
            const user = await user_model_1.default.findById(userId);
            if (!user) {
                return res.status(404).json({ success: false, message: "User not found" });
            }
            // Calculate total with delivery (Backend should recalculate to be safe)
            const dhakaDistricts = ["Dhaka", "ঢাকা", "Dhanmondi", "Gulshan", "Mirpur", "Motijheel", "Uttara", "Mohammadpur", "Tejgaon", "Kamrangirchar"];
            let calculatedDeliveryCharge = 130;
            if (delivery_address?.district && dhakaDistricts.some(d => delivery_address.district.includes(d))) {
                calculatedDeliveryCharge = 80;
            }
            // Dropshipper pays wholesale cost price upfront
            const wholesaleSubTotal = orderProducts.reduce((acc, p) => acc + (p.quantity * (p.costPrice || p.price)), 0);
            let totalToPay = payment_type === "delivery" ? calculatedDeliveryCharge : (wholesaleSubTotal + calculatedDeliveryCharge - couponDiscount);
            if (totalToPay < 0)
                totalToPay = 0;
            if ((user.balance || 0) < totalToPay) {
                return res.status(400).json({ success: false, message: "Insufficient balance" });
            }
            // Deduct balance
            user.balance = (user.balance || 0) - totalToPay;
            await user.save();
        }
        // Verify Delivery Charge on Server (Duplicate but kept for logic consistency)
        const dhakaDistricts = [
            "Dhaka", "ঢাকা", "Dhanmondi", "Gulshan", "Mirpur", "Motijheel",
            "Uttara", "Mohammadpur", "Tejgaon", "Kamrangirchar"
        ];
        let calculatedDeliveryCharge = 130;
        if (delivery_address?.district) {
            const district = delivery_address.district;
            if (dhakaDistricts.some(d => district.includes(d))) {
                calculatedDeliveryCharge = 80;
            }
        }
        // Fetch current financial settings for snapshot
        const websiteInfo = await websiteinfo_model_1.default.findOne();
        const referralSettings = await referral_model_1.default.findOne();
        const referralBonusPerProduct = referralSettings?.referralBonusPerProduct || 0;
        const profitPerProduct = websiteInfo?.profitPerProduct || 0;
        // ✅ 5. Create order
        order = new order_model_1.default({
            userId,
            cart: cartId || null,
            orderId: uuidv4(),
            products: orderProducts,
            address: delivery_address,
            payment_method,
            payment_type,
            payment_details: payment_details || {},
            payment_status: payment_method === "balance" ? "paid" : "pending",
            order_status: payment_method === "balance" ? "processing" : "pending",
            deliveryCharge: calculatedDeliveryCharge,
            appliedCoupon: appliedCoupon || null,
            couponDiscount: couponDiscount || 0,
            referralBonusPerProduct,
            profitPerProduct,
        });
        await order.save();
        // ✅ 6. Update user's order history
        await user_model_1.default.findByIdAndUpdate(userId, {
            $push: { orderHistory: order._id },
        });
        // ✅ 7. Clear user's cart
        await (0, cart_utils_1.clearUserCart)(userId);
        // ✅ 8. Respond success
        return res.status(201).json({
            success: true,
            message: "Manual order placed successfully",
            data: order,
        });
    }
    catch (error) {
        console.error("Manual Order Creation Error:", error);
        // ⚠️ Rollback partially created order
        if (order?._id) {
            try {
                await order_model_1.default.findByIdAndDelete(order._id);
                console.log("Rollback: Deleted partially created order:", order._id);
            }
            catch (rollbackError) {
                console.error("Rollback failed:", rollbackError);
            }
        }
        return res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error",
        });
    }
};
exports.createManualOrder = createManualOrder;
/**
 * @desc Get all orders for admin
 * @route GET /api/admin/orders/all
 * @access Private (Admin)
 */
const getAllOrders = async (req, res) => {
    try {
        const orders = await order_model_1.default.find()
            .populate({
            path: "products.productId",
            populate: [
                { path: "category", model: "Category" },
                { path: "subCategory", model: "SubCategory" }
            ]
        })
            .populate({
            path: "userId",
            select: "name email role referredBy",
            populate: {
                path: "referredBy",
                select: "name referralCode"
            }
        }) // Populate user details including referrer info
            .sort({ createdAt: -1 });
        res.json({
            success: true,
            message: "All orders fetched successfully",
            data: orders,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error",
        });
    }
};
exports.getAllOrders = getAllOrders;
/**
 * @desc Get orders by status for admin
 * @route GET /api/admin/orders/status/:status
 * @access Private (Admin)
 */
const getOrdersByStatus = async (req, res) => {
    try {
        const { status } = req.params;
        if (!status) {
            res.status(400).json({ success: false, message: "Order status is required" });
            return;
        }
        const orders = await order_model_1.default.find({ order_status: status })
            .populate({
            path: "products.productId",
            populate: [
                { path: "category", model: "Category" },
                { path: "subCategory", model: "SubCategory" }
            ]
        })
            .populate({
            path: "userId",
            select: "name email role referredBy",
            populate: {
                path: "referredBy",
                select: "name referralCode"
            }
        }) // Populate user details including referrer info
            .sort({ createdAt: -1 });
        res.json({
            success: true,
            message: `Orders with status "${status}" fetched successfully`,
            data: orders,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error",
        });
    }
};
exports.getOrdersByStatus = getOrdersByStatus;
/**
 * @desc Confirm manual payment for an order (Admin only)
 * @route PUT /api/orders/:id/confirm-payment
 * @access Private (Admin)
 */
const confirmManualPayment = async (req, res) => {
    try {
        const { id } = req.params; // this is orderId (UUID)
        const order = await order_model_1.default.findOne({ orderId: id });
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }
        if (order.payment_method !== "manual") {
            return res.status(400).json({ success: false, message: "Not a manual payment order" });
        }
        if (order.payment_status !== "submitted") {
            return res.status(400).json({
                success: false,
                message: "Manual payment not submitted or already processed",
            });
        }
        const allowedManualProviders = ["bkash", "nagad", "rocket", "upay"];
        const submittedProvider = order.payment_details?.manual?.provider;
        if (!submittedProvider || !allowedManualProviders.includes(submittedProvider)) {
            return res.status(400).json({
                success: false,
                message: `Invalid or missing manual payment provider in submission. Must be one of: ${allowedManualProviders.join(", ")}.`,
            });
        }
        order.payment_status = "paid";
        order.order_status = "processing";
        // Ensure totalAmt and subTotalAmt are up-to-date before calculating paid/due amounts
        await order.save(); // This will trigger the pre-save hook to recalculate totals
        const updatedOrder = await order_model_1.default.findById(order._id); // Re-fetch the updated order document
        if (!updatedOrder) {
            return res.status(404).json({ success: false, message: "Order not found after update" });
        }
        if (updatedOrder.payment_type === "delivery") {
            updatedOrder.amount_paid = updatedOrder.deliveryCharge;
            updatedOrder.amount_due = updatedOrder.totalAmt - updatedOrder.deliveryCharge;
        }
        else { // Handles 'full' payment type
            updatedOrder.amount_paid = updatedOrder.totalAmt;
            updatedOrder.amount_due = 0;
        }
        await updatedOrder.save(); // Save the order with updated paid/due amounts
        // ✅ CLEAR CART
        await (0, cart_utils_1.clearUserCart)(order.userId);
        res.json({
            success: true,
            message: "Manual payment confirmed successfully",
            data: updatedOrder.populate("userId", "name email"),
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.confirmManualPayment = confirmManualPayment;
/**
 * @desc Pay due amount for an existing order (User only)
 * @route POST /api/orders/:id/pay-due
 * @access Private (User)
 */
const payDueAmount = async (req, res) => {
    try {
        const { id } = req.params;
        const { paymentMethod, paymentType, manualDetails } = req.body;
        const userId = req.userId;
        if (!paymentMethod || !paymentType) {
            return res.status(400).json({
                success: false,
                message: "Payment method and payment type are required.",
            });
        }
        const order = await order_model_1.default.findById(id);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }
        // Verify ownership
        if (order.userId.toString() !== userId) {
            return res.status(403).json({ success: false, message: "Unauthorized" });
        }
        // Recalculate totals to be sure
        // (This happens in pre-save, but we need the values now)
        let subTotal = order.products.reduce((acc, p) => acc + (p.totalPrice || 0), 0);
        const totalAmt = subTotal + (order.deliveryCharge || 0) - (order.couponDiscount || 0);
        let amountToPay = 0;
        if (paymentType === "delivery") {
            amountToPay = order.deliveryCharge;
        }
        else {
            amountToPay = totalAmt;
        }
        if (paymentMethod === "balance") {
            const user = await user_model_1.default.findById(userId);
            if (!user) {
                return res.status(404).json({ success: false, message: "User not found" });
            }
            if ((user.balance || 0) < amountToPay) {
                return res.status(400).json({ success: false, message: "Insufficient balance" });
            }
            // Deduct balance
            user.balance = (user.balance || 0) - amountToPay;
            await user.save();
            // Update Order
            order.payment_method = "balance";
            order.payment_type = paymentType;
            order.payment_status = "paid";
            order.order_status = "processing";
            // amount_paid and amount_due will be updated in pre-save hook
            await order.save();
            return res.json({
                success: true,
                message: `Payment of ৳${amountToPay} successful via balance.`,
                order,
            });
        }
        else if (paymentMethod === "manual") {
            if (!manualDetails || !manualDetails.transactionId || !manualDetails.provider) {
                return res.status(400).json({
                    success: false,
                    message: "Transaction ID and provider are required for manual payment",
                });
            }
            // Check for duplicate transactionId
            const existingTxn = await order_model_1.default.findOne({
                "payment_details.manual.transactionId": manualDetails.transactionId
            });
            if (existingTxn) {
                return res.status(400).json({
                    success: false,
                    message: "This transaction ID has already been used.",
                });
            }
            // Update Order
            order.payment_method = "manual";
            order.payment_type = paymentType;
            order.payment_status = "submitted";
            order.payment_details = {
                manual: {
                    provider: manualDetails.provider,
                    senderNumber: manualDetails.senderNumber || "N/A",
                    transactionId: manualDetails.transactionId,
                    paidFor: paymentType,
                },
            };
            await order.save();
            return res.json({
                success: true,
                message: "Manual payment info submitted, pending admin confirmation",
                order,
            });
        }
        return res.status(400).json({ success: false, message: "Invalid payment method" });
    }
    catch (error) {
        console.error("Pay Due Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.payDueAmount = payDueAmount;
/**
 * @desc Delete an order by ID (Admin only)
 * @route DELETE /api/orders/:id
 * @access Private (Admin)
 */
const deleteOrder = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ success: false, message: "Invalid order ID" });
            return;
        }
        const order = await order_model_1.default.findById(id);
        if (!order) {
            res.status(404).json({ success: false, message: "Order not found" });
            return;
        }
        // Find the user and pull the order from their orderHistory
        await user_model_1.default.findByIdAndUpdate(order.userId, {
            $pull: { orderHistory: order._id },
        });
        // Delete the order
        await order_model_1.default.findByIdAndDelete(id);
        res.json({
            success: true,
            message: "Order deleted successfully",
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error",
        });
    }
};
exports.deleteOrder = deleteOrder;
