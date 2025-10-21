import { Router } from 'express'
import { createProductController, deleteProductDetails, getProductByCategory, getProductByCategoryAndSubCategory, getProductController, getProductDetails, searchProduct, updateProductDetails } from './product.controllers'
import { isAuth } from '../../middlewares/isAuth'
import { isAdmin } from '../../middlewares/isAdmin'
import { upload } from '../../middlewares/multer'

const productRouter = Router()

productRouter.post("/create",isAuth,isAdmin,upload.array("images", 4),createProductController)
productRouter.post('/get',getProductController)
productRouter.post("/get-product-by-category",getProductByCategory)
productRouter.post('/get-pruduct-by-category-and-subcategory',getProductByCategoryAndSubCategory)
productRouter.post('/get-product-details',getProductDetails)

//update product
productRouter.put('/update-product-details',isAuth,isAdmin,updateProductDetails)

//delete product
productRouter.delete('/delete-product',isAuth,isAdmin,deleteProductDetails)

//search product 
productRouter.post('/search-product',searchProduct)

export default productRouter