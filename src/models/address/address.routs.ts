import { Router } from 'express'
import { isAuth } from '../../middlewares/isAuth'
import { addAddressController, deleteAddressController, getAddressController, updateAddressController } from '../address/address.controllers'

const addressRouter = Router()

addressRouter.post('/create', isAuth, addAddressController)
addressRouter.get("/get", isAuth, getAddressController)
addressRouter.put('/update', isAuth, updateAddressController)
addressRouter.delete("/disable", isAuth, deleteAddressController)

export default addressRouter