import {Router} from 'express'
import auth from '../middleware/auth.js';
import upload from '../middleware/multer.js';
import { createProduct, deleteProduct, getProductByMultipleCategories, deleteProductRam, updateProductRam, getProductRam, deleteMultipleProduct, getFeaturedProduct, getProduct, getProductByCategoryId, getProductByCategoryName, getProductByPrice, getProductByRating, getProductBySubCategoryId, getProductBySubCategoryName, getProductByThirdSubCategoryId, getProductByThirdSubCategoryName, getProductCount, getSingleProduct, removeImageFromCloudinary, updateProduct, uploadImages, createProductRam, updateProductColor, createProductColor, deleteProductColor, getProductColor, getProductSize, getProductWeight, createProductSize, createProductWeight, deleteProductSize, deleteProductWeight, updateProductSize, updateProductWeight, searchProducts, getTopRatedProducts, getBestSellerProducts } from '../controllers/product.controller.js';
import { get } from 'http';
import { getSearchSuggestions, getTrendingKeywords } from '../controllers/search.controller.js';

const productRouter = Router();

productRouter.get('/', getProduct)
productRouter.get('/byCategoryId/:id', getProductByCategoryId)
productRouter.get('/byCategoryName', getProductByCategoryName)
productRouter.get('/bySubCategoryId/:id', getProductBySubCategoryId)
productRouter.get('/bySubCategoryName', getProductBySubCategoryName)
productRouter.get('/byThirdSubCategoryId/:id', getProductByThirdSubCategoryId)
productRouter.get('/byThirdSubCategoryName', getProductByThirdSubCategoryName)
productRouter.get('/byMultipleCategories',      getProductByMultipleCategories)
productRouter.get('/byPrice', getProductByPrice)
productRouter.get('/byRating', getProductByRating)
productRouter.get('/featuredProduct', getFeaturedProduct)
productRouter.get('/productRam', getProductRam)
productRouter.get('/productColor', getProductColor)
productRouter.get('/productSize', getProductSize)
productRouter.get('/productWeight', getProductWeight)
productRouter.get('/count', getProductCount)
productRouter.get('/search', searchProducts)
productRouter.get('/trending',    getTrendingKeywords)
productRouter.get('/suggestions', getSearchSuggestions)
productRouter.get('/topRated', getTopRatedProducts)
productRouter.get('/bestSellers', getBestSellerProducts)
productRouter.get('/:id', getSingleProduct)

productRouter.post('/create', auth, createProduct)
productRouter.post('/addProductRam', auth, createProductRam)
productRouter.post('/addProductColor', auth, createProductColor)
productRouter.post('/addProductSize', auth, createProductSize)
productRouter.post('/addProductWeight', auth, createProductWeight)
productRouter.post('/uploadImages', auth, upload.array('images'), uploadImages)

productRouter.delete('/delete-image', auth, removeImageFromCloudinary)
productRouter.delete('/deleteMultiple', auth, deleteMultipleProduct)
productRouter.delete('/productRam/:id', auth, deleteProductRam)
productRouter.delete('/productColor/:id', auth, deleteProductColor)
productRouter.delete('/productSize/:id', auth, deleteProductSize)
productRouter.delete('/productWeight/:id', auth, deleteProductWeight)
productRouter.delete('/:id', auth, deleteProduct)

productRouter.put('/updateProductRam/:id', auth, updateProductRam)
productRouter.put('/updateProductColor/:id', auth, updateProductColor)
productRouter.put('/updateProductSize/:id', auth, updateProductSize)
productRouter.put('/updateProductWeight/:id', auth, updateProductWeight)
productRouter.put('/:id', auth, updateProduct)

export default productRouter