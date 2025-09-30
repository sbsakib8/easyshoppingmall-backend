import type { Request, Response } from "express";
import User from "../user/user.model";
import type { IUser } from "../user/user.model";
import generateToken from "../../utils/genaretetoken";
import { sendEmail } from "../../utils/nodemailer";
import { AuthRequest } from "../../middlewares/isauth";

// Cookie 
const cookieOptions = {
  httpOnly: true, 
  secure: false, 
  sameSite: "strict" as const,
  maxAge: 30 * 24 * 60 * 60 * 1000, 
};

// Register User
export const signUp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400).json({ message: "User already exists", success: false });
      return;
    }

    const user: IUser = await User.create({ name, email, password });
    const token = generateToken(user._id.toString());
    //  cookie
     res.cookie("token", token,{
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", 
    sameSite: "lax", 
    maxAge: 30 * 24 * 60 * 60 * 1000, 
  });;


    res.status(201).json({
       success: true,       
        message: "User registered successfully",
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
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
    if(!user){
      res.status(401).json({ message: "user does not exist" });
      return;
    }
    const ismatch = await user.comparePassword(password);
    if(!ismatch){
      res.status(401).json({ message: "incorrect password" });
      return;
    }   
      const token = generateToken(user._id.toString());

      res.cookie("token", token,{
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", 
    sameSite: "lax", 
    maxAge: 30 * 24 * 60 * 60 * 1000, 
  });;

      res.json({
        success: true,       
        message: "User Signin successfully",
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      });
    
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Sign out user
export const signOut = async (req: Request, res: Response): Promise<void> => {
  try {
    res.clearCookie("token");

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
    const { name, email, mobile , image } = req.body;
    let user = await User.findOne({ email });
    if (!user) {
      user = new User({ name, email, mobile ,image });
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

export const getUserProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const user = await User.findById(userId).select(
      "-password -refresh_token -forgot_password_otp -forgot_password_expiry -isotpverified"
    );

    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: (error as Error).message,
    });
  }
};