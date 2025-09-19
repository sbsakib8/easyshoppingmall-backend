import { Router } from 'express'
import { addAddressController, deleteAddressController, getAddressController, updateAddressController } from '../address/address.controllers'

const addressRouter = Router()

addressRouter.post('/create',addAddressController)
addressRouter.get("/get",getAddressController)
addressRouter.put('/update',updateAddressController)
addressRouter.delete("/disable",deleteAddressController)

export default addressRouter