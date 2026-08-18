import jwt from "jsonwebtoken"
import processdata from "../config"

const generateToken = (id: string, tokenVersion: number) => {
  return jwt.sign({ userId: id, tokenVersion }, processdata.jwtsecret, {
    expiresIn: "30d",
  });
};

export default generateToken;
