const { cloudinaryServices } = require("../services/cloudinary.service");

// add image (uses multer memory storage - file.buffer)
const saveImageCloudinary = async (req, res, next) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: "No image file provided",
      });
    }
    const result = await cloudinaryServices.cloudinaryImageUpload(
      req.file.buffer
    );
    res.status(200).json({
      success: true,
      message: "image uploaded successfully",
      data: { url: result.secure_url, id: result.public_id },
    });
  } catch (err) {
    console.log(err);
    next(err);
  }
};

// add multiple images (uses multer memory storage - file.buffer)
const addMultipleImageCloudinary = async (req, res, next) => {
  try {
    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No image files provided",
      });
    }

    const uploadResults = [];
    for (const file of files) {
      if (!file.buffer) {
        continue;
      }
      const result = await cloudinaryServices.cloudinaryImageUpload(file.buffer);
      uploadResults.push({
        url: result.secure_url,
        id: result.public_id,
      });
    }

    res.status(200).json({
      success: true,
      message: "images uploaded successfully",
      data: uploadResults,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: "Failed to upload images",
    });
  }
};

// cloudinary ImageDelete
const cloudinaryDeleteController = async (req, res) => {
  try {
    const { folder_name, id } = req.query;
    const public_id = `${folder_name}/${id}`;
    const result = await cloudinaryServices.cloudinaryImageDelete(public_id);
    res.status(200).json({
      success: true,
      message: "delete image successfully",
      data: result,
    });
  } catch (err) {
    res.status(500).send({
      success: false,
      message: "Failed to delete image",
    });
  }
};

exports.cloudinaryController = {
  cloudinaryDeleteController,
  saveImageCloudinary,
  addMultipleImageCloudinary,
};
