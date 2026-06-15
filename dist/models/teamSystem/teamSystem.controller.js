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
        if (!userId) {
            return res
                .status(400)
                .send({ success: false, message: "User ID not found!" });
        }
        const currentUser = await user_model_1.default
            .findById(userId)
            .select("name email referralCode referralCount balance role deliveredItemsCount");
        const pipeline = [
            {
                $match: {
                    referredBy: new mongoose_1.default.Types.ObjectId(currentUser?._id),
                },
            },
            {
                $lookup: {
                    from: "orders",
                    localField: "orderHistory",
                    foreignField: "_id",
                    as: "orders",
                },
            },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    email: 1,
                    mobile: 1,
                    referralCode: 1,
                    referralCount: 1,
                    balance: 1,
                    deliveredItemsCount: 1,
                    customerstatus: 1,
                    role: 1,
                    createdAt: 1,
                    orders: {
                        $map: {
                            input: "$orders",
                            as: "order",
                            in: {
                                _id: "$$order._id",
                                orderId: "$$order.orderId",
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
                },
            },
            { $sort: { createdAt: -1 } },
        ];
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
            members: enrichedReferredUsers,
        };
        res.send({
            success: true,
            message: "Team system data retrieved successfully",
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
