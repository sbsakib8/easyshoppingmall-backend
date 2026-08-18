"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTrafficAnalytics = exports.getProductAnalytics = exports.getDashboardSummary = exports.getCustomerAnalytics = void 0;
const order_model_1 = __importDefault(require("../order/order.model"));
const product_model_1 = __importDefault(require("../product/product.model"));
const user_model_1 = __importDefault(require("../user/user.model"));
const address_model_1 = __importDefault(require("../address/address.model"));
// =======================
// CUSTOMER ANALYTICS
// =======================
const getCustomerAnalytics = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let dateFilter = {};
        if (startDate && endDate) {
            dateFilter.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
            };
        }
        else {
            const now = new Date();
            const thirtyDaysAgo = new Date(new Date().setDate(now.getDate() - 30));
            dateFilter.createdAt = {
                $gte: thirtyDaysAgo,
                $lte: now,
            };
        }
        // 1. Core Metrics
        const totalCustomers = await user_model_1.default.countDocuments();
        const newCustomers = await user_model_1.default.countDocuments({
            role: "USER",
            ...dateFilter,
        });
        const returningCustomerStats = await order_model_1.default.aggregate([
            { $match: dateFilter },
            { $group: { _id: "$userId", orderCount: { $sum: 1 } } },
            { $match: { orderCount: { $gt: 1 } } },
            { $count: "count" }
        ]);
        const returningCustomers = returningCustomerStats[0]?.count || 0;
        const customerRetentionRate = totalCustomers > 0 ? Number(((returningCustomers / totalCustomers) * 100).toFixed(1)) : 0;
        const financialStats = await order_model_1.default.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$totalAmt" },
                    totalOrders: { $sum: 1 },
                    uniqueCustomers: { $addToSet: "$userId" }
                }
            }
        ]);
        let averageLifetimeValue = 0;
        let averageOrderValue = 0;
        const stats = financialStats[0] || { totalRevenue: 0, totalOrders: 0, uniqueCustomers: [] };
        const totalRevenue = stats.totalRevenue;
        const totalOrders = stats.totalOrders;
        const uniqueCustomerCount = stats.uniqueCustomers.length;
        averageLifetimeValue = uniqueCustomerCount > 0 ? Math.round(totalRevenue / uniqueCustomerCount) : 0;
        averageOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
        const customerGrowth = await order_model_1.default.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: "$userId",
                    firstOrderDate: { $min: "$createdAt" }
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "userInfo"
                }
            },
            { $unwind: "$userInfo" },
            {
                $project: {
                    year: { $year: "$firstOrderDate" },
                    month: { $month: "$firstOrderDate" },
                    isNew: {
                        $eq: [
                            { $year: "$userInfo.createdAt" },
                            { $year: "$firstOrderDate" }
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: { year: "$year", month: "$month" },
                    newCustomers: { $sum: { $cond: ["$isNew", 1, 0] } },
                    returningCustomers: { $sum: { $cond: ["$isNew", 0, 1] } }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]);
        const monthsLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const combinedGrowth = customerGrowth.map(stat => {
            const { year, month } = stat._id;
            return {
                month: monthsLabels[month - 1],
                new: stat.newCustomers,
                returning: stat.returningCustomers,
                total: stat.newCustomers + stat.returningCustomers
            };
        });
        // 3. Demographics
        const ageGroups = await user_model_1.default.aggregate([
            { $match: { role: "USER", date_of_birth: { $ne: null } } },
            {
                $project: {
                    age: {
                        $floor: {
                            $divide: [
                                { $subtract: [new Date(), "$date_of_birth"] },
                                365 * 24 * 60 * 60 * 1000
                            ]
                        }
                    }
                }
            },
            {
                $bucket: {
                    groupBy: "$age",
                    boundaries: [18, 25, 35, 45, 55, 100],
                    default: "Others",
                    output: { count: { $sum: 1 } }
                }
            }
        ]);
        const totalWithAge = ageGroups.reduce((a, b) => a + b.count, 0);
        const formattedAgeGroups = ageGroups.map((g) => {
            let label = "Others";
            if (g._id === 18)
                label = "18-24";
            if (g._id === 25)
                label = "25-34";
            if (g._id === 35)
                label = "35-44";
            if (g._id === 45)
                label = "45-54";
            if (g._id === 55)
                label = "55+";
            return {
                range: label,
                count: g.count,
                percentage: totalWithAge > 0 ? Math.round((g.count / totalWithAge) * 100) : 0
            };
        });
        const locationStats = await address_model_1.default.aggregate([
            { $match: { country: { $ne: "" } } },
            { $group: { _id: "$country", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);
        const totalAddresses = locationStats.reduce((a, b) => a + b.count, 0);
        const formattedLocations = locationStats.map((l) => ({
            country: l._id || "Unknown",
            count: l.count,
            percentage: totalAddresses > 0 ? Math.round((l.count / totalAddresses) * 100) : 0
        }));
        // 4. Top Customers
        const topCustomersRaw = await order_model_1.default.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: "$userId",
                    orders: { $sum: 1 },
                    spent: { $sum: "$totalAmt" }
                }
            },
            { $sort: { spent: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "user"
                }
            },
            { $unwind: "$user" }
        ]);
        const topCustomers = topCustomersRaw.map((c) => ({
            name: c.user.name,
            orders: c.orders,
            spent: c.spent,
            status: c.user.customerstatus === "VIPCustomer" ? "VIP" : c.user.customerstatus === "TopCustomer" ? "Premium" : "Regular"
        }));
        res.status(200).json({
            success: true,
            data: {
                totalCustomers,
                newCustomers,
                returningCustomers,
                customerRetentionRate,
                averageLifetimeValue,
                averageOrderValue,
                customerGrowthData: combinedGrowth,
                demographics: {
                    ageGroups: formattedAgeGroups,
                    locations: formattedLocations
                },
                topCustomers
            }
        });
    }
    catch (error) {
        console.error("Error in getCustomerAnalytics:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.getCustomerAnalytics = getCustomerAnalytics;
// =======================
// DASHBOARD OVERVIEW SUMMARY
// =======================
const getDashboardSummary = async (req, res) => {
    try {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        // Build date range from query params or default to all time
        const { startDate, endDate, range } = req.query;
        let dateFilter = {};
        if (startDate && endDate) {
            dateFilter.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
            };
        }
        // ── Total metrics (all time or filtered) ──
        const totalMatch = { ...dateFilter };
        const [totalOrdersResult, totalUsers, totalProducts] = await Promise.all([
            order_model_1.default.aggregate([
                { $match: totalMatch },
                {
                    $group: {
                        _id: null,
                        totalOrders: { $sum: 1 },
                        totalRevenue: { $sum: "$totalAmt" },
                        totalDeliveryCharge: { $sum: "$deliveryCharge" },
                        completedOrders: { $sum: { $cond: [{ $eq: ["$order_status", "completed"] }, 1, 0] } },
                        deliveredOrders: {
                            $sum: {
                                $cond: [
                                    { $in: ["$order_status", ["completed", "delivered"]] },
                                    1,
                                    0
                                ]
                            }
                        },
                        pendingOrders: { $sum: { $cond: [{ $eq: ["$order_status", "pending"] }, 1, 0] } },
                        processingOrders: { $sum: { $cond: [{ $eq: ["$order_status", "processing"] }, 1, 0] } },
                        shippedOrders: { $sum: { $cond: [{ $eq: ["$order_status", "shipped"] }, 1, 0] } },
                        cancelledOrders: { $sum: { $cond: [{ $eq: ["$order_status", "cancelled"] }, 1, 0] } },
                        returnOrders: { $sum: { $cond: [{ $eq: ["$order_status", "return"] }, 1, 0] } },
                        totalCouponDiscount: { $sum: "$couponDiscount" },
                        totalAmountPaid: { $sum: "$amount_paid" },
                        totalAmountDue: { $sum: "$amount_due" },
                        totalDeliveryCompleted: {
                            $sum: {
                                $cond: [
                                    { $in: ["$order_status", ["completed", "delivered"]] },
                                    "$deliveryCharge",
                                    0
                                ]
                            }
                        },
                    }
                }
            ]),
            user_model_1.default.countDocuments(),
            product_model_1.default.countDocuments()
        ]);
        const totalStats = totalOrdersResult[0] || {
            totalOrders: 0, totalRevenue: 0, totalDeliveryCharge: 0,
            completedOrders: 0, deliveredOrders: 0,
            pendingOrders: 0, processingOrders: 0,
            shippedOrders: 0, cancelledOrders: 0, returnOrders: 0,
            totalCouponDiscount: 0, totalAmountPaid: 0, totalAmountDue: 0,
            totalDeliveryCompleted: 0
        };
        // ── Today metrics ──
        const todayMatch = { createdAt: { $gte: startOfToday, $lte: now } };
        const todayResult = await order_model_1.default.aggregate([
            { $match: todayMatch },
            {
                $group: {
                    _id: null,
                    todayOrders: { $sum: 1 },
                    todayRevenue: { $sum: "$totalAmt" },
                    todayCompleted: { $sum: { $cond: [{ $eq: ["$order_status", "completed"] }, 1, 0] } },
                    todayPending: { $sum: { $cond: [{ $eq: ["$order_status", "pending"] }, 1, 0] } },
                    todayProcessing: { $sum: { $cond: [{ $eq: ["$order_status", "processing"] }, 1, 0] } },
                    todayShipped: { $sum: { $cond: [{ $eq: ["$order_status", "shipped"] }, 1, 0] } },
                    todayCancelled: { $sum: { $cond: [{ $eq: ["$order_status", "cancelled"] }, 1, 0] } },
                    todayDelivered: {
                        $sum: {
                            $cond: [
                                { $in: ["$order_status", ["completed", "delivered"]] },
                                1,
                                0
                            ]
                        }
                    },
                    todayDeliveryRevenue: {
                        $sum: {
                            $cond: [
                                { $in: ["$order_status", ["completed", "delivered"]] },
                                "$deliveryCharge",
                                0
                            ]
                        }
                    },
                }
            }
        ]);
        const todayStats = todayResult[0] || {
            todayOrders: 0, todayRevenue: 0, todayCompleted: 0,
            todayPending: 0, todayProcessing: 0, todayShipped: 0,
            todayCancelled: 0, todayDelivered: 0, todayDeliveryRevenue: 0
        };
        // ── Yesterday metrics (for comparison) ──
        const yesterdayMatch = { createdAt: { $gte: startOfYesterday, $lt: endOfYesterday } };
        const yesterdayResult = await order_model_1.default.aggregate([
            { $match: yesterdayMatch },
            {
                $group: {
                    _id: null,
                    yesterdayOrders: { $sum: 1 },
                    yesterdayRevenue: { $sum: "$totalAmt" },
                    yesterdayDelivered: {
                        $sum: {
                            $cond: [
                                { $in: ["$order_status", ["completed", "delivered"]] },
                                1,
                                0
                            ]
                        }
                    },
                }
            }
        ]);
        const yesterdayStats = yesterdayResult[0] || {
            yesterdayOrders: 0, yesterdayRevenue: 0, yesterdayDelivered: 0
        };
        // ── Sales trend (last 7 days) ──
        const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
        const salesTrend = await order_model_1.default.aggregate([
            { $match: { createdAt: { $gte: sevenDaysAgo, $lte: now } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    revenue: { $sum: "$totalAmt" },
                    orders: { $sum: 1 },
                    delivered: {
                        $sum: {
                            $cond: [
                                { $in: ["$order_status", ["completed", "delivered"]] },
                                1,
                                0
                            ]
                        }
                    }
                }
            },
            { $sort: { "_id": 1 } }
        ]);
        const formattedSalesTrend = salesTrend.map(s => ({
            date: s._id,
            revenue: s.revenue,
            orders: s.orders,
            delivered: s.delivered
        }));
        // ── Recent orders (last 5) ──
        const recentOrders = await order_model_1.default.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .populate("userId", "name email role")
            .select("orderId totalAmt order_status payment_method createdAt products")
            .lean();
        // ── Top selling products ──
        const topProducts = await order_model_1.default.aggregate([
            { $match: totalMatch },
            { $unwind: "$products" },
            {
                $group: {
                    _id: "$products.productId",
                    name: { $first: "$products.name" },
                    totalSold: { $sum: "$products.quantity" },
                    totalRevenue: { $sum: "$products.totalPrice" }
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: 5 }
        ]);
        // ── Calculate percentage changes ──
        const pctChange = (current, previous) => {
            if (previous === 0)
                return current > 0 ? 100 : 0;
            return Number((((current - previous) / previous) * 100).toFixed(1));
        };
        res.status(200).json({
            success: true,
            data: {
                totals: {
                    orders: totalStats.totalOrders,
                    revenue: totalStats.totalRevenue,
                    deliveryCharge: totalStats.totalDeliveryCharge,
                    completed: totalStats.completedOrders,
                    delivered: totalStats.deliveredOrders,
                    pending: totalStats.pendingOrders,
                    processing: totalStats.processingOrders,
                    confirmed: totalStats.processingOrders,
                    shipped: totalStats.shippedOrders,
                    outForDelivery: totalStats.shippedOrders,
                    cancelled: totalStats.cancelledOrders,
                    returned: totalStats.returnOrders,
                    couponDiscount: totalStats.totalCouponDiscount,
                    amountPaid: totalStats.totalAmountPaid,
                    amountDue: totalStats.totalAmountDue,
                    deliveryCompleted: totalStats.totalDeliveryCompleted,
                    users: totalUsers,
                    products: totalProducts,
                },
                today: {
                    orders: todayStats.todayOrders,
                    revenue: todayStats.todayRevenue,
                    completed: todayStats.todayCompleted,
                    pending: todayStats.todayPending,
                    processing: todayStats.todayProcessing,
                    shipped: todayStats.todayShipped,
                    cancelled: todayStats.todayCancelled,
                    delivered: todayStats.todayDelivered,
                    deliveryRevenue: todayStats.todayDeliveryRevenue,
                },
                changes: {
                    orders: pctChange(todayStats.todayOrders, yesterdayStats.yesterdayOrders),
                    revenue: pctChange(todayStats.todayRevenue, yesterdayStats.yesterdayRevenue),
                    delivered: pctChange(todayStats.todayDelivered, yesterdayStats.yesterdayDelivered),
                },
                salesTrend: formattedSalesTrend,
                recentOrders,
                topProducts
            }
        });
    }
    catch (error) {
        console.error("Error in getDashboardSummary:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.getDashboardSummary = getDashboardSummary;
// =======================
// PRODUCT ANALYTICS
// =======================
const getProductAnalytics = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let dateFilter = {};
        if (startDate && endDate) {
            dateFilter.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
            };
        }
        else {
            const now = new Date();
            const thirtyDaysAgo = new Date(new Date().setDate(now.getDate() - 30));
            dateFilter.createdAt = {
                $gte: thirtyDaysAgo,
                $lte: now,
            };
        }
        // 1. Overview
        const totalStats = await order_model_1.default.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$totalAmt" },
                    totalOrders: { $sum: 1 }
                }
            }
        ]);
        const stats = totalStats[0] || { totalRevenue: 0, totalOrders: 0 };
        const avgOrderValue = stats.totalOrders > 0 ? Math.round(stats.totalRevenue / stats.totalOrders) : 0;
        const totalUsers = await user_model_1.default.countDocuments({ role: "USER" });
        const conversionRate = totalUsers > 0 ? ((stats.totalOrders / totalUsers) * 100).toFixed(1) : 0;
        // 2. Sales Trend
        const salesTrend = await order_model_1.default.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: {
                        dateStr: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
                    },
                    sales: { $sum: "$totalAmt" },
                    orders: { $sum: 1 },
                    revenue: { $sum: "$totalAmt" }
                }
            },
            { $sort: { "_id.dateStr": 1 } }
        ]);
        const formattedSalesTrend = salesTrend.map(s => ({
            date: s._id.dateStr,
            sales: s.sales,
            orders: s.orders,
            revenue: s.revenue
        }));
        // 3. Top Products
        const topProducts = await order_model_1.default.aggregate([
            { $match: dateFilter },
            { $unwind: "$products" },
            {
                $group: {
                    _id: "$products.productId",
                    name: { $first: "$products.name" },
                    sales: { $sum: "$products.quantity" },
                    revenue: { $sum: "$products.totalPrice" }
                }
            },
            { $sort: { revenue: -1 } },
            { $limit: 5 },
            {
                $project: {
                    name: 1,
                    sales: 1,
                    revenue: 1,
                    growth: { $literal: 0 } // Growth calculation not implemented
                }
            }
        ]);
        // 4. Category Distribution
        const categoryStats = await order_model_1.default.aggregate([
            { $match: dateFilter },
            { $unwind: "$products" },
            {
                $lookup: {
                    from: "products",
                    localField: "products.productId",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            { $unwind: "$productDetails" },
            {
                $lookup: {
                    from: "categories",
                    localField: "productDetails.category",
                    foreignField: "_id",
                    as: "categoryInfo"
                }
            },
            { $unwind: { path: "$categoryInfo", preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: "$categoryInfo.name",
                    sales: { $sum: "$products.totalPrice" },
                    count: { $sum: "$products.quantity" }
                }
            },
            { $sort: { sales: -1 } }
        ]);
        const totalCategorySales = categoryStats.reduce((acc, curr) => acc + curr.sales, 0);
        const categoryDistribution = categoryStats.map(stat => ({
            name: stat._id || "Uncategorized",
            sales: stat.sales,
            value: totalCategorySales > 0 ? Math.round((stat.sales / totalCategorySales) * 100) : 0
        }));
        res.status(200).json({
            success: true,
            data: {
                totalRevenue: stats.totalRevenue,
                totalOrders: stats.totalOrders,
                conversionRate: conversionRate,
                avgOrderValue: avgOrderValue,
                salesData: formattedSalesTrend,
                topProducts: topProducts,
                categoryData: categoryDistribution
            }
        });
    }
    catch (error) {
        console.error("Error in getProductAnalytics:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.getProductAnalytics = getProductAnalytics;
// =======================
// TRAFFIC ANALYTICS
// =======================
const getTrafficAnalytics = async (req, res) => {
    try {
        // Real traffic analytics are not implemented yet. Returning a zeroed-out response.
        const zeroedTrafficData = {
            totalVisitors: 0,
            pageViews: 0,
            bounceRate: 0,
            avgSessionDuration: 0,
            conversionRate: 0,
            revenue: 0,
        };
        res.status(200).json({
            success: true,
            message: "Traffic analytics not implemented. Returning placeholder data.",
            data: {
                analyticsData: zeroedTrafficData,
                chartData: [],
                topPages: [],
                trafficSources: [],
                deviceStats: []
            }
        });
    }
    catch (error) {
        console.error("Error in getTrafficAnalytics:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.getTrafficAnalytics = getTrafficAnalytics;
