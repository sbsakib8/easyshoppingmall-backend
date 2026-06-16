import { NextFunction, Request, Response } from "express";
import mongoose, { PipelineStage } from "mongoose";
import { IOrder } from "../order/interface";
import userModel, { IUser } from "../user/user.model";
import { IVideoAccess } from "../videoAccess/videoAccess.model";
import { IVideoCourse } from "../videoCourse/videoCourse.model";

export const getTeamSystem = async (
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  try {
    const userId = req?.user?._id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || "";
    const skip = (page - 1) * limit;

    if (!userId) {
      return res
        .status(400)
        .send({ success: false, message: "User ID not found!" });
    }

    const currentUser: IUser = await userModel
      .findById(userId)
      .select("name referralCode referralCount balance");

    if (!currentUser) {
      return res
        .status(400)
        .send({ success: false, message: "User not found!" });
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const ordersLookup: PipelineStage[] = [
      {
        $lookup: {
          from: "orders",
          localField: "orderHistory",
          foreignField: "_id",
          as: "orders",
        },
      },
      {
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

    const videoAccessLookup: PipelineStage[] = [
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

    const basePipeline: PipelineStage[] = [
      {
        $match: {
          referredBy: new mongoose.Types.ObjectId(currentUser._id),
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
        $project: {
          _id: 1,
          name: 1,
          email: 1,
          createdAt: 1,
          orders: {
            $map: {
              input: "$orders",
              as: "order",
              in: {
                _id: "$$order._id",
                orderId: "$$order.orderId",
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
        },
      },
      { $sort: { createdAt: -1 } },
    ];

    const paginatedPipeline: PipelineStage[] = [
      ...basePipeline,
      { $skip: skip },
      { $limit: limit },
    ];

    const countPipeline: PipelineStage[] = [
      {
        $match: {
          referredBy: new mongoose.Types.ObjectId(currentUser._id),
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
      userModel.aggregate(paginatedPipeline),
      userModel.aggregate(countPipeline),
    ]);

    const total = totalCountResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    const summaryPipeline: PipelineStage[] = [
      {
        $match: {
          referredBy: new mongoose.Types.ObjectId(currentUser._id),
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

    const allReferredUsers = await userModel.aggregate(summaryPipeline);

    let totalOrderReferralBonus = 0;
    let totalCourseReferralBonus = 0;
    let totalOrders = 0;
    let totalCourses = 0;

    allReferredUsers.forEach((user) => {
      // Calculate order bonuses
      const orderReferralBonus = user.orders.reduce(
        (sum: number, order: IOrder) => {
          return sum + (order.referralBonusAmount || 0);
        },
        0,
      );

      // Calculate course bonuses
      const courseReferralBonus = user.videoAccess.reduce(
        (sum: number, video: IVideoAccess) => {
          const courseDetail = user.courseDetails?.find(
            (course: IVideoCourse) => course._id === video.courseId,
          );

          if (courseDetail && courseDetail.referralBonus) {
            return sum + (courseDetail.referralBonus || 0);
          }

          return sum;
        },
        0,
      );

      totalOrderReferralBonus += orderReferralBonus;
      totalCourseReferralBonus += courseReferralBonus;
      totalOrders += user.orders.length;
      totalCourses += user.videoAccess.length;
    });

    // Enrich paginated users with their bonus data
    const enrichedReferredUsers = referredUsers.map((user) => {
      const orderReferralBonus = user.orders.reduce(
        (sum: number, order: IOrder) => {
          return sum + (order.referralBonusAmount || 0);
        },
        0,
      );

      const courseReferralBonus = user.videoAccess.reduce(
        (sum: number, video: IVideoAccess) => {
          const courseDetail = user.courseDetails?.find(
            (course: IVideoCourse) => course._id === video.courseId,
          );

          if (courseDetail && courseDetail.referralBonus) {
            return sum + (courseDetail.referralBonus || 0);
          }
          return sum;
        },
        0,
      );

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
      members: enrichedReferredUsers,
    };

    res.send({
      success: true,
      message: "Team system data retrieved successfully for last 30 days!",
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
