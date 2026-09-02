import nodemailer from 'nodemailer'
import processdata from '../config';

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: processdata.email,
    pass: processdata.pass,
  },
});

export const sendEmail = async (to: string, otp: number, username?: string) => {
  try {
    await transporter.sendMail({
      from: processdata.email,
      to,
      subject: "Reset your password - EasyShoppingMall",
      text: `প্রিয় ${username || "User"}, আপনার OTP হলো: ${otp}. এটি ৫ মিনিটের জন্য বৈধ।`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2>🔑 আপনার OTP কোড</h2>
          <p>প্রিয় ${username || "User"},</p>
          <p>আপনার পাসওয়ার্ড রিসেট করার জন্য নিচে একবার ব্যবহারযোগ্য OTP কোড দেওয়া হলো:</p>
          <div style="background:#f4f4f4; padding:15px; border-radius:8px; text-align:center; font-size:20px; font-weight:bold;">
            ${otp}
          </div>
          <p style="margin-top:10px; color:#555;">
            ⏳ এই কোডটি <b>৫ মিনিট</b> পর্যন্ত বৈধ থাকবে।  
          </p>
          <p>যদি আপনি এই অনুরোধ না করে থাকেন, তাহলে দয়া করে ইমেইলটি উপেক্ষা করুন অথবা আমাদের সাপোর্ট টিমকে জানাতে ভুলবেন না।</p>
          <br>
          <p>শুভেচ্ছান্তে,<br>EasyShoppingMall সাপোর্ট টিম</p>
          <p>📩 ${processdata.email}</p>
        </div>
      `,
    });
  } catch (error: any) {
    if (error?.code === 'EAUTH' || error?.responseCode === 535 || error?.message?.includes('535')) {
      throw new Error("Gmail SMTP Authentication failed. Please generate and set a new Google App Password in server environment variable (APP_PASS).");
    }
    throw error;
  }
};

