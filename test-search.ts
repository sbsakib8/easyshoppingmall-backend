import mongoose from "mongoose";
import dotenv from "dotenv";
import productModel from "./src/models/product/product.model";

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URL as string);
  console.log("Connected to MongoDB");

  const search = "shirt"; // change as needed
  const query = {
    publish: true,
    $or: [
      { productName: { $regex: search, $options: "i" } },
      { sku: { $regex: search, $options: "i" } },
      { tags: { $regex: search, $options: "i" } },
      { brand: { $regex: search, $options: "i" } }
    ]
  };

  const count = await productModel.countDocuments(query);
  console.log("Matched items for text search:", count);

  // Test color search
  const colors = ["blue"];
  const regexColors = colors.map((c) => new RegExp(c, "i"));
  const colorQuery = {
    publish: true,
    $or: [
      { color: { $in: regexColors } },
      { tags: { $in: regexColors } },
      { productName: { $in: regexColors } }
    ]
  };
  const colorCount = await productModel.countDocuments(colorQuery);
  console.log("Matched items for color search:", colorCount);

  process.exit(0);
}
run();
