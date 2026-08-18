import { Types } from "mongoose";

export interface IPayment {
  orderId: Types.ObjectId;
  userId: Types.ObjectId;

  provider: "sslcommerz" | "manual";
  payment_type: "full" | "delivery";

  payable_amount: number;
  paid_amount: number;

  currency: "BDT";
  status: "initiated" | "paid" | "failed";

  tran_id: string;
  gateway_response?: any;
}
