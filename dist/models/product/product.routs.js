"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const product_controllers_1 = require("./product.controllers");
const productRouter = (0, express_1.Router)();
productRouter.post("/create", product_controllers_1.createProductController);
productRouter.post('/get', product_controllers_1.getProductController);
productRouter.post("/get-product-by-category", product_controllers_1.getProductByCategory);
productRouter.post('/get-pruduct-by-category-and-subcategory', product_controllers_1.getProductByCategoryAndSubCategory);
productRouter.post('/get-product-details', product_controllers_1.getProductDetails);
//update product
productRouter.put('/update-product-details', product_controllers_1.updateProductDetails);
//delete product
productRouter.delete('/delete-product', product_controllers_1.deleteProductDetails);
//search product 
productRouter.post('/search-product', product_controllers_1.searchProduct);
exports.default = productRouter;
