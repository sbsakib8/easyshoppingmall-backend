import { startCartCleanupJob } from "./cleanupCarts";
import { startPaymentVerificationJob } from "./verifyPendingPayments";
import { startStaleOrderCancellationJob } from "./cancelStaleOrders";

export const startCronJobs = () => {
  console.log("[Cron] Initializing scheduled jobs...");
  startCartCleanupJob();
  startPaymentVerificationJob();
  startStaleOrderCancellationJob();
  console.log("[Cron] All jobs registered successfully");
};
