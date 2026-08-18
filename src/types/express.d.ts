import { AuthUser } from "../models/order/interface";

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
