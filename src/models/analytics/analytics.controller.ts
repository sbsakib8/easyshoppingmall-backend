
import { Request, Response } from "express";
import OrderModel from "../order/order.model";
import ProductModel from "../product/product.model";
import UserModel from "../user/user.model";
import AddressModel from "../address/address.model";

// =======================
// CUSTOMER ANALYTICS
// =======================
export const getCustomerAnalytics = async (req: Request, res: Response) => {
    try {

        const { startDate, endDate } = req.query;

        let dateFilter: any = {};
        if (startDate && endDate) {
            dateFilter.createdAt = {
                $gte: new Date(startDate as string),
                $lte: new Date(endDate as string),
            };
        } else {
            const now = new Date();
            const thirtyDaysAgo = new Date(new Date().setDate(now.getDate() - 30));
            dateFilter.createdAt = {
                $gte: thirtyDaysAgo,
                $lte: now,
            };
        }

        // 1. Core Metrics
        const totalCustomers = await UserModel.countDocuments({ role: "USER" });

        const newCustomers = await UserModel.countDocuments({
            role: "USER",
            ...dateFilter,
        });

        const returningCustomerStats = await OrderModel.aggregate([
            { $match: dateFilter },
            { $group: { _id: "$userId", orderCount: { $sum: 1 } } },
            { $match: { orderCount: { $gt: 1 } } },
            { $count: "count" }
        ]);
        const returningCustomers = returningCustomerStats[0]?.count || 0;

        const customerRetentionRate = totalCustomers > 0 ? Number(((returningCustomers / totalCustomers) * 100).toFixed(1)) : 0;

        const financialStats = await OrderModel.aggregate([
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

        const customerGrowth = await OrderModel.aggregate([
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
        const ageGroups = await UserModel.aggregate([
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
        const formattedAgeGroups = ageGroups.map((g: any) => {
            let label = "Others";
            if (g._id === 18) label = "18-24";
            if (g._id === 25) label = "25-34";
            if (g._id === 35) label = "35-44";
            if (g._id === 45) label = "45-54";
            if (g._id === 55) label = "55+";

            return {
                range: label,
                count: g.count,
                percentage: totalWithAge > 0 ? Math.round((g.count / totalWithAge) * 100) : 0
            }
        });

        const locationStats = await AddressModel.aggregate([
            { $match: { country: { $ne: "" } } },
            { $group: { _id: "$country", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);
        const totalAddresses = locationStats.reduce((a, b: any) => a + b.count, 0);
        const formattedLocations = locationStats.map((l: any) => ({
            country: l._id || "Unknown",
            count: l.count,
            percentage: totalAddresses > 0 ? Math.round((l.count / totalAddresses) * 100) : 0
        }));

        // 4. Top Customers
        const topCustomersRaw = await OrderModel.aggregate([
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

        const topCustomers = topCustomersRaw.map((c: any) => ({
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

    } catch (error) {
        console.error("Error in getCustomerAnalytics:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};


// =======================
// PRODUCT ANALYTICS
// =======================
export const getProductAnalytics = async (req: Request, res: Response) => {
    try {
        const { startDate, endDate } = req.query;

        let dateFilter: any = {};
        if (startDate && endDate) {
            dateFilter.createdAt = {
                $gte: new Date(startDate as string),
                $lte: new Date(endDate as string),
            };
        } else {
            const now = new Date();
            const thirtyDaysAgo = new Date(new Date().setDate(now.getDate() - 30));
            dateFilter.createdAt = {
                $gte: thirtyDaysAgo,
                $lte: now,
            };
        }

        // 1. Overview
        const totalStats = await OrderModel.aggregate([
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

        const totalUsers = await UserModel.countDocuments({ role: "USER" });
        const conversionRate = totalUsers > 0 ? ((stats.totalOrders / totalUsers) * 100).toFixed(1) : 0;

        // 2. Sales Trend
        const salesTrend = await OrderModel.aggregate([
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
        const topProducts = await OrderModel.aggregate([
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
        const categoryStats = await OrderModel.aggregate([
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

    } catch (error) {
        console.error("Error in getProductAnalytics:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// =======================
// TRAFFIC ANALYTICS
// =======================
export const getTrafficAnalytics = async (req: Request, res: Response) => {
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

    } catch (error) {
        console.error("Error in getTrafficAnalytics:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
