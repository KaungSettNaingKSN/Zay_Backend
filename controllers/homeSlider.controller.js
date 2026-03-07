import HomeSliderModel from "../models/homeSlider.model.js";
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

export async function createHomeSlider(req, res) {
  try {
    const raw = req.body.images ?? req.body.image;

    if (!raw || (Array.isArray(raw) ? raw.length === 0 : !raw)) {
      return res.status(400).json({ message: "Image is required", error: true, success: false });
    }

    const finalImages = Array.isArray(raw) ? raw : [raw];

    const homeSlider = await HomeSliderModel.create({ images: finalImages });
    return res.status(200).json({ message: "Success", error: false, success: true, homeSlider });
  } catch (error) {
    return res.status(500).json({ message: error.message || error, error: true, success: false });
  }
}

export async function getHomeSlider(req, res) {
  try {
    const homeSlider = await HomeSliderModel.find().sort({ createdAt: -1 });
    return res.status(200).json({ message: 'Success', error: false, success: true, homeSlider });
  } catch (error) {
    return res.status(500).json({ message: error.message || error, error: true, success: false });
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

export async function deleteHomeSlider(req, res) {
    try {
        const homeSlider = await HomeSliderModel.findById(req.params.id)
        const images = homeSlider.images
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
        const deleteHomeSlider = await HomeSliderModel.findByIdAndDelete(req.params.id) 
        if (!deleteHomeSlider) {
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

export async function updatedHomeSlider(req, res) {
  try {
    const images = Array.isArray(req.body.images) ? req.body.images : [];

    const homeSlider = await HomeSliderModel.findByIdAndUpdate(
      req.params.id,
      {
        images: images,
      },
      { new: true }
    );

    if (!homeSlider) {
      return res.status(404).json({
        message: "Slider not found",
        error: true,
        success: false,
      });
    }

    return res.status(200).json({
      message: "Success",
      error: false,
      success: true,
      homeSlider,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || error,
      error: true,
      success: false,
    });
  }
}
