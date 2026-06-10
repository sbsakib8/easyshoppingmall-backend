import { NextFunction, Request, Response } from "express";
import mongoose, { PipelineStage } from "mongoose";
import { IOrder } from "../order/interface";
import userModel, { IUser } from "../user/user.model";

export const getTeamSystem = async (
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  try {
    const userId = req?.user?._id;

    if (!userId) {
      return res
        .status(400)
        .send({ success: false, message: "User ID not found!" });
    }

    // Get current user basic info
    const currentUser: IUser = await userModel
      .findById(userId)
      .select(
        "name email referralCode referralCount balance role deliveredItemsCount",
      );

    // Pipeline to get direct referrals with enriched data
    const pipeline: PipelineStage[] = [
      {
        $match: {
          referredBy: new mongoose.Types.ObjectId(currentUser?._id),
        },
      },
      // Lookup orders for each referred user
      {
        $lookup: {
          from: "orders",
          localField: "orderHistory",
          foreignField: "_id",
          as: "orders",
        },
      },
      // Project relevant fields
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

    const referredUsers = await userModel.aggregate(pipeline);

    // Calculate statistics
    let totalTeamOrders = 0;
    let totalRevenue = 0;
    let last7DaysOrders = 0;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const enrichedReferredUsers = referredUsers.map((user) => {
      const userOrders: IOrder[] = user.orders || [];

      const last7DaysUserOrders = userOrders.filter(
        (order) => new Date(order.createdAt) >= sevenDaysAgo,
      );

      totalTeamOrders += userOrders.length;
      last7DaysOrders += last7DaysUserOrders.length;

      // Calculate total revenue from this member's orders
      const userRevenue = userOrders.reduce((sum: number, order: IOrder) => {
        return sum + (order.totalAmt || 0);
      }, 0);

      totalRevenue += userRevenue;

      return {
        ...user,
        totalOrders: userOrders.length,
        last7DaysOrders: last7DaysUserOrders.length,
        last7DaysRevenue: last7DaysUserOrders.reduce(
          (sum: number, order: IOrder) => {
            return sum + (order.totalAmt || 0);
          },
          0,
        ),
        revenue: userRevenue,
      };
    });

    // Get total downline count (direct + their referrals)
    const totalDownline = await userModel.countDocuments({
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
  } catch (error: unknown) {
    console.error("Get TeamSystem Error: ", error);

    res.status(500).send({
      success: false,
      error: (error as Error).message || "Something went wrong!",
    });
  }
};
