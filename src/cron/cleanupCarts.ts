import cron from "node-cron";
import { CartModel } from "../models/cart/cart.model";
import OrderModel from "../models/order/order.model";

const CART_RETENTION_DAYS = 30;

/**
 * Cron: Daily at 3:00 AM
 * Deletes carts older than 30 days for users who have no recent orders.
 */
const cleanupAbandonedCarts = async () => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - CART_RETENTION_DAYS);

    // Find users who placed an order in the last 30 days
    const recentOrderUsers = await OrderModel.distinct("userId", {
      createdAt: { $gte: cutoffDate },
    });

    const result = await CartModel.deleteMany({
      updatedAt: { $lt: cutoffDate },
      userId: { $nin: recentOrderUsers },
    });

    if (result.deletedCount > 0) {
      console.log(`[Cron:CartCleanup] Deleted ${result.deletedCount} abandoned carts`);
    }
  } catch (error) {
    console.error("[Cron:CartCleanup] Error:", error);
  }
};

export const startCartCleanupJob = () => {
  cron.schedule("0 3 * * *", cleanupAbandonedCarts);
  console.log("[Cron] Registered: Cart cleanup (daily at 3:00 AM)");
};
