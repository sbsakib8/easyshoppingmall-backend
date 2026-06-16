"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTeamSystem = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const user_model_1 = __importDefault(require("../user/user.model"));
const getTeamSystem = async (req, res, _next) => {
    try {
        const userId = req?.user?._id;
<<<<<<< HEAD
=======
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || "";
        const skip = (page - 1) * limit;
>>>>>>> 972e5dd19b66d3c94ac982b20208f2e664595833
        if (!userId) {
            return res
                .status(400)
                .send({ success: false, message: "User ID not found!" });
        }
        const currentUser = await user_model_1.default
            .findById(userId)
<<<<<<< HEAD
            .select("name email referralCode referralCount balance role deliveredItemsCount");
        const pipeline = [
            {
                $match: {
                    referredBy: new mongoose_1.default.Types.ObjectId(currentUser?._id),
                },
            },
=======
            .select("name referralCode referralCount balance");
        if (!currentUser) {
            return res
                .status(400)
                .send({ success: false, message: "User not found!" });
        }
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const ordersLookup = [
>>>>>>> 972e5dd19b66d3c94ac982b20208f2e664595833
            {
                $lookup: {
                    from: "orders",
                    localField: "orderHistory",
                    foreignField: "_id",
                    as: "orders",
                },
            },
            {
<<<<<<< HEAD
=======
                $addFields: {
                    orders: {
                        $filter: {
                            input: "$orders",
                            as: "order",
                            cond: {
                                $and: [
                                    { $gte: ["$$order.createdAt", thirtyDaysAgo] },
                                    { $eq: ["$$order.referralBonusGiven", true] },
                                ],
                            },
                        },
                    },
                },
            },
        ];
        const videoAccessLookup = [
            {
                $lookup: {
                    from: "videoaccesses",
                    localField: "_id",
                    foreignField: "userId",
                    as: "videoAccess",
                },
            },
            {
                $addFields: {
                    videoAccess: {
                        $filter: {
                            input: "$videoAccess",
                            as: "video",
                            cond: {
                                $and: [
                                    { $gte: ["$$video.createdAt", thirtyDaysAgo] },
                                    { $eq: ["$$video.status", "approved"] },
                                    { $eq: ["$$video.referralBonusCredited", true] },
                                ],
                            },
                        },
                    },
                },
            },
        ];
        const basePipeline = [
            {
                $match: {
                    referredBy: new mongoose_1.default.Types.ObjectId(currentUser._id),
                },
            },
            ...(search
                ? [
                    {
                        $match: {
                            $or: [
                                { name: { $regex: search, $options: "i" } },
                                { email: { $regex: search, $options: "i" } },
                            ],
                        },
                    },
                ]
                : []),
            ...ordersLookup,
            ...videoAccessLookup,
            {
                $lookup: {
                    from: "videocourses",
                    localField: "videoAccess.courseId",
                    foreignField: "_id",
                    as: "courseDetails",
                },
            },
            {
>>>>>>> 972e5dd19b66d3c94ac982b20208f2e664595833
                $project: {
                    _id: 1,
                    name: 1,
                    email: 1,
<<<<<<< HEAD
                    mobile: 1,
                    referralCode: 1,
                    referralCount: 1,
                    balance: 1,
                    deliveredItemsCount: 1,
                    customerstatus: 1,
                    role: 1,
=======
>>>>>>> 972e5dd19b66d3c94ac982b20208f2e664595833
                    createdAt: 1,
                    orders: {
                        $map: {
                            input: "$orders",
                            as: "order",
                            in: {
                                _id: "$$order._id",
                                orderId: "$$order.orderId",
<<<<<<< HEAD
                                totalAmt: "$$order.totalAmt",
                                order_status: "$$order.order_status",
                                payment_status: "$$order.payment_status",
                                payment_type: "$$order.payment_type",
                                createdAt: "$$order.createdAt",
                                products: "$$order.products",
                                referralBonusGiven: "$$order.referralBonusGiven",
                                referralBonusAmount: "$$order.referralBonusAmount",
                            },
                        },
                    },
=======
                                referralBonusAmount: "$$order.referralBonusAmount",
                                createdAt: "$$order.createdAt",
                            },
                        },
                    },
                    videoAccess: {
                        $map: {
                            input: "$videoAccess",
                            as: "video",
                            in: {
                                _id: "$$video._id",
                                courseId: "$$video.courseId",
                                amount: "$$video.amount",
                                createdAt: "$$video.createdAt",
                            },
                        },
                    },
                    courseDetails: 1,
>>>>>>> 972e5dd19b66d3c94ac982b20208f2e664595833
                },
            },
            { $sort: { createdAt: -1 } },
        ];
<<<<<<< HEAD
        const referredUsers = await user_model_1.default.aggregate(pipeline);
        let totalTeamOrders = 0;
        let totalRevenue = 0;
        let last7DaysOrders = 0;
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const enrichedReferredUsers = referredUsers.map((user) => {
            const userOrders = user.orders || [];
            const last7DaysUserOrders = userOrders.filter((order) => new Date(order.createdAt) >= sevenDaysAgo);
            totalTeamOrders += userOrders.length;
            last7DaysOrders += last7DaysUserOrders.length;
            const userRevenue = userOrders.reduce((sum, order) => {
                return sum + (order.totalAmt || 0);
            }, 0);
            totalRevenue += userRevenue;
            return {
                ...user,
                totalOrders: userOrders.length,
                last7DaysOrders: last7DaysUserOrders.length,
                last7DaysRevenue: last7DaysUserOrders.reduce((sum, order) => {
                    return sum + (order.totalAmt || 0);
                }, 0),
                revenue: userRevenue,
            };
        });
        const totalDownline = await user_model_1.default.countDocuments({
            $or: [
                { referredBy: userId },
                { referredBy: { $in: referredUsers.map((u) => u._id) } },
            ],
        });
        const responseData = {
            currentUser: {
                _id: currentUser?._id,
                name: currentUser?.name,
                referralCode: currentUser?.referralCode,
                referralCount: currentUser?.referralCount,
                balance: currentUser?.balance,
                deliveredItemsCount: currentUser?.deliveredItemsCount,
            },
            directReferralsCount: referredUsers.length,
            totalDownlineCount: totalDownline,
            totalTeamOrders,
            totalRevenue,
            last7DaysOrders,
=======
        const paginatedPipeline = [
            ...basePipeline,
            { $skip: skip },
            { $limit: limit },
        ];
        const countPipeline = [
            {
                $match: {
                    referredBy: new mongoose_1.default.Types.ObjectId(currentUser._id),
                },
            },
            ...(search
                ? [
                    {
                        $match: {
                            $or: [
                                { name: { $regex: search, $options: "i" } },
                                { email: { $regex: search, $options: "i" } },
                            ],
                        },
                    },
                ]
                : []),
            { $count: "total" },
        ];
        const [referredUsers, totalCountResult] = await Promise.all([
            user_model_1.default.aggregate(paginatedPipeline),
            user_model_1.default.aggregate(countPipeline),
        ]);
        const total = totalCountResult[0]?.total || 0;
        const totalPages = Math.ceil(total / limit);
        const summaryPipeline = [
            {
                $match: {
                    referredBy: new mongoose_1.default.Types.ObjectId(currentUser._id),
                },
            },
            ...ordersLookup,
            ...videoAccessLookup,
            {
                $lookup: {
                    from: "videocourses",
                    localField: "videoAccess.courseId",
                    foreignField: "_id",
                    as: "courseDetails",
                },
            },
            {
                $project: {
                    orders: 1,
                    videoAccess: 1,
                    courseDetails: 1,
                },
            },
        ];
        const allReferredUsers = await user_model_1.default.aggregate(summaryPipeline);
        let totalOrderReferralBonus = 0;
        let totalCourseReferralBonus = 0;
        let totalOrders = 0;
        let totalCourses = 0;
        allReferredUsers.forEach((user) => {
            // Calculate order bonuses
            const orderReferralBonus = user.orders.reduce((sum, order) => {
                return sum + (order.referralBonusAmount || 0);
            }, 0);
            // Calculate course bonuses
            const courseReferralBonus = user.videoAccess.reduce((sum, video) => {
                const courseDetail = user.courseDetails?.find((course) => course._id === video.courseId);
                if (courseDetail && courseDetail.referralBonus) {
                    return sum + (courseDetail.referralBonus || 0);
                }
                return sum;
            }, 0);
            totalOrderReferralBonus += orderReferralBonus;
            totalCourseReferralBonus += courseReferralBonus;
            totalOrders += user.orders.length;
            totalCourses += user.videoAccess.length;
        });
        // Enrich paginated users with their bonus data
        const enrichedReferredUsers = referredUsers.map((user) => {
            const orderReferralBonus = user.orders.reduce((sum, order) => {
                return sum + (order.referralBonusAmount || 0);
            }, 0);
            const courseReferralBonus = user.videoAccess.reduce((sum, video) => {
                const courseDetail = user.courseDetails?.find((course) => course._id === video.courseId);
                if (courseDetail && courseDetail.referralBonus) {
                    return sum + (courseDetail.referralBonus || 0);
                }
                return sum;
            }, 0);
            return {
                _id: user._id,
                name: user.name,
                email: user.email,
                joinedAt: user.createdAt,
                totalOrder: user.orders.length,
                totalCourse: user.videoAccess.length,
                referralBonuses: {
                    fromOrders: orderReferralBonus,
                    fromCourses: courseReferralBonus,
                    total: orderReferralBonus + courseReferralBonus,
                },
            };
        });
        const responseData = {
            currentUser: {
                _id: currentUser._id,
                name: currentUser.name,
                referralCode: currentUser.referralCode,
                referralCount: currentUser.referralCount,
                balance: currentUser.balance,
            },
            last30DaysSummary: {
                totalOrder: totalOrders,
                totalCourse: totalCourses,
                totalReferralBonus: {
                    fromOrders: totalOrderReferralBonus,
                    fromCourses: totalCourseReferralBonus,
                    total: totalOrderReferralBonus + totalCourseReferralBonus,
                },
            },
            pagination: {
                currentPage: page,
                totalPages: totalPages,
                totalItems: total,
                itemsPerPage: limit,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            },
>>>>>>> 972e5dd19b66d3c94ac982b20208f2e664595833
            members: enrichedReferredUsers,
        };
        res.send({
            success: true,
<<<<<<< HEAD
            message: "Team system data retrieved successfully",
=======
            message: "Team system data retrieved successfully for last 30 days!",
>>>>>>> 972e5dd19b66d3c94ac982b20208f2e664595833
            data: responseData,
        });
    }
    catch (error) {
        console.error("Get TeamSystem Error: ", error);
        res.status(500).send({
            success: false,
            error: error.message || "Something went wrong!",
        });
    }
};
exports.getTeamSystem = getTeamSystem;
