import mongoose from "mongoose";
import dotenv from "dotenv";
import productModel from "./src/models/product/product.model";

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URL as string);
  const search = "borka";
  const products = await productModel.find({ 
    productName: { $regex: search, $options: "i" } 
  }).select("productName sku tags").limit(10).lean();
  console.log("Found products with borka:", JSON.stringify(products, null, 2));
  process.exit(0);
}
run();
