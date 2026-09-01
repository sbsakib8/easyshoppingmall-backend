import cron from "node-cron";
import SSLCommerzPayment from "sslcommerz-lts";
import processdata from "../config";
import OrderModel from "../models/order/order.model";
import { clearUserCart } from "../utils/cart.utils";

const SSL_GRACE_MINUTES = 30;

/**
 * Cron: Every 15 minutes
 * Re-verifies stuck SSLCommerz payments by calling sslcz.validate().
 * - VALID/VALIDATED → mark paid, clear cart
 * - Otherwise → mark failed, cancel order
 */
const verifyPendingPayments = async () => {
  try {
    const cutoff = new Date();
    cutoff.setMinutes(cutoff.getMinutes() - SSL_GRACE_MINUTES);

    const stuckOrders = await OrderModel.find({
      payment_method: "sslcommerz",
      payment_status: "pending",
      tran_id: { $exists: true, $ne: null },
      createdAt: { $lt: cutoff },
    }).limit(20);

    if (stuckOrders.length === 0) return;

    const sslcz = new SSLCommerzPayment(
      processdata.sslcommerzstoreid,
      processdata.sslcommerzstorepassword,
      false
    );

    for (const order of stuckOrders) {
      try {
        const validation = await (sslcz.validate as any)({ tran_id: order.tran_id });

        if (validation?.status === "VALID" || validation?.status === "VALIDATED") {
          order.payment_status = "paid";
          order.order_status = "processing";
          order.payment_details = { ssl: { tran_id: order.tran_id, val_id: validation.val_id } };

          if (order.payment_type === "delivery") {
            order.amount_paid = order.deliveryCharge;
            order.amount_due = order.totalAmt - order.deliveryCharge;
          } else {
            order.amount_paid = order.totalAmt;
            order.amount_due = 0;
          }

          await order.save();
          await clearUserCart(order.userId);

          console.log(`[Cron:VerifyPayment] Payment confirmed for order ${order.orderId} (tran_id: ${order.tran_id})`);
        } else {
          order.payment_status = "failed";
          order.order_status = "cancelled";
          await order.save();

          console.log(`[Cron:VerifyPayment] Payment failed for order ${order.orderId} (tran_id: ${order.tran_id})`);
        }
      } catch (err: any) {
        console.error(`[Cron:VerifyPayment] Error validating order ${order.orderId}:`, err.message);
      }
    }
  } catch (error) {
    console.error("[Cron:VerifyPayment] Error:", error);
  }
};

export const startPaymentVerificationJob = () => {
  cron.schedule("*/15 * * * *", verifyPendingPayments);
  console.log("[Cron] Registered: SSLCommerz payment verification (every 15 min)");
};
