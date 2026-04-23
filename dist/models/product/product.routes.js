"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const isAdmin_1 = require("../../middlewares/isAdmin");
const isAuth_1 = require("../../middlewares/isAuth");
const multer_1 = require("../../middlewares/multer");
const product_controllers_1 = require("./product.controllers");
const productRouter = (0, express_1.Router)();
productRouter.post("/create", isAuth_1.isAuth, isAdmin_1.isAdmin, multer_1.upload.fields([
    { name: 'images', maxCount: 4 },
    { name: 'video', maxCount: 1 }
]), product_controllers_1.createProductController);
productRouter.post('/get', product_controllers_1.getProductController);
productRouter.post("/get-product-by-category", product_controllers_1.getProductByCategory);
productRouter.post('/get-pruduct-by-category-and-subcategory', product_controllers_1.getProductByCategoryAndSubCategory);
productRouter.post('/get-product-details/:productId', product_controllers_1.getProductDetails);
//update product
productRouter.put('/update-product-details', isAuth_1.isAuth, isAdmin_1.isAdmin, product_controllers_1.updateProductDetails);
//delete product
productRouter.delete('/delete-product', isAuth_1.isAuth, isAdmin_1.isAdmin, product_controllers_1.deleteProductDetails);
//search product 
productRouter.post('/search-product', product_controllers_1.searchProduct);
exports.default = productRouter;
