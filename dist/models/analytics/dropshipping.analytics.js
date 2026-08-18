"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyDropshippingAnalytics = exports.getDropshippingAnalytics = void 0;
const mongoose_1 = require("mongoose");
const order_model_1 = __importDefault(require("../order/order.model"));
const user_model_1 = __importDefault(require("../user/user.model"));
const videoAccess_model_1 = __importDefault(require("../videoAccess/videoAccess.model"));
/**
 * @desc    Get comprehensive dropshipping analytics for admin dashboard
 * @route   GET /api/analytics/dropshipping/summary
 * @access  Private (Admin)
 */
const getDropshippingAnalytics = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        // Date filter
        let dateFilter = {};
        if (startDate && endDate) {
            dateFilter.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
            };
        }
        // 1. Get all DROPSHIPPING users
        const dsUsers = await user_model_1.default.find({
            $or: [{ role: "DROPSHIPPING" }, { roles: "DROPSHIPPING" }],
        }).select("name email shopName balance referralCount referralCode referredBy createdAt");
        const dsUserIds = dsUsers.map((u) => u._id);
        // 2. Order match filter (DS users + optional date range)
        const orderMatch = { userId: { $in: dsUserIds } };
        if (dateFilter.createdAt) {
            orderMatch.createdAt = dateFilter.createdAt;
        }
        // 3. Aggregate order stats per dropshipper
        const orderStats = await order_model_1.default.aggregate([
            { $match: orderMatch },
            {
                $group: {
                    _id: "$userId",
                    totalOrders: { $sum: 1 },
                    completedOrders: {
                        $sum: {
                            $cond: [
                                { $in: ["$order_status", ["delivered", "completed"]] },
                                1,
                                0,
                            ],
                        },
                    },
                    cancelledOrders: {
                        $sum: { $cond: [{ $eq: ["$order_status", "cancelled"] }, 1, 0] },
                    },
                    pendingOrders: {
                        $sum: { $cond: [{ $eq: ["$order_status", "pending"] }, 1, 0] },
                    },
                    processingOrders: {
                        $sum: { $cond: [{ $eq: ["$order_status", "processing"] }, 1, 0] },
                    },
                    shippedOrders: {
                        $sum: { $cond: [{ $eq: ["$order_status", "shipped"] }, 1, 0] },
                    },
                    revenue: {
                        $sum: {
                            $cond: [
                                { $in: ["$order_status", ["delivered", "completed"]] },
                                "$totalAmt",
                                0,
                            ],
                        },
                    },
                    cancelledValue: {
                        $sum: {
                            $cond: [{ $eq: ["$order_status", "cancelled"] }, "$totalAmt", 0],
                        },
                    },
                    profitPaid: {
                        $sum: { $cond: ["$profitGiven", "$profitAmount", 0] },
                    },
                    referralPaid: {
                        $sum: {
                            $cond: ["$referralBonusGiven", "$referralBonusAmount", 0],
                        },
                    },
                },
            },
        ]);
        // 4. Order pipeline (global across all DS)
        const pipelineRaw = await order_model_1.default.aggregate([
            { $match: orderMatch },
            { $group: { _id: "$order_status", count: { $sum: 1 } } },
        ]);
        const orderPipeline = {
            pending: 0,
            processing: 0,
            shipped: 0,
            delivered: 0,
            completed: 0,
            cancelled: 0,
        };
        pipelineRaw.forEach((p) => {
            if (orderPipeline.hasOwnProperty(p._id)) {
                orderPipeline[p._id] = p.count;
            }
        });
        // 5. Get referred users for each dropshipper
        const referredUsers = await user_model_1.default.find({
            referredBy: { $in: dsUserIds },
        }).select("name referredBy createdAt");
        // Get order counts for referred users
        const referredUserIds = referredUsers.map((u) => u._id);
        const referredOrderStats = await order_model_1.default.aggregate([
            {
                $match: {
                    userId: { $in: referredUserIds },
                    ...(dateFilter.createdAt ? { createdAt: dateFilter.createdAt } : {}),
                },
            },
            {
                $group: {
                    _id: "$userId",
                    orderCount: { $sum: 1 },
                    lastOrderDate: { $max: "$createdAt" },
                    totalBonusTriggered: {
                        $sum: {
                            $cond: ["$referralBonusGiven", "$referralBonusAmount", 0],
                        },
                    },
                },
            },
        ]);
        const referredOrderMap = new Map();
        referredOrderStats.forEach((r) => {
            referredOrderMap.set(r._id.toString(), r);
        });
        // 6. Build per-dropshipper data
        const orderStatsMap = new Map();
        orderStats.forEach((s) => {
            orderStatsMap.set(s._id.toString(), s);
        });
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const dropshippers = dsUsers.map((user) => {
            const stats = orderStatsMap.get(user._id.toString()) || {
                totalOrders: 0,
                completedOrders: 0,
                cancelledOrders: 0,
                pendingOrders: 0,
                revenue: 0,
                cancelledValue: 0,
                profitPaid: 0,
                referralPaid: 0,
            };
            // Find referred users for this dropshipper
            const myReferrals = referredUsers
                .filter((r) => r.referredBy?.toString() === user._id.toString())
                .map((r) => {
                const rStats = referredOrderMap.get(r._id.toString());
                return {
                    name: r.name,
                    userId: r._id,
                    orderCount: rStats?.orderCount || 0,
                    lastOrderDate: rStats?.lastOrderDate || null,
                    bonusEarned: rStats?.totalBonusTriggered || 0,
                    isActive: rStats?.lastOrderDate
                        ? new Date(rStats.lastOrderDate) > thirtyDaysAgo
                        : false,
                };
            });
            return {
                _id: user._id,
                name: user.name,
                email: user.email,
                shopName: user.shopName || "N/A",
                balance: user.balance || 0,
                referralCount: user.referralCount || 0,
                joinedAt: user.createdAt,
                totalOrders: stats.totalOrders,
                completedOrders: stats.completedOrders,
                cancelledOrders: stats.cancelledOrders,
                pendingOrders: stats.pendingOrders,
                revenue: stats.revenue,
                cancelledValue: stats.cancelledValue,
                profitPaid: stats.profitPaid,
                referralPaid: stats.referralPaid,
                referredUsers: myReferrals,
            };
        });
        // 7. Summary KPIs
        const totalRevenue = dropshippers.reduce((s, d) => s + d.revenue, 0);
        const totalProfitPaid = dropshippers.reduce((s, d) => s + d.profitPaid, 0);
        const totalReferralPaid = dropshippers.reduce((s, d) => s + d.referralPaid, 0);
        const totalCancelledValue = dropshippers.reduce((s, d) => s + d.cancelledValue, 0);
        const platformNetIncome = totalRevenue - totalProfitPaid - totalReferralPaid;
        const pendingOrders = dropshippers.reduce((s, d) => s + d.pendingOrders, 0);
        const activeDropshippers = dropshippers.filter((d) => d.totalOrders > 0).length;
        const totalCancelledOrders = dropshippers.reduce((s, d) => s + d.cancelledOrders, 0);
        // 8. Recent activity (last 20 payouts)
        const recentPayouts = await order_model_1.default.find({
            userId: { $in: dsUserIds },
            $or: [{ profitGiven: true }, { referralBonusGiven: true }],
        })
            .sort({ updatedAt: -1 })
            .limit(20)
            .populate("userId", "name shopName")
            .select("orderId profitGiven profitAmount referralBonusGiven referralBonusAmount order_status updatedAt userId");
        const recentActivity = recentPayouts.map((order) => {
            const events = [];
            if (order.profitGiven) {
                events.push({
                    type: "profit",
                    amount: order.profitAmount,
                    dropshipper: order.userId?.name || "Unknown",
                    shopName: order.userId?.shopName || "",
                    orderId: order.orderId,
                    date: order.updatedAt,
                });
            }
            if (order.referralBonusGiven) {
                events.push({
                    type: "referral",
                    amount: order.referralBonusAmount,
                    dropshipper: order.userId?.name || "Unknown",
                    shopName: order.userId?.shopName || "",
                    orderId: order.orderId,
                    date: order.updatedAt,
                });
            }
            return events;
        }).flat();
        res.status(200).json({
            success: true,
            data: {
                summary: {
                    totalRevenue,
                    totalProfitPaid,
                    totalReferralPaid,
                    platformNetIncome,
                    pendingOrders,
                    activeDropshippers,
                    totalDropshippers: dsUsers.length,
                    cancelledOrders: totalCancelledOrders,
                    cancelledValue: totalCancelledValue,
                },
                orderPipeline,
                dropshippers,
                recentActivity,
            },
        });
    }
    catch (error) {
        console.error("Dropshipping Analytics Error:", error);
        res
            .status(500)
            .json({ success: false, message: error.message || "Internal Server Error" });
    }
};
exports.getDropshippingAnalytics = getDropshippingAnalytics;
/**
 * @desc    Get personal dropshipping analytics for the logged-in dropshipper
 * @route   GET /api/analytics/dropshipping/my-summary
 * @access  Private (Dropshipper)
 */
const getMyDropshippingAnalytics = async (req, res) => {
    try {
        const userId = req.user?._id;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        const { startDate, endDate } = req.query;
        // Date filter
        let dateFilter = {};
        if (startDate && endDate) {
            dateFilter.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
            };
        }
        // 1. Own Order Stats
        const orderMatch = { userId: new mongoose_1.Types.ObjectId(userId) };
        if (dateFilter.createdAt) {
            orderMatch.createdAt = dateFilter.createdAt;
        }
        const orderStats = await order_model_1.default.aggregate([
            { $match: orderMatch },
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    completedOrders: {
                        $sum: {
                            $cond: [{ $in: ["$order_status", ["delivered", "completed"]] }, 1, 0],
                        },
                    },
                    cancelledOrders: {
                        $sum: { $cond: [{ $eq: ["$order_status", "cancelled"] }, 1, 0] },
                    },
                    pendingOrders: {
                        $sum: { $cond: [{ $eq: ["$order_status", "pending"] }, 1, 0] },
                    },
                    revenue: {
                        $sum: {
                            $cond: [{ $in: ["$order_status", ["delivered", "completed"]] }, "$totalAmt", 0],
                        },
                    },
                    profitPaid: {
                        $sum: { $cond: ["$profitGiven", "$profitAmount", 0] },
                    },
                    pendingProfit: {
                        $sum: {
                            $cond: [
                                { $and: [
                                        { $ne: ["$profitGiven", true] },
                                        { $ne: ["$order_status", "cancelled"] }
                                    ] },
                                "$profitAmount",
                                0
                            ]
                        }
                    },
                    lostProfit: {
                        $sum: {
                            $cond: [
                                { $eq: ["$order_status", "cancelled"] },
                                "$profitAmount",
                                0
                            ]
                        }
                    }
                },
            },
        ]);
        const myStats = orderStats[0] || {
            totalOrders: 0,
            completedOrders: 0,
            cancelledOrders: 0,
            pendingOrders: 0,
            revenue: 0,
            profitPaid: 0,
            pendingProfit: 0,
            lostProfit: 0
        };
        // 2. Own Order Pipeline
        const pipelineRaw = await order_model_1.default.aggregate([
            { $match: orderMatch },
            { $group: { _id: "$order_status", count: { $sum: 1 } } },
        ]);
        const orderPipeline = {
            pending: 0,
            processing: 0,
            shipped: 0,
            delivered: 0,
            completed: 0,
            cancelled: 0,
        };
        pipelineRaw.forEach((p) => {
            if (orderPipeline.hasOwnProperty(p._id)) {
                orderPipeline[p._id] = p.count;
            }
        });
        // 3. Referral Stats
        const referrals = await user_model_1.default.find({ referredBy: userId }).select("name createdAt");
        const referralIds = referrals.map(r => r._id);
        const referralOrderMatch = { userId: { $in: referralIds } };
        if (dateFilter.createdAt) {
            referralOrderMatch.createdAt = dateFilter.createdAt;
        }
        const referralStats = await order_model_1.default.aggregate([
            { $match: referralOrderMatch },
            {
                $group: {
                    _id: "$userId",
                    orderCount: { $sum: 1 },
                    lastOrderDate: { $max: "$createdAt" },
                    bonusEarned: {
                        $sum: { $cond: ["$referralBonusGiven", "$referralBonusAmount", 0] },
                    },
                    pendingBonus: {
                        $sum: {
                            $cond: [
                                { $and: [
                                        { $ne: ["$referralBonusGiven", true] },
                                        { $ne: ["$order_status", "cancelled"] }
                                    ] },
                                "$referralBonusAmount",
                                0
                            ]
                        }
                    }
                },
            },
        ]);
        const referralStatsMap = new Map();
        referralStats.forEach(s => referralStatsMap.set(s._id.toString(), s));
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const referralNetwork = referrals.map(r => {
            const stats = referralStatsMap.get(r._id.toString());
            return {
                name: r.name,
                orderCount: stats?.orderCount || 0,
                lastOrderDate: stats?.lastOrderDate || null,
                bonusEarned: stats?.bonusEarned || 0,
                pendingBonus: stats?.pendingBonus || 0,
                isActive: stats?.lastOrderDate ? new Date(stats.lastOrderDate) > thirtyDaysAgo : false
            };
        });
        const totalReferralBonus = referralNetwork.reduce((s, r) => s + r.bonusEarned, 0);
        const totalPendingReferralBonus = referralNetwork.reduce((s, r) => s + r.pendingBonus, 0);
        // 4. Video Referral Analytics (Referred users buy courses)
        const videoAccessReferrals = await videoAccess_model_1.default.find({
            $or: [
                { userId: { $in: referralIds } },
                { referredBy: userId }
            ],
            courseId: { $ne: null }
        })
            .populate("userId", "name email")
            .populate("courseId", "title referralBonus");
        const videoReferrals = videoAccessReferrals.map((v) => ({
            _id: v._id,
            buyerName: v.userId?.name || "N/A",
            buyerEmail: v.userId?.email || "N/A",
            courseTitle: v.courseId?.title || "N/A",
            bonusAmount: v.courseId?.referralBonus || 0,
            amount: v.amount,
            status: v.status,
            createdAt: v.createdAt
        }));
        videoReferrals.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        // Approved video referral bonuses
        const approvedVideoReferralBonus = videoReferrals
            .filter((v) => v.status === "approved")
            .reduce((sum, v) => sum + v.bonusAmount, 0);
        // Pending video referral bonuses
        const pendingVideoReferralBonus = videoReferrals
            .filter((v) => v.status === "pending")
            .reduce((sum, v) => sum + v.bonusAmount, 0);
        // 5. Recent Transactions
        const recentOrders = await order_model_1.default.find(orderMatch)
            .sort({ updatedAt: -1 })
            .limit(100)
            .select("orderId profitGiven profitAmount order_status updatedAt");
        const recentReferralOrders = await order_model_1.default.find(referralOrderMatch)
            .sort({ updatedAt: -1 })
            .limit(100)
            .populate("userId", "name")
            .select("orderId referralBonusGiven referralBonusAmount order_status updatedAt userId");
        const transactions = [];
        recentOrders.forEach(o => {
            const pAmt = o.profitAmount || 0;
            if (pAmt > 0) {
                transactions.push({
                    type: "profit",
                    amount: pAmt,
                    status: o.profitGiven ? "credited" : o.order_status === "cancelled" ? "lost" : "pending",
                    orderId: o.orderId,
                    date: o.updatedAt
                });
            }
        });
        recentReferralOrders.forEach(o => {
            const rAmt = o.referralBonusAmount || 0;
            if (rAmt > 0) {
                transactions.push({
                    type: "referral",
                    amount: rAmt,
                    user: o.userId?.name || "Customer",
                    status: o.referralBonusGiven ? "credited" : o.order_status === "cancelled" ? "lost" : "pending",
                    orderId: o.orderId,
                    date: o.updatedAt
                });
            }
        });
        // Add video referrals to transactions feed
        videoReferrals.forEach((v) => {
            if (v.bonusAmount > 0) {
                transactions.push({
                    type: "referral",
                    amount: v.bonusAmount,
                    user: `${v.buyerName} (Course)`,
                    status: v.status === "approved" ? "credited" : v.status === "rejected" ? "lost" : "pending",
                    orderId: v._id.toString(),
                    date: v.createdAt
                });
            }
        });
        transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        res.status(200).json({
            success: true,
            data: {
                summary: {
                    totalProfit: myStats.profitPaid,
                    pendingProfit: myStats.pendingProfit + totalPendingReferralBonus + pendingVideoReferralBonus,
                    referralIncome: totalReferralBonus + approvedVideoReferralBonus,
                    lostProfit: myStats.lostProfit,
                    totalRevenue: myStats.revenue,
                    ordersCount: myStats.totalOrders,
                    referralCount: referrals.length,
                    currentBalance: req.user?.balance || 0
                },
                orderPipeline,
                referralNetwork: referralNetwork.sort((a, b) => b.orderCount - a.orderCount),
                transactions: transactions.slice(0, 15),
                videoReferrals
            }
        });
    }
    catch (error) {
        console.error("My Dropshipping Analytics Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getMyDropshippingAnalytics = getMyDropshippingAnalytics;
