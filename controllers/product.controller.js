import ProductModel from "../models/product.model.js";
import { v2 as cloudinary } from 'cloudinary'
import fs, { access } from 'fs';
import ProductRamModel from "../models/productRam.model.js";
import ProductColorModel from "../models/productColor.model.js";
import ProductSizeModel from "../models/productSize.model.js";
import ProductWeightModel from "../models/productWeight.model.js";
import OrderModel from "../models/order.model.js"
import e from "express";

cloudinary.config({ 
  cloud_name: process.env.cloudinary_Config_Cloud_Name, 
  api_key: process.env.cloudinary_Config_api_key, 
  api_secret: process.env.cloudinary_Config_api_secret,
  secure: true
});

var ImageArr=[];
export async function uploadImages(req, res) {
    try {
        ImageArr = [];
        const image = req.files;

        const options = {
            use_filename: true,
            unique_filename: true,
            overwrite: false
        }
        for (let i = 0; i < image?.length; i++) {
            const img = await cloudinary.uploader.
            upload(
                image[i].path,
                options,
                function(error, result){
                    ImageArr.push(result.secure_url);
                    fs.unlinkSync(`uploads/${req.files[i].filename}`);
                    console.log(req.files[i].filename);
                }
            )
        }
        
        return res.status(200).json({
            image: ImageArr,
            error: false,
            success: true,
        })
    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}


export async function searchProducts(req, res) {
  try {
    const q       = req.query.q?.trim() || '';
    const page    = parseInt(req.query.page)    || 1;
    const perPage = parseInt(req.query.perPage) || 10;

    const filter = q
      ? {
          $or: [
            { name:        { $regex: q, $options: 'i' } },
            { brand:       { $regex: q, $options: 'i' } },
            { description: { $regex: q, $options: 'i' } },
            { catName:     { $regex: q, $options: 'i' } },
            { subCatName:  { $regex: q, $options: 'i' } },
          ],
        }
      : {};

    const totalPosts = await ProductModel.countDocuments(filter);
    const totalPages = Math.ceil(totalPosts / perPage) || 1;

    const product = await ProductModel.find(filter)
      .populate('category')
      .populate('productColor')
      .sort({ createdAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .exec();

    return res.status(200).json({
      message: 'Success',
      error: false,
      success: true,
      product,
      totalPages,
      page,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || error,
      error: true,
      success: false,
    });
  }
}

export async function createProduct(req, res) {
    try {
        let product = new ProductModel({
            name: req.body.name,
            images: ImageArr,
            description: req.body.description,
            brand: req.body.brand,
            price: req.body.price,
            oldPrice: req.body.oldPrice,
            catName: req.body.catName,
            catId: req.body.catId,
            subCatId: req.body.subCatId,
            subCatName: req.body.subCatName,
            thirdsubCatId: req.body.thirdsubCatId,
            thirdsubCatName: req.body.thirdsubCatName,
            countInStock: req.body.countInStock,
            rating: req.body.rating,
            isFeatured: req.body.isFeatured,
            discount: req.body.discount,
            productRam: req.body.productRam,
            size: req.body.size,
            productWeight: req.body.productWeight,
            productColor: req.body.productColor,
        })

        if (!product) {
            return res.status(500).json({
                message: 'Something wrong',
                error: true,
                success: false
            })
        }

        product = await product.save();
        ImageArr = [];
        
        return res.status(200).json({
            message: 'Success',
            error: false,
            success: true,
            product: product
        })
    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

async function paginatedFind(filter, page, perPage, populate = ['category', 'productColor']) {
  const total      = await ProductModel.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  if (page > totalPages) return { error: 'Page not found' };

  let q = ProductModel.find(filter);
  for (const f of populate) q = q.populate(f);

  const product = await q
    .sort({ createdAt: -1 })
    .skip((page - 1) * perPage)
    .limit(perPage)
    .exec();

  return { product, totalPages, page };
}

function buildCategoryFilter(query) {
  const filter = {};
  if (query.catIds)        filter.catId         = { $in: query.catIds.split(',').filter(Boolean) };
  else if (query.catId)    filter.catId         = query.catId;
  if (query.subCatId)      filter.subCatId      = query.subCatId;
  if (query.thirdsubCatId) filter.thirdsubCatId = query.thirdsubCatId;
  return filter;
}

function buildPriceFilter(query) {
  const price = {};
  if (query.minPrice != null && query.minPrice !== '') price.$gte = parseFloat(query.minPrice);
  if (query.maxPrice != null && query.maxPrice !== '') price.$lte = parseFloat(query.maxPrice);
  return Object.keys(price).length ? price : null;
}

function buildRatingFilter(query) {
  if (query.rating !== undefined && query.rating !== '')
    return { $gte: parseFloat(query.rating) };
  return null;
}

export async function getProduct(req, res) {
  try {
    const page    = parseInt(req.query.page)    || 1;
    const perPage = parseInt(req.query.perPage) || 12;
    const result  = await paginatedFind({}, page, perPage);
    if (result.error) return res.status(404).json({ message: result.error, error: true, success: false });
    return res.status(200).json({ message: 'Success', error: false, success: true, ...result });
  } catch (e) {
    return res.status(500).json({ message: e.message, error: true, success: false });
  }
}

export async function getProductByMultipleCategories(req, res) {
  try {
    const page    = parseInt(req.query.page)    || 1;
    const perPage = parseInt(req.query.perPage) || 12;
    const ids     = (req.query.catIds || '').split(',').filter(Boolean);
    if (ids.length === 0)
      return res.status(400).json({ message: 'catIds is required', error: true, success: false });

    const result = await paginatedFind({ catId: { $in: ids } }, page, perPage);
    if (result.error) return res.status(404).json({ message: result.error, error: true, success: false });
    return res.status(200).json({ message: 'Success', error: false, success: true, ...result });
  } catch (e) { return res.status(500).json({ message: e.message, error: true, success: false }); }
}

export async function getTopRatedProducts(req, res) {
  try {
    const limit = parseInt(req.query.limit) || 4;
    const products = await ProductModel.find({ rating: { $gt: 0 } })
      .populate('category')
      .populate('productColor')
      .sort({ rating: -1 })
      .limit(limit)
      .exec();
    return res.status(200).json({ message: 'Success', error: false, success: true, product: products });
  } catch (e) {
    return res.status(500).json({ message: e.message, error: true, success: false });
  }
}

export async function getBestSellerProducts(req, res) {
  try {
    const limit = parseInt(req.query.limit) || 4

    // ── Step 1: Aggregate sales from real order data ──────────────────────
    // Uses items[] array (new schema) — unwind then group by productId
    const orderAgg = await OrderModel.aggregate([
      {
        // Only count confirmed/paid orders
        $match: {
          payment_status: { $in: ['paid', 'delivered', 'shipped', 'processing'] },
        },
      },
      {
        // Flatten items array — one doc per item
        $unwind: '$items',
      },
      {
        // Group by productId, sum quantities sold
        $group: {
          _id:       '$items.productId',
          totalSold: { $sum: '$items.quantity' },
        },
      },
      { $sort:  { totalSold: -1 } },
      { $limit: limit },
    ])

    if (orderAgg.length > 0) {
      const ids      = orderAgg.map(a => a._id)
      const products = await ProductModel
        .find({ _id: { $in: ids } })
        .populate('category')
        .populate('productColor')
        .exec()

      // Re-sort to preserve aggregation order (most sold first)
      const sorted = ids
        .map(id => products.find(p => p._id.toString() === id.toString()))
        .filter(Boolean)

      return res.status(200).json({
        message: 'Success', error: false, success: true, product: sorted,
      })
    }

    // ── Step 2: Fallback — use sale field on product directly ─────────────
    // sale field is incremented by order.controller on every purchase
    const bySale = await ProductModel
      .find({ sale: { $gt: 0 } })
      .populate('category')
      .populate('productColor')
      .sort({ sale: -1 })
      .limit(limit)
      .exec()

    if (bySale.length > 0) {
      return res.status(200).json({
        message: 'Success', error: false, success: true, product: bySale,
      })
    }

    // ── Step 3: Last fallback — newest products ───────────────────────────
    const newest = await ProductModel
      .find()
      .populate('category')
      .populate('productColor')
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec()

    return res.status(200).json({
      message: 'Success', error: false, success: true, product: newest,
    })

  } catch (e) {
    return res.status(500).json({ message: e.message, error: true, success: false })
  }
}


export async function getProductByCategoryId(req, res) {
  try {
    const page = parseInt(req.query.page) || 1, perPage = parseInt(req.query.perPage) || 12;
    const result = await paginatedFind({ catId: req.params.id }, page, perPage);
    if (result.error) return res.status(404).json({ message: result.error, error: true, success: false });
    return res.status(200).json({ message: 'Success', error: false, success: true, ...result });
  } catch (e) { return res.status(500).json({ message: e.message, error: true, success: false }); }
}

export async function getProductByCategoryName(req, res) {
  try {
    const page = parseInt(req.query.page) || 1, perPage = parseInt(req.query.perPage) || 12;
    const result = await paginatedFind({ catName: req.query.catName }, page, perPage);
    if (result.error) return res.status(404).json({ message: result.error, error: true, success: false });
    return res.status(200).json({ message: 'Success', error: false, success: true, ...result });
  } catch (e) { return res.status(500).json({ message: e.message, error: true, success: false }); }
}

export async function getProductBySubCategoryId(req, res) {
  try {
    const page = parseInt(req.query.page) || 1, perPage = parseInt(req.query.perPage) || 12;
    const result = await paginatedFind({ subCatId: req.params.id }, page, perPage);
    if (result.error) return res.status(404).json({ message: result.error, error: true, success: false });
    return res.status(200).json({ message: 'Success', error: false, success: true, ...result });
  } catch (e) { return res.status(500).json({ message: e.message, error: true, success: false }); }
}

export async function getProductBySubCategoryName(req, res) {
  try {
    const page = parseInt(req.query.page) || 1, perPage = parseInt(req.query.perPage) || 12;
    const result = await paginatedFind({ subCat: req.query.subCat }, page, perPage);
    if (result.error) return res.status(404).json({ message: result.error, error: true, success: false });
    return res.status(200).json({ message: 'Success', error: false, success: true, ...result });
  } catch (e) { return res.status(500).json({ message: e.message, error: true, success: false }); }
}

export async function getProductByThirdSubCategoryId(req, res) {
  try {
    const page = parseInt(req.query.page) || 1, perPage = parseInt(req.query.perPage) || 12;
    const result = await paginatedFind({ thirdsubCatId: req.params.id }, page, perPage);
    if (result.error) return res.status(404).json({ message: result.error, error: true, success: false });
    return res.status(200).json({ message: 'Success', error: false, success: true, ...result });
  } catch (e) { return res.status(500).json({ message: e.message, error: true, success: false }); }
}

export async function getProductByThirdSubCategoryName(req, res) {
  try {
    const page = parseInt(req.query.page) || 1, perPage = parseInt(req.query.perPage) || 12;
    const result = await paginatedFind({ thirdsubCat: req.query.thirdsubCat }, page, perPage);
    if (result.error) return res.status(404).json({ message: result.error, error: true, success: false });
    return res.status(200).json({ message: 'Success', error: false, success: true, ...result });
  } catch (e) { return res.status(500).json({ message: e.message, error: true, success: false }); }
}

export async function getProductByPrice(req, res) {
  try {
    const page    = parseInt(req.query.page)    || 1;
    const perPage = parseInt(req.query.perPage) || 12;

    const filter = buildCategoryFilter(req.query);

    const price = buildPriceFilter(req.query);
    if (price) filter.price = price;

    const rating = buildRatingFilter(req.query);
    if (rating) filter.rating = rating;

    const result = await paginatedFind(filter, page, perPage);
    if (result.error) return res.status(404).json({ message: result.error, error: true, success: false });
    return res.status(200).json({ message: 'Success', error: false, success: true, ...result });
  } catch (e) { return res.status(500).json({ message: e.message, error: true, success: false }); }
}

export async function getProductByRating(req, res) {
  try {
    const page    = parseInt(req.query.page)    || 1;
    const perPage = parseInt(req.query.perPage) || 12;

    const filter = buildCategoryFilter(req.query);

    const rating = buildRatingFilter(req.query);
    if (rating) filter.rating = rating;

    const price = buildPriceFilter(req.query);
    if (price) filter.price = price;

    const result = await paginatedFind(filter, page, perPage);
    if (result.error) return res.status(404).json({ message: result.error, error: true, success: false });
    return res.status(200).json({ message: 'Success', error: false, success: true, ...result });
  } catch (e) { return res.status(500).json({ message: e.message, error: true, success: false }); }
}

export async function getProductCount(req, res) {
  try {
    const productCount = await ProductModel.countDocuments();
    return res.status(200).json({ message: 'Success', error: false, success: true, productCount });
  } catch (e) { return res.status(500).json({ message: e.message, error: true, success: false }); }
}

export async function getFeaturedProduct(req, res) {
  try {
    const page    = parseInt(req.query.page)    || 1;
    const perPage = parseInt(req.query.perPage) || 12;
    const filter  = { isFeatured: true };
    if (req.query.catName) filter.catName = req.query.catName;
    const result = await paginatedFind(filter, page, perPage);
    if (result.error) return res.status(404).json({ message: result.error, error: true, success: false });
    return res.status(200).json({ message: 'Success', error: false, success: true, ...result });
  } catch (e) { return res.status(500).json({ message: e.message, error: true, success: false }); }
}

export async function removeImageFromCloudinary(req, res) {
    const imgUrl = req.query.img;
    const urlArr = imgUrl.split('/');
    const image = urlArr[urlArr.length -1]
    const imageName = image.split(".")[0]
    if (imageName) {
        const result = await cloudinary.uploader.destroy(
            imageName,
            (error, result)=>{

            }
        );
        if (result) {
            res.status(200).send(result)
        }
    }
}

export async function deleteProduct(req, res) {
    try {
        const product = await ProductModel.findById(req.params.id)
        const images = product.images
        for (let img of images) {
            const imgUrl = img;
            const urlArr = imgUrl.split("/")
            const image = urlArr[urlArr.length-1]
            const imageName = image.split(".")[0];
            if(imageName){
                cloudinary.uploader.destroy(imageName, (error, result)=>{
                })
            }
        }
        const deleteProduct = await ProductModel.findByIdAndDelete(req.params.id) 
        if (!deleteProduct) {
            return res.status(500).json({
                message: 'Product not found',
                error: true,
                success: false
            })
        }
        return res.status(200).json({
            message: 'Deleted',
            error: false,
            success: true,
        })
    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

export async function deleteMultipleProduct(req, res) {
    try {
        const { ids } = req.body;
        for (let id of ids) {
            const product = await ProductModel.findById(id)
            const images = product.images
            for (let img of images) {
                const imgUrl = img;
                const urlArr = imgUrl.split("/")
                const image = urlArr[urlArr.length-1]
                const imageName = image.split(".")[0];
                if(imageName){
                    cloudinary.uploader.destroy(imageName, (error, result)=>{
                    })
                }
            }
            await ProductModel.findByIdAndDelete(id)
        }
        return res.status(200).json({
            message: 'Deleted',
            error: false,
            success: true,
        })
    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

export async function getSingleProduct(req, res) {
    try {
        const product = await ProductModel.findById(req.params.id).populate('category').populate("productColor")
        if (!product) {
            return res.status(500).json({
                message: 'Not found',
                error: true,
                success: false
            })
        }

        return res.status(200).json({
            message: 'Success',
            error: false,
            success: true,
            product: product
        })
    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

export async function updateProduct(req, res) {
    try {
        const product = await ProductModel.findByIdAndUpdate(
            req.params.id,
            {
                name: req.body.name,
                images: req.body.images,
                description: req.body.description,
                brand: req.body.brand,
                price: req.body.price,
                oldPrice: req.body.oldPrice,
                catName: req.body.catName,
                catId: req.body.catId,
                subCatId: req.body.subCatId,
                subCatName: req.body.subCatName,
                thirdsubCatId: req.body.thirdsubCatId,
                thirdsubCatName: req.body.thirdsubCatName,
                countInStock: req.body.countInStock,
                rating: req.body.rating,
                isFeatured: req.body.isFeatured,
                discount: req.body.discount,
                productRam: req.body.productRam,
                size: req.body.size,
                productWeight: req.body.productWeight,
                productColor: req.body.productColor,
            },{
                new: true
            }
        ).populate("productColor");
        if (!product) {
            return res.status(500).json({
                message: 'Product not found',
                error: true,
                success: false
            })
        }
        ImageArr = []
        return res.status(200).json({
            message: 'Success',
            error: false,
            success: true,
            product: product
        })
    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

export async function createProductRam(req, res) {
    try {
        let productRam = new ProductRamModel({
            name: req.body.name,
        })

        if (!productRam) {
            return res.status(500).json({
                message: 'Something wrong',
                error: true,
                success: false
            })
        }

        productRam = await productRam.save();
        
        return res.status(200).json({
            message: 'Success',
            error: false,
            success: true,
            productRam: productRam
        })
    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

export async function getProductRam(req, res) {
    try {
        const productRam = await ProductRamModel.find().sort({ createdAt: -1 })
        if(!productRam){
            return res.status(500).json({
                message: 'Product RAM not found',
                error: true,
                success: false
            })
        }

        return res.status(200).json({
            message: 'Success',
            error: false,
            success: true,
            productRam: productRam,
        })
    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

export async function deleteProductRam(req, res) {
    try {
        const deleteProductRam = await ProductRamModel.findByIdAndDelete(req.params.id)
        if (!deleteProductRam) {
            return res.status(500).json({
                message: 'Product RAM not found',
                error: true,
                success: false
            })
        }
        return res.status(200).json({
            message: 'Deleted',
            error: false,
            success: true,
        })
    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

export async function updateProductRam(req, res) {
    try {
        const productRam = await ProductRamModel.findByIdAndUpdate(
            req.params.id,
            {
                name: req.body.name,
            },{
                new: true
            }
        )
        if (!productRam) {
            return res.status(500).json({
                message: 'Product RAM not found',
                error: true,
                success: false
            })
        }
        return res.status(200).json({
            message: 'Success',
            error: false,
            success: true,
            productRam: productRam
        })
    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

export async function updateProductColor(req, res) {
    try {
        const productColor = await ProductColorModel.findByIdAndUpdate(
            req.params.id,
            {
                name: req.body.name,
                color: req.body.color,
            },{
                new: true
            }
        )
        if (!productColor) {
            return res.status(500).json({
                message: 'Product color not found',
                error: true,
                success: false
            })
        }
        return res.status(200).json({
            message: 'Success',
            error: false,
            success: true,
            productColor: productColor
        })
    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

export async function deleteProductColor(req, res) {
    try {
        const deleteProductColor = await ProductColorModel.findByIdAndDelete(req.params.id)
        if (!deleteProductColor) {
            return res.status(500).json({
                message: 'Product color not found',
                error: true,
                success: false
            })
        }
        return res.status(200).json({
            message: 'Deleted',
            error: false,
            success: true,
        })
    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

export async function createProductColor(req, res) {
    try {
        let productColor = new ProductColorModel({
            name: req.body.name,
            color: req.body.color,
        })

        if (!productColor) {
            return res.status(500).json({
                message: 'Something wrong',
                error: true,
                success: false
            })
        }

        productColor = await productColor.save();
        
        return res.status(200).json({
            message: 'Success',
            error: false,
            success: true,
            productColor: productColor
        })
    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}   

export async function getProductColor(req, res) {
    try {
        const productColor = await ProductColorModel.find().sort({ createdAt: -1 })
        if(!productColor){
            return res.status(500).json({
                message: 'Product color not found',
                error: true,
                success: false
            })
        }

        return res.status(200).json({
            message: 'Success',
            error: false,
            success: true,
            productColor: productColor,
        })
    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

export async function getProductSize(req, res) {
    try {
        const productSize = await ProductSizeModel.find().sort({ createdAt: -1 })
        if(!productSize){
            return res.status(500).json({
                message: 'Product size not found',
                error: true,
                success: false
            })
        }

        return res.status(200).json({
            message: 'Success',
            error: false,
            success: true,
            productSize: productSize,
        })
    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}   

export async function createProductSize(req, res) {
    try {
        let productSize = new ProductSizeModel({
            name: req.body.name,
        })

        if (!productSize) {
            return res.status(500).json({
                message: 'Something wrong',
                error: true,
                success: false
            })
        }

        productSize = await productSize.save();
        
        return res.status(200).json({
            message: 'Success',
            error: false,
            success: true,
            productSize: productSize
        })
    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

export async function deleteProductSize(req, res) {
    try {
        const deleteProductSize = await ProductSizeModel.findByIdAndDelete(req.params.id)
        if (!deleteProductSize) {
            return res.status(500).json({
                message: 'Product size not found',
                error: true,
                success: false
            })
        }
        return res.status(200).json({
            message: 'Deleted',
            error: false,
            success: true,
        })
    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

export async function updateProductSize(req, res) {
    try {
        const productSize = await ProductSizeModel.findByIdAndUpdate(
            req.params.id,
            {
                name: req.body.name,
            },{
                new: true
            }
        )
        if (!productSize) {
            return res.status(500).json({
                message: 'Product size not found',
                error: true,
                success: false
            })
        }
        return res.status(200).json({
            message: 'Success',
            error: false,
            success: true,
            productSize: productSize
        })
    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

export async function getProductWeight(req, res) {
    try {
        const productWeight = await ProductWeightModel.find().sort({ createdAt: -1 })
        if(!productWeight){
            return res.status(500).json({
                message: 'Product weight not found',
                error: true,
                success: false
            })
        }

        return res.status(200).json({
            message: 'Success',
            error: false,
            success: true,
            productWeight: productWeight,
        })
    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

export async function createProductWeight(req, res) {
    try {
        let productWeight = new ProductWeightModel({
            name: req.body.name,
        })

        if (!productWeight) {
            return res.status(500).json({
                message: 'Something wrong',
                error: true,
                success: false
            })
        }

        productWeight = await productWeight.save();
        
        return res.status(200).json({
            message: 'Success',
            error: false,
            success: true,
            productWeight: productWeight
        })
    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

export async function deleteProductWeight(req, res) {
    try {
        const deleteProductWeight = await ProductWeightModel.findByIdAndDelete(req.params.id)
        if (!deleteProductWeight) {
            return res.status(500).json({
                message: 'Product weight not found',
                error: true,
                success: false
            })
        }
        return res.status(200).json({
            message: 'Deleted',
            error: false,
            success: true,
        })
    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

export async function updateProductWeight(req, res) {
    try {
        const productWeight = await ProductWeightModel.findByIdAndUpdate(
            req.params.id,
            {
                name: req.body.name,
            },{
                new: true
            }
        )
        if (!productWeight) {
            return res.status(500).json({
                message: 'Product weight not found',
                error: true,
                success: false
            })
        }
        return res.status(200).json({
            message: 'Success',
            error: false,
            success: true,
            productWeight: productWeight
        })
    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}