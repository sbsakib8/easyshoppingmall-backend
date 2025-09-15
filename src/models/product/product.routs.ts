import { Router } from 'express'
import { createProductController, deleteProductDetails, getProductByCategory, getProductByCategoryAndSubCategory, getProductController, getProductDetails, searchProduct, updateProductDetails } from './product.controllers'

const productRouter = Router()

productRouter.post("/create",createProductController)
productRouter.post('/get',getProductController)
productRouter.post("/get-product-by-category",getProductByCategory)
productRouter.post('/get-pruduct-by-category-and-subcategory',getProductByCategoryAndSubCategory)
productRouter.post('/get-product-details',getProductDetails)

//update product
productRouter.put('/update-product-details',updateProductDetails)

//delete product
productRouter.delete('/delete-product',deleteProductDetails)

//search product 
productRouter.post('/search-product',searchProduct)

export default productRouter