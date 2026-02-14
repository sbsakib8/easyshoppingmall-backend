import mongoose from "mongoose";
import type { CookieOptions, Request, Response } from "express";
import { AuthRequest } from "../../middlewares/isAuth";
import uploadClouinary from "../../utils/cloudinary";
import generateToken from "../../utils/genaretetoken";
import { sendEmail } from "../../utils/nodemailer";
import AddressModel from "../address/address.model";
import { CartModel } from "../cart/cart.model";
import OrderModel from "../order/order.model";
import { Review } from "../review/review.model";
import type { IUser } from "../user/user.model";
import User from "../user/user.model";
import { WishlistModel } from "../wishlist/wishlist.model";

// Cookie 
const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "none",
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

// Register User
export const signUp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, role } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400).json({ message: "User already exists", success: false });
      return;
    }

    const user: IUser = await User.create({ name, email, password, role });
    const token = generateToken(user._id.toString());
    //  cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });;


    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user,
    },);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Login User
export const signIn = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      res.status(401).json({ message: "user does not exist" });
      return;
    }

    await user.populate([
      {
        path: "address_details",
        match: { userId: user._id },
      },
      {
        path: "shopping_cart",
        populate: {
          path: "products.productId",
          model: "Product",
          populate: {
            path: "category",
            select: "name"
          }
        },
      },
      {
        path: "orderHistory",
        populate: [
          {
            path: "products.productId",
            model: "Product",
            populate: {
              path: "category",
              select: "name"
            }
          },
          {
            path: "cart",
            model: "Cart",
            populate: {
              path: "products.productId",
              model: "Product",
              populate: {
                path: "category",
                select: "name"
              }
            }
          },
        ],
      }
    ]);
    const ismatch = await user.comparePassword(password);
    if (!ismatch) {
      res.status(401).json({ message: "incorrect password" });
      return;
    }
    const token = generateToken(user._id.toString());

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });;

    res.json({
      success: true,
      message: "User Signin successfully",
      user,
    });

  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Sign out user
export const signOut = async (req: Request, res: Response): Promise<void> => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/",
    });

    res.status(200).json({
      success: true,
      message: "User signed out successfully",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// OTP send
export const sendotp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.forgot_password_otp = otp;
    user.forgot_password_expiry = new Date(Date.now() + 5 * 60 * 1000);
    await user.save();
    // Send OTP via email
    await sendEmail(user.email, parseInt(otp), user.name);
    res.status(200).json({ success: true, message: "OTP sent to email", otp });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// verifyotp 
export const verifyotp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }
    if (user.forgot_password_otp !== otp) {
      res.status(400).json({ success: false, message: "Invalid OTP" });
      return;
    }
    if (user.forgot_password_expiry && user.forgot_password_expiry < new Date()) {
      res.status(400).json({ success: false, message: "OTP has expired" });
      return;
    }
    user.isotpverified = true;
    user.forgot_password_otp = undefined;
    user.forgot_password_expiry = undefined;
    await user.save();
    res.status(200).json({ success: true, message: "OTP verified successfully" });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: (error as Error).message,
    });

  }
}

// reset password
export const resetpassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, newpassword } = req.body;


    const user = await User.findOne({ email });
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    if (!user.isotpverified) {
      res.status(400).json({ success: false, message: "OTP not verified" });
      return;
    }

    user.password = newpassword;
    user.forgot_password_otp = undefined;
    user.forgot_password_expiry = undefined;
    user.isotpverified = false;
    await user.save();

    res.status(200).json({ success: true, message: "Password reset successfully" });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: (error as Error).message,
    });
  }
};

// google login
export const googleAuth = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, mobile, image } = req.body;
    let user = await User.findOne({ email });
    if (!user) {
      user = new User({ name, email, mobile, image });
      await user.save();
    }
    const token = generateToken(user._id.toString());
    res.cookie("token", token, cookieOptions);
    res.status(200).json({
      success: true,
      message: "User logged in with Google successfully",
      id: user._id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      image: user.image,
      role: user.role,
    });


  } catch (error) {
    res.status(500).json({
      success: false,
      message: (error as Error).message,
    });
  }
}


// user controller 

export const getUserProfile = async (req: AuthRequest, res: Response) => {
  const userId = (req as any).userId;

  try {
    if (!req.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const user = await User.findById(userId)
      .select("-password -refresh_token -forgot_password_otp -forgot_password_expiry -isotpverified")
      .populate("address_details")
      .populate({
        path: "shopping_cart",
        populate: {
          path: "products.productId",
          model: "Product",
          populate: {
            path: "category",
            select: "name"
          }
        },
      })
      .populate({
        path: "orderHistory",
        populate: [
          {
            path: "products.productId",
            model: "Product",
            populate: {
              path: "category",
              select: "name"
            }
          },
          {
            path: "cart",
            model: "Cart",
            populate: {
              path: "products.productId",
              model: "Product",
              populate: {
                path: "category",
                select: "name"
              }
            }
          },
        ],
      });


    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, user });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};


//  get all users
export const getAllUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const users = await User.find().select(
      "-password -refresh_token -forgot_password_otp -forgot_password_expiry -isotpverified"
    ).populate("address_details")


    res.status(200).json({ success: true, users });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: (error as Error).message,
    });
  }
};

// user imge push 
export const userImage = async (req: AuthRequest, res: Response) => {
  try {
    if (req.userId !== req.params.id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }

    const imageUrl = await uploadClouinary(req.file.buffer);

    const user = await User.findByIdAndUpdate(
      req.userId,
      { image: imageUrl },
      { new: true }
    )
      .select("-password")
      .populate({
        path: "address_details",
        match: { userId: req.userId },
      })
      .populate({
        path: "shopping_cart",
        populate: {
          path: "products.productId",
          model: "Product",
          populate: {
            path: "category",
            select: "name"
          }
        },
      })
      .populate({
        path: "orderHistory",
        populate: [
          {
            path: "products.productId",
            model: "Product",
            populate: {
              path: "category",
              select: "name"
            }
          },
          {
            path: "cart",
            model: "Cart",
            populate: {
              path: "products.productId",
              model: "Product",
              populate: {
                path: "category",
                select: "name"
              }
            }
          },
        ],
      });

    res.status(200).json({
      success: true,
      message: "Profile image updated successfully",
      user,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// user update profile
export const updateUserProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.params.id;

    const {
      name,
      email,
      mobile,
      customerstatus,
      image,
      status,
      verify_email,
      role,
      date_of_birth,
      gender,
      address_data, // New: address information (object)
      address_details, // Alternative: address information (array)
    } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    // Update user profile fields
    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (mobile !== undefined) user.mobile = mobile;
    if (customerstatus !== undefined) user.customerstatus = customerstatus;
    if (image !== undefined) user.image = image;
    if (status !== undefined) user.status = status;
    if (verify_email !== undefined) user.verify_email = verify_email;
    if (role !== undefined) user.role = role;
    if (date_of_birth !== undefined) {
      // Handle both "MM/DD/YYYY" and "YYYY-MM-DD" formats
      let parsedDate: Date;

      if (date_of_birth.includes('/')) {
        // Format: "MM/DD/YYYY"
        const [month, day, year] = date_of_birth.split('/').map(Number);
        parsedDate = new Date(Date.UTC(year, month - 1, day));
      } else if (date_of_birth.includes('-')) {
        // Format: "YYYY-MM-DD"
        const [year, month, day] = date_of_birth.split('-').map(Number);
        parsedDate = new Date(Date.UTC(year, month - 1, day));
      } else {
        // Try to parse as-is
        parsedDate = new Date(date_of_birth);
      }

      // Only set if valid date
      if (!isNaN(parsedDate.getTime())) {
        user.date_of_birth = parsedDate;
      }
    }
    if (gender !== undefined) user.gender = gender;

    await user.save();

    // Handle address creation/update if address_data or address_details is provided
    // Support both formats: address_data (object) or address_details (array)
    let addressToProcess = address_data;

    // If address_details array is provided, use the first item
    if (!addressToProcess && address_details && Array.isArray(address_details) && address_details.length > 0) {
      addressToProcess = address_details[0];
    }

    if (addressToProcess) {
      const {
        _id: addressId,
        address_line,
        district,
        division,
        upazila_thana,
        country,
        pincode,
        mobile: addressMobile,
      } = addressToProcess;

      let savedAddress;

      // Determine the address ID to update
      // 1. Use provided ID if available
      // 2. OR fallback to the user's first existing address (prevent duplicates)
      let targetAddressId = addressId;

      if (!targetAddressId && user.address_details && user.address_details.length > 0) {
        targetAddressId = user.address_details[0];
      }

      if (targetAddressId) {
        // Try to update existing address
        savedAddress = await AddressModel.findOneAndUpdate(
          { _id: targetAddressId, userId: user._id },
          {
            address_line: address_line || "",
            district: district || "",
            division: division || "",
            upazila_thana: upazila_thana || "",
            country: country || "Bangladesh",
            pincode: pincode || "",
            mobile: addressMobile || mobile || null,
          },
          { new: true }
        );

        // If address not found (wrong ID or belongs to different user), create new one
        if (!savedAddress) {
          const newAddress = new AddressModel({
            address_line: address_line || "",
            district: district || "",
            division: division || "",
            upazila_thana: upazila_thana || "",
            country: country || "Bangladesh",
            pincode: pincode || "",
            mobile: addressMobile || mobile || null,
            userId: user._id,
          });

          savedAddress = await newAddress.save();

          // Add address reference to user's address_details array
          if (!user.address_details.includes(savedAddress._id)) {
            user.address_details.push(savedAddress._id);
            await user.save();
          }
        }
      } else {
        // Create new address
        const newAddress = new AddressModel({
          address_line: address_line || "",
          district: district || "",
          division: division || "",
          upazila_thana: upazila_thana || "",
          country: country || "Bangladesh",
          pincode: pincode || "",
          mobile: addressMobile || mobile || null,
          userId: user._id,
        });

        savedAddress = await newAddress.save();

        // Add address reference to user's address_details array if not already present
        if (!user.address_details.includes(savedAddress._id)) {
          user.address_details.push(savedAddress._id);
          await user.save();
        }
      }
    }

    // Populate user data before sending response
    const populatedUser = await User.findById(userId)
      .select("-password -refresh_token -forgot_password_otp -forgot_password_expiry -isotpverified")
      .populate("address_details")
      .populate({
        path: "shopping_cart",
        populate: {
          path: "products.productId",
          model: "Product",
          populate: {
            path: "category",
            select: "name"
          }
        },
      })
      .populate({
        path: "orderHistory",
        populate: [
          {
            path: "products.productId",
            model: "Product",
            populate: {
              path: "category",
              select: "name"
            }
          },
          {
            path: "cart",
            model: "Cart",
            populate: {
              path: "products.productId",
              model: "Product",
              populate: {
                path: "category",
                select: "name"
              }
            }
          },
        ],
      });

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: populatedUser,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: (error as Error).message,
    });
  }
};



// delete user
export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.params.id;
    const user = await User.findById(userId).session(session);
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    // Delete associated data
    await AddressModel.deleteMany({ userId: user._id }).session(session);
    await CartModel.deleteMany({ userId: user._id }).session(session);
    await OrderModel.deleteMany({ userId: user._id }).session(session);
    await WishlistModel.deleteMany({ userId: user._id }).session(session);
    await Review.deleteMany({ userId: user._id }).session(session);

    // Delete the user
    await User.findByIdAndDelete(userId, { session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ success: true, message: "User deleted successfully" });
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};


