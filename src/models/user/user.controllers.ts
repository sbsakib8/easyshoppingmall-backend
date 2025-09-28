import type { Request, Response } from "express";
import User from "../user/user.model";
import type { IUser } from "../user/user.model";
import generateToken from "../../utils/genaretetoken";

// Cookie 
const cookieOptions = {
  httpOnly: true, 
  secure: process.env.NODE_ENV === "production", 
  sameSite: "strict" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, 
};

// Register User
export const registerUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400).json({ message: "User already exists", success: false });
      return;
    }

    const user: IUser = await User.create({ name, email, password });
    const token = generateToken(user.id);

    //  cookie
    res.cookie("token", token, cookieOptions);

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
export const authUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (user && (await user.comparePassword(password))) {
      const token = generateToken(user.id);

      res.cookie("token", token, cookieOptions);

      res.json({
        success: true,       
        message: "User Signin successfully",
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      });
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Get User Profile (password excluded)
export const getUserProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
