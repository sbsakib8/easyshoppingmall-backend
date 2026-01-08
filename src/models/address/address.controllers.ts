import { Request, Response } from "express";
import AddressModel from "./address.model";
import UserModel from "../user/user.model";

// Extend Express Request to include userId (set by middleware)
export interface AuthRequest extends Request {
  userId?: string;
}

// Add Address
export const addAddressController = async (
  request: AuthRequest,
  response: Response
): Promise<Response> => {
  try {
    const userId = request.userId; // from auth middleware
    if (!userId) {
      return response.status(401).json({
        message: "Unauthorized: No userId",
        error: true,
        success: false,
      });
    }

    const { address_line, district, division, upazila_thana, pincode, country, mobile } = request.body;

    const createAddress = new AddressModel({
      address_line,
      district,
      division,
      upazila_thana,
      country,
      pincode,
      mobile,
      userId,
    });

    const saveAddress = await createAddress.save();

    await UserModel.findByIdAndUpdate(userId, {
      $push: { address_details: saveAddress._id },
    });

    return response.json({
      message: "Address Created Successfully",
      error: false,
      success: true,
      data: saveAddress,
    });
  } catch (error: any) {
    return response.status(500).json({
      message: error.message || error,
      error: true,
      success: false,
    });
  }
};

// Get Address
export const getAddressController = async (
  request: AuthRequest,
  response: Response
): Promise<Response> => {
  try {
    const userId = request.userId;
    if (!userId) {
      return response.status(401).json({
        message: "Unauthorized: No userId",
        error: true,
        success: false,
      });
    }

    const data = await AddressModel.find({ userId }).sort({ createdAt: -1 });

    return response.json({
      data,
      message: "List of address",
      error: false,
      success: true,
    });
  } catch (error: any) {
    return response.status(500).json({
      message: error.message || error,
      error: true,
      success: false,
    });
  }
};

// Update Address
export const updateAddressController = async (
  request: AuthRequest,
  response: Response
): Promise<Response> => {
  try {
    const userId = request.userId;
    if (!userId) {
      return response.status(401).json({
        message: "Unauthorized: No userId",
        error: true,
        success: false,
      });
    }

    const { _id, address_line, district, division, upazila_thana, country, pincode, mobile } =
      request.body;

    const updateAddress = await AddressModel.updateOne(
      { _id, userId },
      {
        address_line,
        district,
        division,
        upazila_thana,
        country,
        mobile,
        pincode,
      }
    );

    return response.json({
      message: "Address Updated",
      error: false,
      success: true,
      data: updateAddress,
    });
  } catch (error: any) {
    return response.status(500).json({
      message: error.message || error,
      error: true,
      success: false,
    });
  }
};

// Delete (soft remove) Address
export const deleteAddressController = async (
  request: AuthRequest,
  response: Response
): Promise<Response> => {
  try {
    const userId = request.userId;
    if (!userId) {
      return response.status(401).json({
        message: "Unauthorized: No userId",
        error: true,
        success: false,
      });
    }

    const { _id } = request.body;

    const disableAddress = await AddressModel.updateOne(
      { _id, userId },
      { status: false }
    );

    return response.json({
      message: "Address removed",
      error: false,
      success: true,
      data: disableAddress,
    });
  } catch (error: any) {
    return response.status(500).json({
      message: error.message || error,
      error: true,
      success: false,
    });
  }
};
