import { Request, Response } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../../middlewares/isAuth";
import { clearUserCart } from "../../utils/cart.utils";
import { CartModel } from "../cart/cart.model";
import UserModel from "../user/user.model";
import { AuthUser } from "./interface";
import OrderModel from "./order.model";
import CouponModel from "../coupon/coupon.model";
import WebsiteInfo from "../content/websiteInfo/websiteinfo.model";
import Referral from "../referral/referral.model";
import { validateAndCalculateDiscount } from "../coupon/coupon.service";
import productModel from "../product/product.model";
import Notification from "../notification/notification.model";
import crypto from "crypto";
const uuidv4 = () => crypto.randomUUID();

/**
 * Extending Express Request to include user
 */
interface RequestWithUser extends Request {
  user?: AuthUser;
}

/**
 * @desc Create a new order from user's cart
 * @route POST /api/orders/create
 * @access Private (User)
 */
export const createOrder = async (req: AuthRequest, res: Response) => { // Changed Request to AuthRequest
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { delivery_address, payment_method, payment_details, payment_type, appliedCoupon } = req.body; // Renamed paymentMethod to payment_method, paymentDetails to payment_details
    const userId = req.userId; // Get userId from AuthRequest

    if (!userId || !delivery_address) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Missing required fields (userId, delivery_address)",
      });
    }

    // Validate delivery_address structure
    const requiredAddressFields = ["address_line", "district", "division", "upazila_thana", "pincode", "country", "mobile"];
    const missingAddressFields = requiredAddressFields.filter(field => !delivery_address[field]);
    if (missingAddressFields.length > 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: `Missing required address fields: ${missingAddressFields.join(", ")}`,
      });
    }


    const cart = await CartModel.findOne({ userId }).session(session).populate({
      path: "products.productId",
      populate: [
        { path: "category" },
        { path: "subCategory" }
      ]
    });

    if (!cart || cart.products.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: "Cart is empty" });
    }

    const validProducts = cart.products.filter(
      (item: any) => item.productId && "_id" in item.productId
    );

    if (validProducts.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: "No valid products in cart" });
    }

    // Fetch images directly from DB — populate() + session() does not reliably attach sub-fields
    const productIds = validProducts.map((item: any) => item.productId._id);
    const dbProductImages = await productModel.find({ _id: { $in: productIds } }).select("images").session(session).lean();
    const imageMap = new Map(dbProductImages.map((p: any) => [p._id.toString(), p.images || []]));

    const orderProducts = validProducts.map((item: any) => {
      const product = item.productId;
      const productPrice = Number(product.price) || 0;
      const quantity = Number(item.quantity) || 0;
      return {
        productId: product._id,
        name: product.productName || "Unnamed Product",
        image: imageMap.get(product._id.toString()) || [],
        quantity: quantity,
        price: productPrice,
        costPrice: productPrice,
        sellingPrice: productPrice,
        totalPrice: quantity * productPrice,
        size: item.size,
        color: item.color,
        weight: item.weight,
      };
    });

    // Create order
    if (!payment_method) {
      await session.abortTransaction();
      session.endSession();
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
      const cartItemsForService = orderProducts.map(p => ({
        productId: p.productId.toString(),
        quantity: p.quantity,
        price: p.price
      }));

      // Validate coupon and calculate discount using service (Bug 5, 8)
      const { discountAmount, coupon } = await validateAndCalculateDiscount({
        code: appliedCoupon,
        cartItems: cartItemsForService,
        userId,
        session
      });

      couponDiscount = discountAmount;

      // Atomically increment the usage limit (Bug 1)
      await CouponModel.updateOne(
        { _id: coupon._id },
        { $inc: { usedCount: 1 } },
        { session }
      );
    }

    // Fetch current financial settings for snapshot
    const websiteInfo = await WebsiteInfo.findOne().session(session);
    const referralSettings = await Referral.findOne().session(session);
    const referralBonusPerProduct = referralSettings?.referralBonusPerProduct || 0;
    const profitPerProduct = websiteInfo?.profitPerProduct || 0;

    // Create order
    const order = new OrderModel({
      userId,
      cart: cart._id,
      orderId: uuidv4(),
      products: orderProducts,
      address: delivery_address,
      payment_method: payment_method,
      payment_status: payment_method === "balance" ? "paid" : "pending",
      payment_details: payment_details || null,
      payment_type: payment_type || "full",
      order_status: payment_method === "balance" ? "processing" : "pending",
      deliveryCharge: calculatedDeliveryCharge,
      appliedCoupon: appliedCoupon || null,
      couponDiscount: couponDiscount || 0,
      referralBonusPerProduct,
      profitPerProduct,
    });

    // Handle balance payment (calculate totalAmt before pre-save hook runs)
    if (payment_method === "balance") {
      const subTotal = orderProducts.reduce((acc: number, p: any) => acc + p.totalPrice, 0);
      const calcTotal = subTotal + calculatedDeliveryCharge - couponDiscount;
      const user = await UserModel.findById(userId).session(session);
      if (!user) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ success: false, message: "User not found" });
      }
      if ((user.balance || 0) < calcTotal) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ success: false, message: "Insufficient balance" });
      }
      user.balance = (user.balance || 0) - calcTotal;
      await user.save({ session });
    }

    await order.save({ session });
    // Clear user cart if using balance (immediate payment)
    if (payment_method === "balance") {
      await clearUserCart(userId, session);
    }
    await UserModel.findByIdAndUpdate(userId, {
      $push: { orderHistory: order._id },
    }, { session });

    await session.commitTransaction();
    session.endSession();

    // Send notification to dashboard when order is placed
    try {
      const orderUser = await UserModel.findById(userId).select("name email").lean();
      const notifTitle = "New Order Placed";
      const notifMessage = `Order #${order.orderId} has been placed by ${orderUser?.name || "Unknown"} (${orderUser?.email || "N/A"}) - Total: ৳${order.totalAmt}`;
      const notif = await Notification.create({
        title: notifTitle,
        message: notifMessage,
        type: "order",
        referenceId: order._id.toString(),
        meta: {
          orderId: order._id.toString(),
          orderNumber: order.orderId,
          userId: userId.toString(),
          totalAmount: order.totalAmt,
          paymentMethod: payment_method,
        },
      });
      // Emit socket event for real-time dashboard updates
      const io = (req as any).app?.get("io");
      if (io) io.emit("notification:new", notif);
    } catch (notifErr) {
      console.error("Failed to send order notification:", notifErr);
    }

    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      data: order,
    });
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    console.error("Order Creation Error:", error);
    res.status(error.message?.includes("কুপন") || error.message?.includes("Coupon") ? 400 : 500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

export const getMyOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized user" });
      return;
    }

    const orders = await OrderModel.find({ userId })
      .populate({
        path: "products.productId",
        populate: [
          { path: "category" },
          { path: "subCategory" }
        ]
      })
      .sort({ createdAt: -1 })
      .lean();

    // Enrich products: if stored image[] is empty, fall back to populated productId.images
    const enrichedOrders = orders.map((order: any) => ({
      ...order,
      products: (order.products || []).map((p: any) => {
        const productImages = p.productId?.images;
        const hasStoredImage = Array.isArray(p.image) ? p.image.length > 0 : !!p.image;
        return {
          ...p,
          image: hasStoredImage ? p.image : (Array.isArray(productImages) && productImages.length > 0 ? productImages : []),
        };
      }),
    }));

    res.json({
      success: true,
      message: "User orders fetched successfully",
      data: enrichedOrders,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

export const getOrderDetails = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const order = await OrderModel.findById(id)
      .populate({
        path: "products.productId",
        populate: [
          { path: "category" },
          { path: "subCategory" }
        ]
      })
      .populate("userId", "name email mobile")
      .lean();

    if (!order) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }

    const orderUserId = typeof order.userId === "object" && (order.userId as any)?._id
      ? (order.userId as any)._id.toString()
      : (order.userId as any).toString();
    if (orderUserId !== req.userId) {
      res.status(403).json({ success: false, message: "Unauthorized: Not your order" });
      return;
    }

    // Enrich products: if stored image[] is empty, fall back to populated productId.images
    const enrichedOrder = {
      ...order,
      products: ((order as any).products || []).map((p: any) => {
        const productImages = p.productId?.images;
        const hasStoredImage = Array.isArray(p.image) ? p.image.length > 0 : !!p.image;
        return {
          ...p,
          image: hasStoredImage ? p.image : (Array.isArray(productImages) && productImages.length > 0 ? productImages : []),
        };
      }),
    };

    res.json({ success: true, data: enrichedOrder });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc Update order status (Admin only)
 * @route PUT /api/orders/:id/status
 * @access Private (Admin)
 */
export const updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };
    const { status } = req.body;

    if (!status) {
      res.status(400).json({ success: false, message: "Status is required" });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "Invalid order ID" });
      return;
    }

    const allowedStatuses = ["pending", "processing", "shipped", "delivered", "cancelled", "completed", "return"];
    if (!allowedStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        message: `Invalid status provided. Allowed statuses are: ${allowedStatuses.join(", ")}`,
      });
      return;
    }

    const order = await OrderModel.findById(id).populate("userId");

    if (!order) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }

    order.order_status = status;

    // Referral/Profit Logic
    const isFinished = status === "delivered" || status === "completed";
    const user: any = order.userId;

    console.log(`[Order Update] ID: ${id}, Status: ${status}, IsFinished: ${isFinished}`);

    if (isFinished) {
      // For delivery-type, only mark fully paid if amount_due was already settled
      if (order.payment_type !== "delivery" || (order.amount_due ?? 0) <= 0) {
        order.payment_status = "paid";
        order.amount_paid = order.totalAmt;
        order.amount_due = 0;
      }

      const orderItemCount = order.products.reduce((acc, p) => acc + (p.quantity || 1), 0);

      // Only distribute referral/profit when order is fully paid
      const isFullyPaid = order.payment_type !== "delivery" || (order.amount_due ?? 0) <= 0;

      if (isFullyPaid) {
        // 1. Referral Bonus Logic for DROPSHIPPING (Referrer)
        if (!order.referralBonusGiven && user && user.referredBy) {
          const referrer = await UserModel.findById(user.referredBy);
          if (referrer && (referrer.roles?.includes("DROPSHIPPING") || referrer.role === "DROPSHIPPING")) {

            let bonusAmount = 0;

            // Priority 1: Snapshotted Fixed per Product Bonus
            if ((order.referralBonusPerProduct ?? 0) > 0) {
              bonusAmount = (order.referralBonusPerProduct ?? 0) * orderItemCount;
            }
            else {
              // Priority 2: Live/Legacy Settings
              const referralSettings = await Referral.findOne();
              const referralBonus = referralSettings?.referralPercentage || 0;

              if (referralBonus > 0) {
                bonusAmount = referralBonus;
              } else {
                if (order.totalAmt >= 500) {
                  bonusAmount = Math.floor(order.totalAmt / 500) * 10;
                } else {
                  const updatedReferrer = await UserModel.findByIdAndUpdate(
                    user.referredBy,
                    { $inc: { deliveredItemsCount: orderItemCount } },
                    { new: true }
                  );
                  if ((updatedReferrer?.deliveredItemsCount || 0) > 10) {
                    bonusAmount = 10;
                  }
                }
              }
            }

            if (bonusAmount > 0) {
              await UserModel.findByIdAndUpdate(user.referredBy, {
                $inc: { balance: bonusAmount }
              });
              order.referralBonusGiven = true;
              order.referralBonusAmount = bonusAmount;
              console.log(`[Referral Bonus] Credited ৳${bonusAmount} to referrer ${user.referredBy} for order ${id}`);
            } else {
              console.log(`[Referral Bonus] Skipped for order ${id}: bonusAmount=0`);
            }
          } else {
            console.log(`[Referral Bonus] Skipped for order ${id}: referrer not found or not DROPSHIPPING`);
          }
        }

        // 2. Profit Logic for DROPSHIPPING (Order Owner)
        if (!order.profitGiven && user && (user.roles?.includes("DROPSHIPPING") || user.role === "DROPSHIPPING")) {
          // Dropshipper profit = sum of (sellingPrice - costPrice) * quantity.
          // No coupon compensation and no website-default fallback: a dropshipper
          // who buys at the same price they paid (no markup) earns 0 profit.
          const totalProfit = order.products.reduce((sum, p) => {
            const cost = Number(p.costPrice ?? p.price) || 0;
            const selling = Number(p.sellingPrice) || cost;
            const itemProfit = selling > cost ? (selling - cost) * (p.quantity || 1) : 0;
            return sum + itemProfit;
          }, 0);

          if (totalProfit > 0) {
            await UserModel.findByIdAndUpdate(user._id, {
              $inc: { balance: totalProfit }
            });
            order.profitGiven = true;
            order.profitAmount = totalProfit;
          }
        }
      }
    }

    // COD Return Deduction: when admin marks a dropshipping order as "return"
    // (customer didn't receive / didn't pay the delivery charge on a COD order),
    // deduct the deliveryCharge from the dropshipper's balance (may go negative).
    // Idempotent: uses `deliveryChargeDeducted` flag so repeat clicks don't double-deduct.
    if (status === "return") {
      const isCod = order.payment_method === "cod" || order.payment_type === "cod";
      const isDropshipper = user && (user.roles?.includes("DROPSHIPPING") || user.role === "DROPSHIPPING");
      const deductionAmount = Number(order.deliveryCharge) || 0;

      if (!isCod) {
        console.warn(`[Order Update] Return-status set on non-COD order ${id}. No deduction applied.`);
      } else if (!isDropshipper) {
        console.warn(`[Order Update] Return-status set on non-dropshipper COD order ${id}. No deduction applied.`);
      } else if (order.deliveryChargeDeducted) {
        console.log(`[Order Update] Return-status: delivery charge already deducted for order ${id}. Skipping.`);
      } else if (deductionAmount > 0) {
        // Atomic balance deduction (may result in negative balance)
        await UserModel.findByIdAndUpdate(user._id, {
          $inc: { balance: -deductionAmount }
        });
        order.deliveryChargeDeducted = true;
        order.deliveryChargeDeductedAt = new Date();
        order.deliveryChargeDeductedAmount = deductionAmount;
        console.log(`[Order Update] Return-status: deducted ৳${deductionAmount} from dropshipper ${user._id} (order ${id}).`);
      }
    }


    await order.save();

    res.json({
      success: true,
      message: "Order status updated successfully",
      data: order,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

// POST /order/manual-payment
export const ManualPayment = async (req: Request, res: Response) => {
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
    const existingTxn = await OrderModel.findOne({ transactionId });
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
    const order = await OrderModel.findOneAndUpdate(
      {
        $or: [{ orderId }, { _id: mongoose.Types.ObjectId.isValid(orderId) ? orderId : undefined }],
        payment_method: "manual",
        payment_status: "pending",
        transactionId: { $exists: false },
      },
      {
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
      },
      { new: true }
    );

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
    } else {
      order.amount_paid = order.totalAmt;
      order.amount_due = 0;
    }

    order.payment_details!.manual!.paidFor = order.payment_type;

    await order.save();

    // ✅ Add order to user's history (idempotent safe)
    await UserModel.findByIdAndUpdate(order.userId, {
      $addToSet: { orderHistory: order._id },
    });

    return res.json({
      success: true,
      message: "Manual payment info submitted, pending admin confirmation",
      order,
    });
  } catch (err: any) {
    console.error("Manual Payment Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};



/**
 * @desc Create a new manual order from user's cart
 * @route POST /api/orders/manual
 * @access Private (User)
 */
export const createManualOrder = async (req: AuthRequest, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { delivery_address, payment_details, payment_type, payment_method, appliedCoupon } = req.body;
    const userId = req.userId;

    // ✅ 1. Basic validation
    if (!userId || !delivery_address) {
      await session.abortTransaction();
      session.endSession();
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
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: `Missing required address fields: ${missingFields.join(", ")}`,
      });
    }

    // ✅ 2b. Detect user role for pricing
    const orderUser = await UserModel.findById(userId).session(session);
    if (!orderUser) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: "User not found" });
    }
    const isDropshipper = orderUser.roles?.includes("DROPSHIPPING") || orderUser.role === "DROPSHIPPING";

    // ✅ 3. Validate products (Priority: req.body.products > database cart)
    let orderProducts: any[] = [];
    let cartId: any = null;

    if (req.body.products && Array.isArray(req.body.products) && req.body.products.length > 0) {
      // Fetch products from DB to prevent client-side tampering (Bug 6)
      const productIds = req.body.products.map((p: any) => new mongoose.Types.ObjectId(p.productId));
      const dbProducts = await productModel.find({ _id: { $in: productIds } }).session(session).lean();
      const dbProductMap = new Map(dbProducts.map((p: any) => [p._id.toString(), p]));

      orderProducts = req.body.products.map((p: any) => {
        const dbProduct: any = dbProductMap.get(p.productId.toString());
        if (!dbProduct) {
          throw new Error(`Product not found: ${p.productId}`);
        }

        if (isDropshipper) {
          // DS user: costPrice = wholesale (dropshippingPrice), sellingPrice = what customer pays
          const costPrice = Number(dbProduct.dropshippingPrice ?? dbProduct.price) || 0;
          const sellingPrice = Number(p.sellingPrice) || costPrice;
          const quantity = Number(p.quantity) || 1;
          return {
            productId: p.productId,
            name: dbProduct.productName || "Product",
            image: (Array.isArray(dbProduct.images) && dbProduct.images.length > 0) ? dbProduct.images : [],
            quantity,
            price: costPrice,
            costPrice: costPrice,
            sellingPrice: sellingPrice,
            totalPrice: quantity * sellingPrice,
            size: p.size ?? null,
            color: p.color ?? null,
            weight: p.weight ?? null,
          };
        } else {
          // Normal user / admin: price = retail price (product.price)
          const retailPrice = Number(dbProduct.price) || 0;
          const quantity = Number(p.quantity) || 1;
          return {
            productId: p.productId,
            name: dbProduct.productName || "Product",
            image: (Array.isArray(dbProduct.images) && dbProduct.images.length > 0) ? dbProduct.images : [],
            quantity,
            price: retailPrice,
            costPrice: retailPrice,
            sellingPrice: retailPrice,
            totalPrice: quantity * retailPrice,
            size: p.size ?? null,
            color: p.color ?? null,
            weight: p.weight ?? null,
          };
        }
      });
    } else {
      const cart = await CartModel.findOne({ userId }).session(session).populate({
        path: "products.productId",
        populate: [
          { path: "category" },
          { path: "subCategory" }
        ]
      });
      if (!cart || cart.products.length === 0) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ success: false, message: "Cart is empty" });
      }
      cartId = cart._id;

      const validProducts = cart.products.filter((item: any) => {
        const product = item.productId;
        return product && typeof product === "object" && "_id" in product;
      });
      if (validProducts.length === 0) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ success: false, message: "No valid products in cart" });
      }

      // Fetch images directly from DB — populate() + session() does not reliably attach sub-fields
      const cartProductIds = validProducts.map((item: any) => item.productId._id);
      const dbCartImages = await productModel.find({ _id: { $in: cartProductIds } }).select("images").session(session).lean();
      const cartImageMap = new Map(dbCartImages.map((p: any) => [p._id.toString(), p.images || []]));

      orderProducts = validProducts.map((item: any) => {
        const product = item.productId;
        const quantity = Number(item.quantity) || 0;

        if (isDropshipper) {
          // DS user: costPrice = wholesale (dropshippingPrice), sellingPrice = same (no margin from cart)
          const price = Number(product.dropshippingPrice ?? product.price) || 0;
          return {
            productId: product._id,
            name: product.productName || "Unnamed Product",
            image: cartImageMap.get(product._id.toString()) || [],
            quantity,
            price,
            costPrice: price,
            sellingPrice: price,
            totalPrice: quantity * price,
            size: item.size ?? null,
            color: item.color ?? null,
            weight: item.weight ?? null,
          };
        } else {
          // Normal user / admin: price = retail price (product.price)
          const price = Number(product.price) || 0;
          return {
            productId: product._id,
            name: product.productName || "Unnamed Product",
            image: cartImageMap.get(product._id.toString()) || [],
            quantity,
            price,
            costPrice: price,
            sellingPrice: price,
            totalPrice: quantity * price,
            size: item.size ?? null,
            color: item.color ?? null,
            weight: item.weight ?? null,
          };
        }
      });
    }

    // Dropshipper pays wholesale cost price upfront
    const wholesaleSubTotal = orderProducts.reduce((acc, p) => acc + (p.quantity * (p.costPrice || p.price)), 0);

    // Handle Coupon applying first so that balance check is accurate
    let couponDiscount = 0;
    if (appliedCoupon) {
      // For dropshipping manual orders, the coupon is applied to the wholesale cost (Bug 9)
      const cartItemsForService = orderProducts.map(p => ({
        productId: p.productId.toString(),
        quantity: p.quantity,
        price: p.costPrice || p.price
      }));

      // Validate using Coupon Service
      const { discountAmount, coupon } = await validateAndCalculateDiscount({
        code: appliedCoupon,
        cartItems: cartItemsForService,
        userId,
        session
      });

      couponDiscount = discountAmount;

      // Atomically increment usage
      await CouponModel.updateOne(
        { _id: coupon._id },
        { $inc: { usedCount: 1 } },
        { session }
      );
    }

    // ✅ 4. Payment validation
    if (payment_method === "manual") {
      if (!payment_details || !payment_details.transactionId) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: "Transaction ID is required for manual payment",
        });
      }

      const existingOrder = await OrderModel.findOne({
        payment_method: "manual",
        "payment_details.manual.transactionId": payment_details.transactionId,
      }).session(session);

      if (existingOrder) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: "এই ট্রানজ্যাকশন আইডি ইতিমধ্যেই ব্যবহার হয়েছে!",
        });
      }
    } else if (payment_method === "balance") {
      // Reuse orderUser fetched earlier (line 624)
      if (!orderUser) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ success: false, message: "User not found" });
      }

      // Calculate total with delivery
      const dhakaDistricts = ["Dhaka", "ঢাকা", "Dhanmondi", "Gulshan", "Mirpur", "Motijheel", "Uttara", "Mohammadpur", "Tejgaon", "Kamrangirchar"];
      let calculatedDeliveryCharge = 130;
      if (delivery_address?.district && dhakaDistricts.some(d => delivery_address.district.includes(d))) {
        calculatedDeliveryCharge = 80;
      }

      let totalToPay = payment_type === "delivery" ? calculatedDeliveryCharge : (wholesaleSubTotal + calculatedDeliveryCharge - couponDiscount);
      if (totalToPay < 0) totalToPay = 0;

      if ((orderUser.balance || 0) < totalToPay) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ success: false, message: "Insufficient balance" });
      }

      // Deduct balance
      orderUser.balance = (orderUser.balance || 0) - totalToPay;
      await orderUser.save({ session });
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
    const websiteInfo = await WebsiteInfo.findOne().session(session);
    const referralSettings = await Referral.findOne().session(session);
    const referralBonusPerProduct = referralSettings?.referralBonusPerProduct || 0;
    const profitPerProduct = websiteInfo?.profitPerProduct || 0;

    // ✅ 5. Create order
    const orderDoc = new OrderModel({
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

    await orderDoc.save({ session });

    // ✅ 6. Update user's order history
    await UserModel.findByIdAndUpdate(userId, {
      $push: { orderHistory: orderDoc._id },
    }, { session });

    // ✅ 7. Clear user's cart
    await clearUserCart(userId, session);

    await session.commitTransaction();
    session.endSession();

    // Send notification to dashboard when manual order is placed
    try {
      const orderUser = await UserModel.findById(userId).select("name email").lean();
      const notifTitle = "New Manual Order Placed";
      const notifMessage = `Order #${orderDoc.orderId} has been placed by ${orderUser?.name || "Unknown"} (${orderUser?.email || "N/A"}) - Total: ৳${orderDoc.totalAmt}`;
      const notif = await Notification.create({
        title: notifTitle,
        message: notifMessage,
        type: "order",
        referenceId: orderDoc._id.toString(),
        meta: {
          orderId: orderDoc._id.toString(),
          orderNumber: orderDoc.orderId,
          userId: userId.toString(),
          totalAmount: orderDoc.totalAmt,
          paymentMethod: payment_method,
          isManualOrder: true,
        },
      });
      // Emit socket event for real-time dashboard updates
      const io = (req as any).app?.get("io");
      if (io) io.emit("notification:new", notif);
    } catch (notifErr) {
      console.error("Failed to send manual order notification:", notifErr);
    }

    // ✅ 8. Respond success
    return res.status(201).json({
      success: true,
      message: "Manual order placed successfully",
      data: orderDoc,
    });

  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    console.error("Manual Order Creation Error:", error);

    return res.status(error.message?.includes("কুপন") || error.message?.includes("Coupon") ? 400 : 500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};



/**
 * @desc Get all orders for admin (paginated)
 * @route GET /api/admin/orders/all?page=1&limit=20
 * @access Private (Admin)
 */
export const getAllOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const [orders, totalCount] = await Promise.all([
      OrderModel.find()
        .populate({
          path: "products.productId",
          populate: [
            { path: "category" },
            { path: "subCategory" }
          ]
        })
        .populate({
          path: "userId",
          select: "name email role mobile referredBy shopName shopAddress",
          populate: {
            path: "referredBy",
            select: "name referralCode"
          }
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      OrderModel.countDocuments(),
    ]);

    res.json({
      success: true,
      message: "All orders fetched successfully",
      data: orders,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        limit,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/**
 * @desc Get orders by status for admin (paginated)
 * @route GET /api/admin/orders/status/:status?page=1&limit=20
 * @access Private (Admin)
 */
export const getOrdersByStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.params;

    if (!status) {
      res.status(400).json({ success: false, message: "Order status is required" });
      return;
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const query = { order_status: status };

    const [orders, totalCount] = await Promise.all([
      OrderModel.find(query)
        .populate({
          path: "products.productId",
          populate: [
            { path: "category" },
            { path: "subCategory" }
          ]
        })
        .populate({
          path: "userId",
          select: "name email role mobile referredBy shopName shopAddress",
          populate: {
            path: "referredBy",
            select: "name referralCode"
          }
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      OrderModel.countDocuments(query),
    ]);

    res.json({
      success: true,
      message: `Orders with status "${status}" fetched successfully`,
      data: orders,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        limit,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/**
 * @desc Confirm manual payment for an order (Admin only)
 * @route PUT /api/orders/:id/confirm-payment
 * @access Private (Admin)
 */
export const confirmManualPayment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // this is orderId (UUID)

    const order = await OrderModel.findOne({ orderId: id });
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
    const updatedOrder = await OrderModel.findById(order._id); // Re-fetch the updated order document

    if (!updatedOrder) {
      return res.status(404).json({ success: false, message: "Order not found after update" });
    }

    if (updatedOrder.payment_type === "delivery") {
      updatedOrder.amount_paid = updatedOrder.deliveryCharge;
      updatedOrder.amount_due = updatedOrder.totalAmt - updatedOrder.deliveryCharge;
    } else { // Handles 'full' payment type
      updatedOrder.amount_paid = updatedOrder.totalAmt;
      updatedOrder.amount_due = 0;
    }

    await updatedOrder.save(); // Save the order with updated paid/due amounts

    // ✅ CLEAR CART
    await clearUserCart(order.userId);

    res.json({
      success: true,
      message: "Manual payment confirmed successfully",
      data: updatedOrder.populate("userId", "name email"),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc Pay due amount for an existing order (User only)
 * @route POST /api/orders/:id/pay-due
 * @access Private (User)
 */
export const payDueAmount = async (req: AuthRequest, res: Response) => {
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

    const order = await OrderModel.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Verify ownership
    if (order.userId.toString() !== userId) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    // Determine the actual amount the user needs to pay (Bugs 9, 21)
    let amountToPay = order.amount_due ?? 0;

    // Check if dropshipping order (sellingPrice > costPrice / price)
    const isDropshipping = order.products.some(p => p.sellingPrice && p.sellingPrice > 0 && p.sellingPrice !== (p.costPrice || p.price));
    if (isDropshipping && paymentMethod === "balance") {
      const wholesaleSubTotal = order.products.reduce((acc, p) => acc + (p.quantity * (p.costPrice || p.price || 0)), 0);
      const totalWholesaleAmt = wholesaleSubTotal + (order.deliveryCharge || 0) - (order.couponDiscount || 0);

      // Amount paid so far by the dropshipper (e.g. delivery charge)
      amountToPay = totalWholesaleAmt - (order.amount_paid || 0);
      if (amountToPay < 0) amountToPay = 0;
    }

    if (amountToPay <= 0) {
      return res.status(400).json({ success: false, message: "No due amount remaining" });
    }

    if (paymentMethod === "balance") {
      const user = await UserModel.findById(userId);
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
      // If paying off full remaining on a delivery-type order, switch to "full"
      // so the pre-save hook correctly sets amount_paid = totalAmt, amount_due = 0
      if (order.payment_type === "delivery" && amountToPay >= (order.amount_due ?? 0)) {
        order.payment_type = "full";
      }
      order.payment_status = "paid";
      order.order_status = "processing";
      await order.save();

      return res.json({
        success: true,
        message: `Payment of ৳${amountToPay} successful via balance.`,
        order,
      });
    } else if (paymentMethod === "manual") {
      if (!manualDetails || !manualDetails.transactionId || !manualDetails.provider) {
        return res.status(400).json({
          success: false,
          message: "Transaction ID and provider are required for manual payment",
        });
      }

      // Check for duplicate transactionId
      const existingTxn = await OrderModel.findOne({
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
  } catch (error: any) {
    console.error("Pay Due Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc Delete an order by ID (Admin only)
 * @route DELETE /api/orders/:id
 * @access Private (Admin)
 */
export const deleteOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "Invalid order ID" });
      return;
    }

    const order = await OrderModel.findById(id);

    if (!order) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }

    // Find the user and pull the order from their orderHistory
    await UserModel.findByIdAndUpdate(order.userId, {
      $pull: { orderHistory: order._id },
    });

    // Delete the order
    await OrderModel.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Order deleted successfully",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/**
 * @desc Update dropshipping order status with additional details (Admin only)
 * @route PUT /api/orders/dropshipping/:id/status
 * @access Private (Admin)
 */
export const updateDropshippingOrderStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };
    const { status, note, trackingNumber, estimatedDelivery, shippedBy } = req.body;

    if (!status) {
      res.status(400).json({ success: false, message: "Status is required" });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "Invalid order ID" });
      return;
    }

    const allowedStatuses = ["pending", "processing", "shipped", "delivered", "cancelled", "completed", "return"];
    if (!allowedStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        message: `Invalid status provided. Allowed statuses are: ${allowedStatuses.join(", ")}`,
      });
      return;
    }

    const order = await OrderModel.findById(id).populate("userId");

    if (!order) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }

    const previousStatus = order.order_status;
    order.order_status = status;

    // Store dropshipping-specific metadata
    const dropshippingMeta: any = {};
    if (note) dropshippingMeta.statusNote = note;
    if (trackingNumber) dropshippingMeta.trackingNumber = trackingNumber;
    if (estimatedDelivery) dropshippingMeta.estimatedDelivery = estimatedDelivery;
    if (shippedBy) dropshippingMeta.shippedBy = shippedBy;
    dropshippingMeta.statusUpdatedAt = new Date();
    dropshippingMeta.updatedBy = "ADMIN";

    // Merge with existing meta or create new
    order.set("dropshippingStatusHistory", [
      ...(order.get("dropshippingStatusHistory") || []),
      {
        type: "status",
        status,
        previousStatus,
        ...dropshippingMeta,
      },
    ]);

    // Referral/Profit Logic (same as updateOrderStatus)
    const isFinished = status === "delivered" || status === "completed";
    const user: any = order.userId;

    if (isFinished) {
      if (order.payment_type !== "delivery" || (order.amount_due ?? 0) <= 0) {
        order.payment_status = "paid";
        order.amount_paid = order.totalAmt;
        order.amount_due = 0;
      }

      const orderItemCount = order.products.reduce((acc, p) => acc + (p.quantity || 1), 0);
      const isFullyPaid = order.payment_type !== "delivery" || (order.amount_due ?? 0) <= 0;

      if (isFullyPaid) {
        // Referral Bonus Logic for DROPSHIPPING (Referrer)
        if (!order.referralBonusGiven && user && user.referredBy) {
          const referrer = await UserModel.findById(user.referredBy);
          if (referrer && (referrer.roles?.includes("DROPSHIPPING") || referrer.role === "DROPSHIPPING")) {
            let bonusAmount = 0;

            if ((order.referralBonusPerProduct ?? 0) > 0) {
              bonusAmount = (order.referralBonusPerProduct ?? 0) * orderItemCount;
            } else {
              const referralSettings = await Referral.findOne();
              const referralBonus = referralSettings?.referralPercentage || 0;

              if (referralBonus > 0) {
                bonusAmount = referralBonus;
              } else {
                if (order.totalAmt >= 500) {
                  bonusAmount = Math.floor(order.totalAmt / 500) * 10;
                } else {
                  const updatedReferrer = await UserModel.findByIdAndUpdate(
                    user.referredBy,
                    { $inc: { deliveredItemsCount: orderItemCount } },
                    { new: true }
                  );
                  if ((updatedReferrer?.deliveredItemsCount || 0) > 10) {
                    bonusAmount = 10;
                  }
                }
              }
            }

            if (bonusAmount > 0) {
              await UserModel.findByIdAndUpdate(user.referredBy, {
                $inc: { balance: bonusAmount }
              });
              order.referralBonusGiven = true;
              order.referralBonusAmount = bonusAmount;
            }
          }
        }

        // Profit Logic for DROPSHIPPING (Order Owner)
        if (!order.profitGiven && user && (user.roles?.includes("DROPSHIPPING") || user.role === "DROPSHIPPING")) {
          const totalProfit = order.products.reduce((sum, p) => {
            const cost = Number(p.costPrice ?? p.price) || 0;
            const selling = Number(p.sellingPrice) || cost;
            const itemProfit = selling > cost ? (selling - cost) * (p.quantity || 1) : 0;
            return sum + itemProfit;
          }, 0);

          if (totalProfit > 0) {
            await UserModel.findByIdAndUpdate(user._id, {
              $inc: { balance: totalProfit }
            });
            order.profitGiven = true;
            order.profitAmount = totalProfit;
          }
        }
      }
    }

    // COD Return Deduction
    if (status === "return") {
      const isCod = order.payment_method === "cod" || order.payment_type === "cod";
      const isDropshipper = user && (user.roles?.includes("DROPSHIPPING") || user.role === "DROPSHIPPING");
      const deductionAmount = Number(order.deliveryCharge) || 0;

      if (isCod && isDropshipper && !order.deliveryChargeDeducted && deductionAmount > 0) {
        await UserModel.findByIdAndUpdate(user._id, {
          $inc: { balance: -deductionAmount }
        });
        order.deliveryChargeDeducted = true;
        order.deliveryChargeDeductedAt = new Date();
        order.deliveryChargeDeductedAmount = deductionAmount;
      }
    }

    await order.save();

    // Send notification to dashboard about status change
    try {
      const orderUser = await UserModel.findById(order.userId).select("name email").lean();
      const notifTitle = `Order Status Updated`;
      const notifMessage = `Order #${order.orderId} status changed from "${previousStatus}" to "${status}" by Admin${note ? ` - Note: ${note}` : ""}`;
      const notif = await Notification.create({
        title: notifTitle,
        message: notifMessage,
        type: "order_status",
        referenceId: order._id.toString(),
        meta: {
          orderId: order._id.toString(),
          orderNumber: order.orderId,
          previousStatus,
          newStatus: status,
          note: note || null,
          trackingNumber: trackingNumber || null,
          estimatedDelivery: estimatedDelivery || null,
          shippedBy: shippedBy || null,
        },
      });
      const io = (req as any).app?.get("io");
      if (io) io.emit("notification:new", notif);
    } catch (notifErr) {
      console.error("Failed to send status update notification:", notifErr);
    }

    res.json({
      success: true,
      message: "Dropshipping order status updated successfully",
      data: order,
    });
  } catch (error: any) {
    console.error("Update Dropshipping Order Status Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/**
 * @desc Get dropshipping order details with status history (Admin only)
 * @route GET /api/orders/dropshipping/:id
 * @access Private (Admin)
 */
export const getDropshippingOrderDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "Invalid order ID" });
      return;
    }

    const order = await OrderModel.findById(id)
      .populate({
        path: "products.productId",
        populate: [
          { path: "category" },
          { path: "subCategory" }
        ]
      })
      .populate("userId", "name email mobile role roles shopName shopAddress")
      .lean();

    if (!order) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }

    // Enrich products: if stored image[] is empty, fall back to populated productId.images
    const enrichedOrder = {
      ...order,
      products: ((order as any).products || []).map((p: any) => {
        const productImages = p.productId?.images;
        const hasStoredImage = Array.isArray(p.image) ? p.image.length > 0 : !!p.image;
        return {
          ...p,
          image: hasStoredImage ? p.image : (Array.isArray(productImages) && productImages.length > 0 ? productImages : []),
        };
      }),
    };

    res.json({
      success: true,
      data: enrichedOrder,
    });
  } catch (error: any) {
    console.error("Get Dropshipping Order Details Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/**
 * @desc Send admin message to dropshipper on a specific order
 * @route POST /api/orders/dropshipping/:id/message
 * @access Private (Admin)
 */
export const addOrderMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };
    const { message } = req.body;

    if (!message || !message.trim()) {
      res.status(400).json({ success: false, message: "Message is required" });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "Invalid order ID" });
      return;
    }

    const order = await OrderModel.findById(id).populate("userId", "name email");

    if (!order) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }

    const historyEntry = {
      type: "message",
      status: order.order_status,
      message: message.trim(),
      statusNote: null,
      trackingNumber: null,
      estimatedDelivery: null,
      shippedBy: null,
      statusUpdatedAt: new Date(),
      updatedBy: "ADMIN",
    };

    order.set("dropshippingStatusHistory", [
      ...(order.get("dropshippingStatusHistory") || []),
      historyEntry,
    ]);

    await order.save();

    // Send targeted notification to dropshipper
    try {
      const io = (req as any).app?.get("io");
      const orderUser = order.userId as any;

      // Notify via Socket.IO (targeted room)
      if (io && orderUser?._id) {
        io.to(`user:${orderUser._id.toString()}`).emit("order:message", {
          orderId: order._id,
          orderIdNumber: order.orderId,
          message: message.trim(),
          status: order.order_status,
          timestamp: new Date(),
        });
      }

      // Also broadcast to admin dashboard
      const notif = await Notification.create({
        title: `Admin Message - Order #${order.orderId}`,
        message: message.trim(),
        type: "order_status",
        referenceId: order._id.toString(),
        meta: {
          orderId: order._id.toString(),
          orderNumber: order.orderId,
          type: "admin_message",
          newStatus: order.order_status,
        },
      });
      if (io) io.emit("notification:new", notif);
    } catch (notifErr) {
      console.error("Failed to send order message notification:", notifErr);
    }

    res.json({
      success: true,
      message: "Message sent successfully",
      data: order,
    });
  } catch (error: any) {
    console.error("Add Order Message Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/**
 * @desc Update order key points (Admin only)
 * @route PUT /api/orders/dropshipping/:id/keypoints
 * @access Private (Admin)
 */
export const updateOrderKeyPoints = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };
    const { keyPoints } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "Invalid order ID" });
      return;
    }

    const order = await OrderModel.findById(id);

    if (!order) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }

    order.set("keyPoints", Array.isArray(keyPoints) ? keyPoints : []);
    await order.save();

    res.json({
      success: true,
      message: "Order key points updated successfully",
      data: order,
    });
  } catch (error: any) {
    console.error("Update Order Key Points Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

