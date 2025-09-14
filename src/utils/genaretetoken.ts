import jwt from "jsonwebtoken"
import processdata from "../config";
const generateToken = (id: string) => {
  return jwt.sign({ id },processdata.jwtsecret, { expiresIn: "30d" });
};

export default generateToken;
