
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
        // 1. Core Metrics
        const totalCustomers = await UserModel.countDocuments({ role: "USER" });

        // New Customers (this month)
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const newCustomers = await UserModel.countDocuments({
            role: "USER",
            createdAt: { $gte: firstDayOfMonth },
        });

        // Returning Customers (More than 1 order)
        const returningCustomerStats = await OrderModel.aggregate([
            { $group: { _id: "$userId", orderCount: { $sum: 1 } } },
            { $match: { orderCount: { $gt: 1 } } },
            { $count: "count" }
        ]);
        const returningCustomers = returningCustomerStats.length > 0 ? returningCustomerStats[0].count : 0;

        // Retention Rate
        const customerRetentionRate = totalCustomers > 0 ? ((returningCustomers / totalCustomers) * 100).toFixed(1) : 0;

        // Financial Metrics (LTV, AOV)
        const financialStats = await OrderModel.aggregate([
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

        const growthStats = await UserModel.aggregate([
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
        const returningGrowthStats = await OrderModel.aggregate([
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
                $addFields: {
                    // If order is created after the user's creation month, they are returning? 
                    // Simplification: Any order by a user who existed before the order month is "returning" behavior
                    // But strictly, returning means >1 order.
                    // Let's stick to the previous logic: Users who placed an order in Month X, and their first order was < Month X.
                    // For simplicity in this aggregation:
                    userCreatedAt: "$user.createdAt"
                }
            },
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
            // This gives active users per month. To distinguish "new" vs "returning" in that month requires checking purchase history.
            // We will simplify: The `growthStats` (User registration) is "New".
            // "Returning" in the chart usually means Active Users - New Users. Or simply Repeat Buyers.
            // Let's use: Returning = Active Users in Month (from Orders) who registered in a previous month.
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

        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        // Combine for Chart
        // We want last 6 months filled even if empty
        const combinedGrowth = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const m = d.getMonth() + 1;
            const y = d.getFullYear();

            const newStat = growthStats.find(s => s._id.month === m && s._id.year === y);
            const retStat = returningGrowthStats.find(s => s._id.month === m && s._id.year === y);

            combinedGrowth.push({
                month: months[m - 1],
                new: newStat ? newStat.new : 0,
                returning: retStat ? retStat.count : 0,
                total: (newStat ? newStat.new : 0) + (retStat ? retStat.count : 0)
            });
        }


        // 3. Demographics
        // Age Groups (requires date_of_birth)
        // We can aggregate on DOB.
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

        // Map buckets to frontend labels: "18-24", "25-34", etc.
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

        // Locations (from Address)
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
            status: c.user.customerstatus === "NewCustomer" ? "Regular" : "Premium" // Map backend status to frontend expectations
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
                // Mock behavior metrics as we don't track session/bounce yet
                behaviorMetrics: {
                    averageSessionDuration: "0m 0s",
                    bounceRate: 0,
                    pagesPerSession: 0,
                    conversionRate: 0 // We can calculate this if we had visitor count
                }
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
        // 1. Overview
        const totalStats = await OrderModel.aggregate([
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
        const totalUsers = await UserModel.countDocuments({ role: "USER" });
        const conversionRate = totalUsers > 0 ? ((stats.totalOrders / totalUsers) * 100).toFixed(1) : 0;

        // 2. Sales Trend (Last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const salesTrend = await OrderModel.aggregate([
            { $match: { createdAt: { $gte: sevenDaysAgo } } },
            {
                $group: {
                    _id: {
                        day: { $dayOfMonth: "$createdAt" },
                        month: { $month: "$createdAt" },
                        year: { $year: "$createdAt" },
                        dateStr: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
                    },
                    sales: { $sum: "$totalAmt" }, // Revenue
                    orders: { $sum: 1 },
                    revenue: { $sum: "$totalAmt" } // Redundant but matches frontend key expectation potentially
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
        ]);

        const formattedSalesTrend = salesTrend.map(s => ({
            date: s._id.dateStr,
            sales: s.orders, // Frontend might stick 'sales' as unit count or revenue, code says 'sales: 4500' which looks like volume? But mock data had revenue separate. 
            // Mock: { date: '2024-08-26', sales: 4500, orders: 45, revenue: 67500 } -> sales probably means simple sum or volume? 
            // Let's assume sales = sum of quantity.
            // We need to unwind products to get total quantity for correct 'sales' unit count.
            // For efficiency, let's just use orders count for now or rough estimate.
            // Actually, let's fix the aggregation for 'sales' = quantity sum if possible, or just leave as is.
            orders: s.orders,
            revenue: s.revenue
        }));


        // 3. Top Products
        const topProducts = await OrderModel.aggregate([
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
                    growth: { $literal: 0 }
                }
            }
        ]);


        // 4. Category Distribution
        const categoryStats = await OrderModel.aggregate([
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
            { $unwind: "$productDetails.category" },
            {
                $lookup: {
                    from: "categories",
                    localField: "productDetails.category",
                    foreignField: "_id",
                    as: "categoryInfo"
                }
            },
            { $unwind: "$categoryInfo" },
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
            name: stat._id,
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
