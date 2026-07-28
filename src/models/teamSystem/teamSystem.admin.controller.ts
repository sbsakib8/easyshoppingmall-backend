import { NextFunction, Request, Response } from "express";
import mongoose, { PipelineStage } from "mongoose";
import { IOrder } from "../order/interface";
import userModel, { IUser } from "../user/user.model";
import { IVideoCourse } from "../videoCourse/videoCourse.model";

export const getAdminTeamSystem = async (
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || "";
    const skip = (page - 1) * limit;

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
          referredBy: { $exists: true, $ne: null },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "referredBy",
          foreignField: "_id",
          as: "referrerInfo",
        },
      },
      {
        $addFields: {
          referrerInfo: { $arrayElemAt: ["$referrerInfo", 0] },
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
          referrerName: "$referrerInfo.name",
          referrerEmail: "$referrerInfo.email",
          referrerCode: "$referrerInfo.referralCode",
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
          referredBy: { $exists: true, $ne: null },
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

    const summaryPipeline: PipelineStage[] = [
      {
        $match: {
          referredBy: { $exists: true, $ne: null },
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

    const [referredUsers, totalCountResult, allReferredUsers] =
      await Promise.all([
        userModel.aggregate(paginatedPipeline),
        userModel.aggregate(countPipeline),
        userModel.aggregate(summaryPipeline),
      ]);

    const total = totalCountResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    let totalOrderReferralBonus = 0;
    let totalCourseReferralBonus = 0;
    let totalOrders = 0;
    let totalCourses = 0;

    allReferredUsers.forEach((user) => {
      const orderReferralBonus: number = user.orders.reduce(
        (sum: number, order: IOrder) => {
          return sum + (order.referralBonusAmount || 0);
        },
        0,
      );

      const courseReferralBonus: number = user.courseDetails.reduce(
        (sum: number, course: IVideoCourse) => {
          return sum + (course.referralBonus || 0);
        },
        0,
      );

      totalOrderReferralBonus += orderReferralBonus;
      totalCourseReferralBonus += courseReferralBonus;
      totalOrders += user.orders.length;
      totalCourses += user.videoAccess.length;
    });

    const enrichedReferredUsers = referredUsers.map((user) => {
      const orderReferralBonus = user.orders.reduce(
        (sum: number, order: IOrder) => {
          return sum + (order.referralBonusAmount || 0);
        },
        0,
      );

      const courseReferralBonus = user.courseDetails.reduce(
        (sum: number, video: IVideoCourse) => {
          return sum + (video.referralBonus || 0);
        },
        0,
      );

      return {
        _id: user._id,
        name: user.name,
        email: user.email,
        joinedAt: user.createdAt,
        referrerName: user.referrerName || "System",
        referrerEmail: user.referrerEmail || "",
        referrerCode: user.referrerCode || "",
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
      last30DaysSummary: {
        totalReferrals: total,
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
      message: "Admin team system data retrieved successfully!",
      data: responseData,
    });
  } catch (error: unknown) {
    console.error("Get Admin TeamSystem Error: ", error);

    res.status(500).send({
      success: false,
      error: (error as Error).message || "Something went wrong!",
    });
  }
};
