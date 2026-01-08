"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAddressController = exports.updateAddressController = exports.getAddressController = exports.addAddressController = void 0;
const address_model_1 = __importDefault(require("./address.model"));
const user_model_1 = __importDefault(require("../user/user.model"));
// Add Address
const addAddressController = async (request, response) => {
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
        const createAddress = new address_model_1.default({
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
        await user_model_1.default.findByIdAndUpdate(userId, {
            $push: { address_details: saveAddress._id },
        });
        return response.json({
            message: "Address Created Successfully",
            error: false,
            success: true,
            data: saveAddress,
        });
    }
    catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false,
        });
    }
};
exports.addAddressController = addAddressController;
// Get Address
const getAddressController = async (request, response) => {
    try {
        const userId = request.userId;
        if (!userId) {
            return response.status(401).json({
                message: "Unauthorized: No userId",
                error: true,
                success: false,
            });
        }
        const data = await address_model_1.default.find({ userId }).sort({ createdAt: -1 });
        return response.json({
            data,
            message: "List of address",
            error: false,
            success: true,
        });
    }
    catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false,
        });
    }
};
exports.getAddressController = getAddressController;
// Update Address
const updateAddressController = async (request, response) => {
    try {
        const userId = request.userId;
        if (!userId) {
            return response.status(401).json({
                message: "Unauthorized: No userId",
                error: true,
                success: false,
            });
        }
        const { _id, address_line, district, division, upazila_thana, country, pincode, mobile } = request.body;
        const updateAddress = await address_model_1.default.updateOne({ _id, userId }, {
            address_line,
            district,
            division,
            upazila_thana,
            country,
            mobile,
            pincode,
        });
        return response.json({
            message: "Address Updated",
            error: false,
            success: true,
            data: updateAddress,
        });
    }
    catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false,
        });
    }
};
exports.updateAddressController = updateAddressController;
// Delete (soft remove) Address
const deleteAddressController = async (request, response) => {
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
        const disableAddress = await address_model_1.default.updateOne({ _id, userId }, { status: false });
        return response.json({
            message: "Address removed",
            error: false,
            success: true,
            data: disableAddress,
        });
    }
    catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false,
        });
    }
};
exports.deleteAddressController = deleteAddressController;
