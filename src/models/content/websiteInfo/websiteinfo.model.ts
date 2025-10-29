import mongoose, { Schema, Document } from "mongoose";

export interface ISocialLink {
  platform: string; // e.g., "Facebook", "Twitter"
  icon?: string;    // optional icon name/class
  url: string;      // e.g., "https://facebook.com/yourpage"
  active: boolean;
}

export interface IWebsiteInfo extends Document {
  // 🔹 Top Bar Section
  offerText: string;          // e.g., "FREE delivery & 40% Discount..."
  countdownDays: number;      // e.g., 40
  countdownHours: number;     // e.g., 0
  countdownMinutes: number;   // e.g., 23
  countdownSeconds: number;   // e.g., 13
  countdownTargetDate?: Date; // target datetime from frontend
  deliveryText: string;       // e.g., "7:00 to 22:00"
  supportContact: string;     // e.g., "+258 3268 21485"

  // 🔹 Discount / Sale Section
  discountTitle: string;      // e.g., "Get 30% Discount Now"
  discountLabel: string;      // e.g., "Sale"
  discountPercent: number;    // e.g., 30
  discountLink?: string;      // e.g., "/shop"

  // 🔹 Footer Section
  address: string;            // e.g., "123 Main St, City, Country"
  email: string;              // e.g., "info@example.com"
  number: string;             // e.g., "+1234567890"

  // 🔹 Social Media Links
  socialLinks: ISocialLink[];

  // 🔹 General Control
  active: boolean;
}

const SocialLinkSchema = new Schema<ISocialLink>(
  {
    platform: { type: String, required: true },
    icon: { type: String },
    url: { type: String, required: true },
    active: { type: Boolean, default: true },
  },
  { _id: false }
);

const WebsiteInfoSchema = new Schema<IWebsiteInfo>(
  {
    offerText: { type: String, required: true },
    countdownDays: { type: Number, default: 0 },
    countdownHours: { type: Number, default: 0 },
    countdownMinutes: { type: Number, default: 0 },
    countdownSeconds: { type: Number, default: 0 },
    countdownTargetDate: { type: Date },
    deliveryText: { type: String, default: "" },
    supportContact: { type: String, default: "" },

    discountTitle: { type: String, required: true },
    discountLabel: { type: String, default: "Sale" },
    discountPercent: { type: Number, required: true },
    discountLink: { type: String },

    address: { type: String, required: true },
    email: { type: String, required: true },
    number: { type: String, required: true },

    socialLinks: { type: [SocialLinkSchema], default: [] },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<IWebsiteInfo>("WebsiteInfo", WebsiteInfoSchema);
