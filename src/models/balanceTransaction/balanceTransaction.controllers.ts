import { Request, Response } from "express";
import { AuthRequest } from "../../middlewares/isAuth";
import OrderModel from "../order/order.model";
import UserModel from "../user/user.model";
import BalanceTransactionModel from "./balanceTransaction.model";

/**
 * @desc    Admin adjusts a dropshipper's balance (credit or deduct)
 * @route   POST /api/balance-transaction/adjust
 * @access  Private (Admin)
 */
export const adjustBalance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId, amount, type, reason } = req.body;

    if (!userId || !amount || !type || !reason) {
      res.status(400).json({
        success: false,
        message: "userId, amount, type, and reason are required",
      });
      return;
    }

    if (amount <= 0) {
      res.status(400).json({
        success: false,
        message: "Amount must be greater than 0",
      });
      return;
    }

    const validTypes = [
      "courier_adjustment",
      "manual_credit",
      "manual_deduct",
      "cod_return_deduction",
    ];
    if (!validTypes.includes(type)) {
      res.status(400).json({
        success: false,
        message: `Invalid type. Allowed: ${validTypes.join(", ")}`,
      });
      return;
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    const isDropshipper =
      user.role === "DROPSHIPPING" || user.roles?.includes("DROPSHIPPING");
    if (!isDropshipper) {
      res.status(400).json({
        success: false,
        message: "Balance adjustment is only available for dropshippers",
      });
      return;
    }

    const currentBalance = user.balance || 0;
    const isDeduct =
      type === "manual_deduct" ||
      type === "courier_adjustment" ||
      type === "cod_return_deduction";

    if (isDeduct && currentBalance < amount) {
      res.status(400).json({
        success: false,
        message: `Insufficient balance. Current: ৳${currentBalance}, Requested deduction: ৳${amount}`,
      });
      return;
    }

    const increment = isDeduct ? -amount : amount;
    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      { $inc: { balance: increment } },
      { new: true }
    );

    const newBalance = updatedUser?.balance || 0;

    await BalanceTransactionModel.create({
      userId,
      amount: isDeduct ? -amount : amount,
      type,
      reason,
      performedBy: req.user?._id,
      balanceAfter: newBalance,
    });

    res.status(200).json({
      success: true,
      message: `Balance ${isDeduct ? "deducted" : "credited"} successfully`,
      data: {
        previousBalance: currentBalance,
        adjustment: isDeduct ? -amount : amount,
        newBalance,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/**
 * @desc    Get balance transaction history for a specific user
 * @route   GET /api/balance-transaction/history/:userId
 * @access  Private (Admin)
 */
export const getBalanceHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const user = await UserModel.findById(userId).select("name email balance role");
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    const transactions = await BalanceTransactionModel.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("performedBy", "name email")
      .lean();

    const total = await BalanceTransactionModel.countDocuments({ userId });

    res.status(200).json({
      success: true,
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          balance: user.balance,
          role: user.role,
        },
        transactions,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/**
 * @desc    Get all balance transactions (admin overview)
 * @route   GET /api/balance-transaction/all
 * @access  Private (Admin)
 */
export const getAllTransactions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 30;
    const skip = (page - 1) * limit;
    const search = (req.query.search as string) || "";

    let filter: any = {};
    if (search) {
      const matchingUsers = await UserModel.find({
        $and: [
          {
            $or: [
              { name: { $regex: search, $options: "i" } },
              { email: { $regex: search, $options: "i" } },
            ],
          },
          { $or: [{ role: "DROPSHIPPING" }, { roles: "DROPSHIPPING" }] },
        ],
      }).select("_id");

      filter.userId = { $in: matchingUsers.map((u) => u._id) };
    } else {
      const allDSUsers = await UserModel.find({
        $or: [{ role: "DROPSHIPPING" }, { roles: "DROPSHIPPING" }],
      }).select("_id");

      filter.userId = { $in: allDSUsers.map((u) => u._id) };
    }

    const transactions = await BalanceTransactionModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("userId", "name email balance shopName")
      .populate("performedBy", "name email")
      .lean();

    const total = await BalanceTransactionModel.countDocuments(filter);

    const summary = await BalanceTransactionModel.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$type",
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        transactions,
        summary,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/**
 * @desc    Deduct courier cost difference from dropshipper balance
 * @route   POST /api/balance-transaction/courier-deduct
 * @access  Private (Admin)
 */
export const deductCourierCost = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { dropshipperId, orderId, courierCharge, actualCourierCharge } = req.body;

    if (!dropshipperId || !orderId || courierCharge === undefined || actualCourierCharge === undefined) {
      res.status(400).json({
        success: false,
        message: "dropshipperId, orderId, courierCharge, and actualCourierCharge are required",
      });
      return;
    }

    if (courierCharge < 0 || actualCourierCharge < 0) {
      res.status(400).json({
        success: false,
        message: "Charges must be non-negative",
      });
      return;
    }

    // Find dropshipper
    let dropshipper;
    if (dropshipperId.match(/^[0-9a-fA-F]{24}$/)) {
      dropshipper = await UserModel.findById(dropshipperId);
    } else {
      dropshipper = await UserModel.findOne({ email: dropshipperId });
    }

    if (!dropshipper) {
      res.status(404).json({ success: false, message: "Dropshipper not found" });
      return;
    }

    const isDropshipper = dropshipper.role === "DROPSHIPPING" || dropshipper.roles?.includes("DROPSHIPPING");
    if (!isDropshipper) {
      res.status(400).json({
        success: false,
        message: "User is not a dropshipper",
      });
      return;
    }

    // Find order
    let order;
    if (orderId.match(/^[0-9a-fA-F]{24}$/)) {
      order = await OrderModel.findById(orderId);
    } else {
      order = await OrderModel.findOne({ orderId });
    }

    if (!order) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }

    if (order.userId.toString() !== dropshipper._id.toString()) {
      res.status(400).json({
        success: false,
        message: "Order does not belong to this dropshipper",
      });
      return;
    }

    const difference = courierCharge - actualCourierCharge;

    if (difference <= 0) {
      res.status(400).json({
        success: false,
        message: "Actual courier charge must be less than courier charge to have a deduction",
      });
      return;
    }

    const currentBalance = dropshipper.balance || 0;

    // Update order with courier charges
    await OrderModel.findByIdAndUpdate(order._id, {
      courierCharge,
      actualCourierCharge,
    });

    // Deduct from balance
    const updatedUser = await UserModel.findByIdAndUpdate(
      dropshipper._id,
      { $inc: { balance: -difference } },
      { new: true }
    );

    const newBalance = updatedUser?.balance || 0;

    // Create transaction
    await BalanceTransactionModel.create({
      userId: dropshipper._id,
      amount: -difference,
      type: "courier_adjustment",
      reason: `Courier cost adjustment for order ${order.orderId}. Actual: ৳${courierCharge}, Charged: ৳${actualCourierCharge}, Difference: ৳${difference}`,
      orderId: order._id,
      performedBy: req.user?._id,
      balanceAfter: newBalance,
    });

    res.status(200).json({
      success: true,
      message: `Courier cost deducted successfully. ৳${difference} deducted from ${dropshipper.name}'s balance.`,
      data: {
        previousBalance: currentBalance,
        deduction: difference,
        newBalance,
        order: {
          orderId: order.orderId,
          courierCharge,
          actualCourierCharge,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};
