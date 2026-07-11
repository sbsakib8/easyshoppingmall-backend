import { Router } from 'express'
import { isAdmin } from '../../middlewares/isAdmin'
import { isAuth } from '../../middlewares/isAuth'
import { isDashboardAccess } from '../../middlewares/isDashboardAccess'
import { upload } from '../../middlewares/multer'
import {
  createProductController,
  deleteProductDetails,
  getProductByCategory,
  getProductByCategoryAndSubCategory,
  getProductController,
  getProductDetails,
  imageSearchProduct,
  searchProduct,
  updateProductDetails,
} from './product.controllers'

const productRouter = Router()

productRouter.post("/create", isAuth, isDashboardAccess("products"), upload.fields([
    { name: 'images', maxCount: 4 },
    { name: 'video', maxCount: 1 }
]), createProductController)
productRouter.post('/get', getProductController)
productRouter.post("/get-product-by-category", getProductByCategory)
productRouter.post('/get-pruduct-by-category-and-subcategory', getProductByCategoryAndSubCategory)
productRouter.get('/get-product-details/:productId', getProductDetails)

// update product
productRouter.put('/update-product-details', isAuth, isDashboardAccess("products"), updateProductDetails)

// delete product
productRouter.delete('/delete-product', isAuth, isDashboardAccess("products"), deleteProductDetails)

// text / sky-title search
productRouter.post('/search-product', searchProduct)

// image search (uses sharp locally – no Cloudinary)
productRouter.post('/image-search', upload.single('searchImage'), imageSearchProduct)

export default productRouter