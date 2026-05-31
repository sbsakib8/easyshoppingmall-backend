import jwt from "jsonwebtoken"
import processdata from "../config"

const generateToken = (id: string) => {
  return jwt.sign({ userId: id }, processdata.jwtsecret, {
    expiresIn: "30d",
  });
};

export default generateToken;
