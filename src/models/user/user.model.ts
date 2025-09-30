import mongoose, { Document, Schema , Types  } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  mobile?: string | null;
  refresh_token?: string;
  verify_email?: boolean;
  last_login_date?: Date | null;
  status: "Active" | "Inactive" | "Suspended";
  address_details: Types.ObjectId[];
  shopping_cart: Types.ObjectId[];
  orderHistory: Types.ObjectId[];
  forgot_password_otp?: string | null;
  forgot_password_expiry?: Date | null;
  isotpverified?: boolean;
  role: "ADMIN" | "USER";
  createdAt?: Date;
  updatedAt?: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema: Schema<IUser> = new mongoose.Schema(
  {
    name: { 
      type: String,
       required: true 
      },
    email: { 
      type: String,
      required: true,
      unique: true },
    password: { 
      type: String, 
     },
    mobile : {
        type : String,
        default : null
    },
    refresh_token : {
        type : String,
        default : ""
    },
    verify_email : {
        type : Boolean,
        default : false
    },
    last_login_date : {
        type : Date,
        default : ""
    },
    status : {
        type : String,
        enum : ["Active","Inactive","Suspended"],
        default : "Active"
    },
    address_details : [
        {
            type : mongoose.Schema.ObjectId,
            ref : 'address'
        }
    ],
    shopping_cart : [
        {
            type : mongoose.Schema.ObjectId,
            ref : 'cartProduct'
        }
    ],
    orderHistory : [
        {
            type : mongoose.Schema.ObjectId,
            ref : 'order'
        }
    ],
    forgot_password_otp : {
        type : String,
        default : null
    },
    forgot_password_expiry : {
        type : Date,
        default : ""
    },
    isotpverified : {
        type : Boolean,
        default : false
    },
    role : {
        type : String,
        enum : ['ADMIN',"USER"],
        default : "USER"
    }
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword: string) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model<IUser>("User", userSchema);
