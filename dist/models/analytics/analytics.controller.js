"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTrafficAnalytics = exports.getProductAnalytics = exports.getCustomerAnalytics = void 0;
const order_model_1 = __importDefault(require("../order/order.model"));
const user_model_1 = __importDefault(require("../user/user.model"));
const address_model_1 = __importDefault(require("../address/address.model"));
// =======================
// CUSTOMER ANALYTICS
// =======================
const getCustomerAnalytics = async (req, res) => {
    try {
        // 1. Core Metrics
        const totalCustomers = await user_model_1.default.countDocuments({ role: "USER" });
        // New Customers (this month)
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const newCustomers = await user_model_1.default.countDocuments({
            role: "USER",
            createdAt: { $gte: firstDayOfMonth },
        });
        // Returning Customers (More than 1 order)
        const returningCustomerStats = await order_model_1.default.aggregate([
            { $group: { _id: "$userId", orderCount: { $sum: 1 } } },
            { $match: { orderCount: { $gt: 1 } } },
            { $count: "count" }
        ]);
        const returningCustomers = returningCustomerStats.length > 0 ? returningCustomerStats[0].count : 0;
        // Retention Rate
        const customerRetentionRate = totalCustomers > 0 ? Number(((returningCustomers / totalCustomers) * 100).toFixed(1)) : 0;
        // Financial Metrics (LTV, AOV)
        const financialStats = await order_model_1.default.aggregate([
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
        if (financialStats.length > 0) {
            const stats = financialStats[0];
            const totalRevenue = stats.totalRevenue || 0;
            const totalOrders = stats.totalOrders || 0;
            const uniqueCustomerCount = stats.uniqueCustomers.length || 1;
            averageLifetimeValue = Math.round(totalRevenue / uniqueCustomerCount);
            averageOrderValue = Math.round(totalRevenue / totalOrders);
        }
        // 2. Customer Growth (Last 6 Months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const growthStats = await user_model_1.default.aggregate([
            {
                $match: {
                    role: "USER",
                    createdAt: { $gte: sixMonthsAgo }
                }
            },
            {
                $group: {
                    _id: {
                        month: { $month: "$createdAt" },
                        year: { $year: "$createdAt" }
                    },
                    new: { $sum: 1 }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]);
        // Returning Growth (Active returning users per month)
        const returningGrowthStats = await order_model_1.default.aggregate([
            {
                $match: {
                    createdAt: { $gte: sixMonthsAgo }
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "userId",
                    foreignField: "_id",
                    as: "user"
                }
            },
            { $unwind: "$user" },
            {
                $group: {
                    _id: {
                        month: { $month: "$createdAt" },
                        year: { $year: "$createdAt" },
                        userId: "$userId"
                    },
                    orderCount: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "_id.userId",
                    foreignField: "_id",
                    as: "userInfo"
                }
            },
            { $unwind: "$userInfo" },
            {
                $addFields: {
                    regMonth: { $month: "$userInfo.createdAt" },
                    regYear: { $year: "$userInfo.createdAt" },
                    currentMonth: "$_id.month",
                    currentYear: "$_id.year"
                }
            },
            {
                // Filter for users who registered BEFORE the current order month
                $match: {
                    $expr: {
                        $or: [
                            { $lt: ["$regYear", "$currentYear"] },
                            { $and: [{ $eq: ["$regYear", "$currentYear"] }, { $lt: ["$regMonth", "$currentMonth"] }] }
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: { month: "$currentMonth", year: "$currentYear" },
                    count: { $sum: 1 }
                }
            }
        ]);
        const monthsLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        // Combine for Chart
        const combinedGrowth = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const m = d.getMonth() + 1;
            const y = d.getFullYear();
            const newStat = growthStats.find(s => s._id.month === m && s._id.year === y);
            const retStat = returningGrowthStats.find(s => s._id.month === m && s._id.year === y);
            combinedGrowth.push({
                month: monthsLabels[m - 1],
                new: newStat ? newStat.new : 0,
                returning: retStat ? retStat.count : 0,
                total: (newStat ? newStat.new : 0) + (retStat ? retStat.count : 0)
            });
        }
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
        // Locations (from Address)
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
                topCustomers,
                behaviorMetrics: {
                    averageSessionDuration: "4m 32s", // Mocked
                    bounceRate: 24.5, // Mocked
                    pagesPerSession: 3.8, // Mocked
                    conversionRate: 3.2 // Mocked
                }
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
// PRODUCT ANALYTICS
// =======================
const getProductAnalytics = async (req, res) => {
    try {
        // 1. Overview
        const totalStats = await order_model_1.default.aggregate([
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
        // Conversion Rate (Total Orders / Total Users approximation)
        const totalUsers = await user_model_1.default.countDocuments({ role: "USER" });
        const conversionRate = totalUsers > 0 ? ((stats.totalOrders / totalUsers) * 100).toFixed(1) : 0;
        // 2. Sales Trend (Last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const salesTrend = await order_model_1.default.aggregate([
            { $match: { createdAt: { $gte: sevenDaysAgo } } },
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
                    growth: { $literal: 12.5 } // Mocked growth for UI
                }
            }
        ]);
        // 4. Category Distribution
        const categoryStats = await order_model_1.default.aggregate([
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
        // Since we don't have a real visitor tracking yet, we mock based on user/order data or just returns reasonable mocks
        const totalUsers = await user_model_1.default.countDocuments({ role: "USER" });
        const totalOrders = await order_model_1.default.countDocuments();
        // Mocking traffic data to match frontend requirements
        const trafficData = {
            totalVisitors: totalUsers * 15, // Rough estimation
            pageViews: totalUsers * 50,
            bounceRate: 34.2,
            avgSessionDuration: 245,
            conversionRate: totalUsers > 0 ? ((totalOrders / totalUsers) * 100).toFixed(1) : 0,
            revenue: await order_model_1.default.aggregate([{ $group: { _id: null, total: { $sum: "$totalAmt" } } }]).then(res => res[0]?.total || 0),
        };
        const chartData = [];
        const now = new Date();
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(now.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            chartData.push({
                date: dateStr,
                visitors: Math.floor(Math.random() * 500) + 1000,
                pageViews: Math.floor(Math.random() * 2000) + 3000,
                revenue: Math.floor(Math.random() * 1000) + 2000
            });
        }
        const topPages = [
            { page: "/products", views: 15420, percentage: 32.4 },
            { page: "/home", views: 12340, percentage: 26.1 },
            { page: "/categories", views: 8760, percentage: 18.5 },
            { page: "/checkout", views: 5430, percentage: 11.4 },
            { page: "/about", views: 3210, percentage: 6.8 },
        ];
        const trafficSources = [
            { source: "Organic Search", visitors: 12340, percentage: 45.2 },
            { source: "Direct", visitors: 8760, percentage: 32.1 },
            { source: "Social Media", visitors: 4320, percentage: 15.8 },
            { source: "Email", visitors: 1890, percentage: 6.9 },
        ];
        const deviceStats = [
            { device: "Desktop", users: 14567, percentage: 59.3 },
            { device: "Mobile", users: 8901, percentage: 36.2 },
            { device: "Tablet", users: 1099, percentage: 4.5 },
        ];
        res.status(200).json({
            success: true,
            data: {
                analyticsData: trafficData,
                chartData,
                topPages,
                trafficSources,
                deviceStats
            }
        });
    }
    catch (error) {
        console.error("Error in getTrafficAnalytics:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.getTrafficAnalytics = getTrafficAnalytics;
