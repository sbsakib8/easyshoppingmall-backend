"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const product_controllers_1 = require("./product.controllers");
const isAuth_1 = require("../../middlewares/isAuth");
const isAdmin_1 = require("../../middlewares/isAdmin");
const multer_1 = require("../../middlewares/multer");
const productRouter = (0, express_1.Router)();
productRouter.post("/create", isAuth_1.isAuth, isAdmin_1.isAdmin, multer_1.upload.array("images", 4), product_controllers_1.createProductController);
productRouter.post('/get', isAuth_1.isAuth, isAdmin_1.isAdmin, product_controllers_1.getProductController);
productRouter.post("/get-product-by-category", isAuth_1.isAuth, isAdmin_1.isAdmin, product_controllers_1.getProductByCategory);
productRouter.post('/get-pruduct-by-category-and-subcategory', isAuth_1.isAuth, isAdmin_1.isAdmin, product_controllers_1.getProductByCategoryAndSubCategory);
productRouter.post('/get-product-details', isAuth_1.isAuth, isAdmin_1.isAdmin, product_controllers_1.getProductDetails);
//update product
productRouter.put('/update-product-details', isAuth_1.isAuth, isAdmin_1.isAdmin, product_controllers_1.updateProductDetails);
//delete product
productRouter.delete('/delete-product', isAuth_1.isAuth, isAdmin_1.isAdmin, product_controllers_1.deleteProductDetails);
//search product 
productRouter.post('/search-product', isAuth_1.isAuth, isAdmin_1.isAdmin, product_controllers_1.searchProduct);
exports.default = productRouter;
