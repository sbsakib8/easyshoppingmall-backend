import mongoose from "mongoose";
import User from "./src/models/user/user.model";
import VideoAccess from "./src/models/videoAccess/videoAccess.model";
import dotenv from "dotenv";

dotenv.config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL || "");
        console.log("Connected to MongoDB successfully.");

        // 1. Find the user with balance 581 or a balance between 580 and 582
        const users = await User.find({
            $or: [
                { balance: 581 },
                { balance: { $gt: 580, $lt: 582 } }
            ]
        });

        console.log(`Found ${users.length} users with balance ~581:`);
        for (const user of users) {
            // Find video referrals for this user
            const referredUsers = await User.find({ referredBy: user._id });
            const referredIds = referredUsers.map(u => u._id);

            const videoAccessReferrals = await VideoAccess.find({
                $or: [
                    { userId: { $in: referredIds } },
                    { referredBy: user._id }
                ],
                courseId: { $ne: null }
            }).populate("courseId");

            const approvedReferrals = videoAccessReferrals.filter(v => v.status === "approved");
            const approvedBonus = approvedReferrals.reduce((sum, v: any) => sum + (v.courseId?.referralBonus || 0), 0);

            console.log({
                _id: user._id,
                name: user.name,
                email: user.email,
                balance: user.balance,
                referralCode: user.referralCode,
                referralsCount: referredUsers.length,
                totalApprovedVideoBonus: approvedBonus,
                videoReferralsCount: videoAccessReferrals.length,
                approvedVideoReferralsCount: approvedReferrals.length
            });
        }

        // If no user found, let's look for users with videoReferral bonus or list first 10 users with their balances
        if (users.length === 0) {
            console.log("No users found with balance ~581. Listing top 10 users with positive balance:");
            const positiveUsers = await User.find({ balance: { $gt: 0 } }).limit(10);
            console.log(positiveUsers.map(u => ({
                name: u.name,
                email: u.email,
                balance: u.balance,
                referralCode: u.referralCode
            })));
        }

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

run();
