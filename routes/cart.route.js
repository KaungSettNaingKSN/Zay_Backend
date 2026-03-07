import {Router} from 'express'
import auth from '../middleware/auth.js';
import { addToCartItemController, deleteCartItemController, getCartItemController, updateCartItemController, updateCartVariantsController } from '../controllers/cart.controller.js';

const cartRouter = Router();
cartRouter.post('/create', auth, addToCartItemController)
cartRouter.get('/', auth, getCartItemController)
cartRouter.put('/update', auth, updateCartItemController)
cartRouter.put    ('/update-variants', auth, updateCartVariantsController) 
cartRouter.delete('/delete', auth, deleteCartItemController)

export default cartRouter