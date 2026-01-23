import { Router } from 'express'
import { isAdmin } from '../../middlewares/isAdmin'
import { isAuth } from '../../middlewares/isAuth'
import { upload } from '../../middlewares/multer'
import { createProductController, deleteProductDetails, getProductByCategory, getProductByCategoryAndSubCategory, getProductController, getProductDetails, searchProduct, updateProductDetails } from './product.controllers'

const productRouter = Router()

productRouter.post("/create", isAuth, isAdmin, upload.fields([
    { name: 'images', maxCount: 4 },
    { name: 'video', maxCount: 1 }
]), createProductController)
productRouter.post('/get', getProductController)
productRouter.post("/get-product-by-category", getProductByCategory)
productRouter.post('/get-pruduct-by-category-and-subcategory', getProductByCategoryAndSubCategory)
productRouter.post('/get-product-details/:productId', getProductDetails)

//update product
productRouter.put('/update-product-details', isAuth, isAdmin, updateProductDetails)

//delete product
productRouter.delete('/delete-product', isAuth, isAdmin, deleteProductDetails)

//search product 
productRouter.post('/search-product', searchProduct)

export default productRouter