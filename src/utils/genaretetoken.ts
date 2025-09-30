import jwt from "jsonwebtoken"
import processdata from "../config";
const generateToken = async (userId: string) => {
     const token = await jwt.sign({ id: userId }, processdata.jwtsecret, {
        expiresIn: "30d",
      });
      return token;
  
};

export default generateToken;
