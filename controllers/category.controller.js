import CategoryModel from "../models/category.model.js";
import { v2 as cloudinary } from 'cloudinary'
import fs, { access } from 'fs';

cloudinary.config({ 
  cloud_name: process.env.cloudinary_Config_Cloud_Name, 
  api_key: process.env.cloudinary_Config_api_key, 
  api_secret: process.env.cloudinary_Config_api_secret,
  secure: true
});

var ImageArr=[];

export async function uploadImages(req, res) {
  try {
    const images = req.files || [];
    const ImageArr = [];

    if (!images.length) {
      return res.status(400).json({
        message: "No files uploaded",
        error: true,
        success: false,
      });
    }

    const options = {
      use_filename: true,
      unique_filename: true,
      overwrite: false,
    };

    for (const file of images) {
      const result = await cloudinary.uploader.upload(file.path, options);
      ImageArr.push(result.secure_url);

      // delete local file
      try {
        fs.unlinkSync(file.path);
      } catch (e) {}
    }

    return res.status(200).json({
      image: ImageArr,
      error: false,
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || error,
      error: true,
      success: false,
    });
  }
}

export async function createCategory(req, res) {
  try {
    const { name, image, images, parentId, parentCatName } = req.body;

    if (!name) {
      return res.status(400).json({
        message: "Name is required",
        error: true,
        success: false,
      });
    }
    
    const finalImages = Array.isArray(images)
      ? images
      : image
      ? [image]
      : [];

    const category = await CategoryModel.create({
      name,
      images: finalImages,
      parentId: parentId || null,
      parentCatName: parentCatName || null,
    });

    return res.status(200).json({
      message: "Success",
      error: false,
      success: true,
      category,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || error,
      error: true,
      success: false,
    });
  }
}

export async function getCategory(req, res) {
    try {
        const category = await CategoryModel.find()
        const categoryMap = {};
        category.forEach(cat=>{
            categoryMap[cat._id] = { ...cat._doc, children: []}
        })

        const rootCategory = [];
        category.forEach(cat=>{
            if (cat.parentId) {
                categoryMap[cat.parentId].children.push(categoryMap[cat._id])
            }else{
                rootCategory.push(categoryMap[cat._id])
            }
        })

        return res.status(200).json({
            message: 'Success',
            error: false,
            success: true,
            category: rootCategory
        })
    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

export async function getCategoryCount(req, res) {
    try {
        const categoryCount = await CategoryModel.countDocuments({parentId: undefined})
        if (!categoryCount) {
            return res.status(500).json({
                message: '',
                error: true,
                success: false
            })
        }
        else{
            return res.send({
                message: 'Success',
                error: false,
                success: true,
                categoryCount: categoryCount
            })
        }
    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

export async function getSubCategoryCount(req, res) {
    try {
        const category = await CategoryModel.find()
        if (!category) {
            return res.status(500).json({
                message: '',
                error: true,
                success: false
            })
        }
        else{
            const subCatArr = []
            for (let cat of category) {
                if (cat.parentId !== null) {
                    subCatArr.push(cat)
                }
                
            }
            return res.send({
                message: 'Success',
                error: false,
                success: true,
                subCategoryCount: subCatArr.length
            })
        }
    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

export async function getSingleCategory(req, res) {
    try {
        const category = await CategoryModel.findById(req.params.id)
        if (!category) {
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
            category: category
        })
    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

export async function removeImageFromCloudinary(req, res) {
  try {
    const imgUrl = req.query.img;

    if (!imgUrl) {
      return res.status(400).json({
        message: "img query param is required",
        error: true,
        success: false,
      });
    }

    const urlArr = imgUrl.split("/");
    const lastPart = urlArr[urlArr.length - 1];
    const imageName = lastPart.split(".")[0];

    const result = await cloudinary.uploader.destroy(imageName);

    return res.status(200).json({
      success: true,
      error: false,
      result,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || error,
      error: true,
      success: false,
    });
  }
}

export async function deleteCategory(req, res) {
    try {
        const category = await CategoryModel.findById(req.params.id)
        const images = category.images
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
        const subCategory = await CategoryModel.find({
            parentId: req.params.id
        })
        for (let i = 0; i < subCategory.length; i++) {
            const thirdSubCategory = await CategoryModel.find({
                parentId: subCategory[i]._id
            })
            for (let i = 0; i < thirdSubCategory.length; i++) {
                const deleteThirdSubCategory = await CategoryModel.findByIdAndDelete(thirdSubCategory[i]._id)   
            }
            const deleteSubCat = await CategoryModel.findByIdAndDelete(subCategory[i]._id)   
        }
        const deleteCat = await CategoryModel.findByIdAndDelete(req.params.id) 
        if (!deleteCat) {
            return res.status(500).json({
                message: 'Category not found',
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

export async function updatedCategory(req, res) {
  try {
    const images = Array.isArray(req.body.images) ? req.body.images : [];

    const category = await CategoryModel.findByIdAndUpdate(
      req.params.id,
      {
        name: req.body.name,
        images: images,
        parentId: req.body.parentId ?? null,
        parentCatName: req.body.parentCatName ?? null,
      },
      { new: true }
    );

    if (!category) {
      return res.status(404).json({
        message: "Category not found",
        error: true,
        success: false,
      });
    }

    return res.status(200).json({
      message: "Success",
      error: false,
      success: true,
      category,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || error,
      error: true,
      success: false,
    });
  }
}