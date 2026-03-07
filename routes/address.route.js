import {Router} from 'express'
import auth from '../middleware/auth.js';
import { addAddressController, selectAddressController, deleteAddressController, editAddressController} from '../controllers/address.controller.js';

const addressRouter = Router();
addressRouter.post('/create', auth, addAddressController)
addressRouter.put   ('/edit', auth, editAddressController) 
addressRouter.put('/select/:id', auth, selectAddressController)
addressRouter.delete('/delete', auth, deleteAddressController)

export default addressRouter