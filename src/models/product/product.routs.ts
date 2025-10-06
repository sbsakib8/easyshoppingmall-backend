import { Router } from 'express'
import { createProductController, deleteProductDetails, getProductByCategory, getProductByCategoryAndSubCategory, getProductController, getProductDetails, searchProduct, updateProductDetails } from './product.controllers'
import { isAuth } from '../../middlewares/isAuth'
import { isAdmin } from '../../middlewares/isAdmin'

const productRouter = Router()

productRouter.post("/create",isAuth,isAdmin,createProductController)
productRouter.post('/get',isAuth,isAdmin,getProductController)
productRouter.post("/get-product-by-category",isAuth,isAdmin,getProductByCategory)
productRouter.post('/get-pruduct-by-category-and-subcategory',isAuth,isAdmin,getProductByCategoryAndSubCategory)
productRouter.post('/get-product-details',isAuth,isAdmin,getProductDetails)

//update product
productRouter.put('/update-product-details',isAuth,isAdmin,updateProductDetails)

//delete product
productRouter.delete('/delete-product',isAuth,isAdmin,deleteProductDetails)

//search product 
productRouter.post('/search-product',isAuth,isAdmin,searchProduct)

export default productRouter