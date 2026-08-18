import mongoose from "mongoose";
import dotenv from "dotenv";
import productModel from "./src/models/product/product.model";

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URL as string);
  const products = await productModel.find({ publish: true }).select("sku productName").limit(5).lean();
  console.log("Sample SKUs:", products);
  process.exit(0);
}
run();
