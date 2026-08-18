import mongoose from "mongoose";
import dotenv from "dotenv";
import productModel from "./src/models/product/product.model";

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URL as string);
  const search = "dubai";
  const products = await productModel.find({ 
    $text: { $search: search }
  }).select("productName sku tags description").limit(10).lean();
  console.log("Found products with dubai (text search):", JSON.stringify(products, null, 2));

  const allProducts = await productModel.find({ publish: true }).select("productName").lean();
  console.log("All product names:", allProducts.map(p => p.productName));
  process.exit(0);
}
run();
