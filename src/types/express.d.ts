import { AuthUser } from "../modules/order/interface";

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
