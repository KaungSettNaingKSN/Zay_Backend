import {Router} from 'express'
import auth from '../middleware/auth.js';
import { addToMyListController, checkMyListController, deleteMyListController, getMyListController } from '../controllers/myList.controller.js';

const myListRouter = Router();
myListRouter.post  ('/create',           auth, addToMyListController)
myListRouter.get   ('/',                 auth, getMyListController)
myListRouter.get   ('/check/:productId', auth, checkMyListController)
myListRouter.delete('/:id',             auth, deleteMyListController)

export default myListRouter