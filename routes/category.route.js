import {Router} from 'express'
import auth from '../middleware/auth.js';
import upload from '../middleware/multer.js';
import { createCategory, deleteCategory, getCategory, getCategoryCount, getSingleCategory, getSubCategoryCount, removeImageFromCloudinary, updatedCategory, uploadImages } from '../controllers/category.controller.js';

const categoryRouter = Router();
categoryRouter.get('/', getCategory)
categoryRouter.get('/count', getCategoryCount)
categoryRouter.delete('/delete-image', auth, removeImageFromCloudinary)
categoryRouter.get('/sub-count', getSubCategoryCount)
categoryRouter.post('/uploadImages', auth, upload.array('images'), uploadImages)
categoryRouter.post('/create', auth, createCategory)
categoryRouter.delete('/:id', auth, deleteCategory)
categoryRouter.put('/:id', auth, updatedCategory)
categoryRouter.get('/:id', getSingleCategory)



export default categoryRouter