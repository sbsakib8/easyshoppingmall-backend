import cron from "node-cron";
import OrderModel from "../models/order/order.model";
import CouponModel from "../models/coupon/coupon.model";
import Notification from "../models/notification/notification.model";

const STALE_ORDER_HOURS = 48;

/**
 * Cron: Every hour
 * Auto-cancels orders stuck in "pending" for more than 48 hours.
 * Restores coupon usage count if a coupon was applied.
 */
const cancelStaleOrders = async () => {
  try {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - STALE_ORDER_HOURS);

    const staleOrders = await OrderModel.find({
      order_status: "pending",
      payment_status: "pending",
      createdAt: { $lt: cutoff },
    }).limit(50);

    if (staleOrders.length === 0) return;

    let cancelledCount = 0;
    let couponRestoredCount = 0;

    for (const order of staleOrders) {
      // Restore coupon usage if applicable
      if (order.appliedCoupon) {
        try {
          await CouponModel.findOneAndUpdate(
            { code: order.appliedCoupon },
            { $inc: { usedCount: -1 } }
          );
          couponRestoredCount++;
        } catch (err: any) {
          console.error(`[Cron:CancelOrders] Error restoring coupon for order ${order.orderId}:`, err.message);
        }
      }

      order.order_status = "cancelled";
      order.payment_status = "failed";
      await order.save();

      cancelledCount++;
    }

    if (cancelledCount > 0) {
      // Send dashboard notification
      try {
        await Notification.create({
          title: "Stale Orders Auto-Cancelled",
          message: `${cancelledCount} order(s) pending for >${STALE_ORDER_HOURS}h were auto-cancelled. ${couponRestoredCount} coupon(s) restored.`,
          type: "system",
        });
      } catch {
        // Notification failure is non-critical
      }

      console.log(`[Cron:CancelOrders] Cancelled ${cancelledCount} stale orders, restored ${couponRestoredCount} coupons`);
    }
  } catch (error) {
    console.error("[Cron:CancelOrders] Error:", error);
  }
};

export const startStaleOrderCancellationJob = () => {
  cron.schedule("0 * * * *", cancelStaleOrders);
  console.log("[Cron] Registered: Stale order cancellation (every hour)");
};
