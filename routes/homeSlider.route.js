import {Router} from 'express'
import auth from '../middleware/auth.js';
import upload from '../middleware/multer.js';
import { createHomeSlider, deleteHomeSlider, getHomeSlider, removeImageFromCloudinary, updatedHomeSlider, uploadImages } from '../controllers/homeSlider.controller.js';

const homeSliderRouter = Router();
homeSliderRouter.get('/', getHomeSlider)
homeSliderRouter.delete('/delete-image', auth, removeImageFromCloudinary)
homeSliderRouter.post('/uploadImages', auth, upload.array('images'), uploadImages)
homeSliderRouter.post('/create', auth, createHomeSlider)
homeSliderRouter.delete('/:id', auth, deleteHomeSlider)
homeSliderRouter.put('/:id', auth, updatedHomeSlider)



export default homeSliderRouter