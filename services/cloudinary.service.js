const { secret } = require("../config/secret");
const cloudinary = require("../utils/cloudinary");
const { Readable } = require('stream');

// cloudinary Image Upload
// const cloudinaryImageUpload = async (image) => {
//   console.log('image service',image)
//   const uploadRes = await cloudinary.uploader.upload(image, {
//     upload_preset: secret.cloudinary_upload_preset,
//   });
//   return uploadRes;
// };

const cloudinaryImageUpload = (imageBuffer) => {
  return new Promise((resolve, reject) => {
    // Signed upload - no preset needed when api_secret is configured (SDK signs automatically)
    const options = {};
    const uploadStream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) {
          console.error('Error uploading to Cloudinary:', error);
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    const bufferStream = new Readable();
    bufferStream.push(imageBuffer);
    bufferStream.push(null);

    bufferStream.pipe(uploadStream);
  });
};


// cloudinaryImageDelete
const cloudinaryImageDelete = async (public_id) => {
  const deletionResult = await cloudinary.uploader.destroy(public_id);
  return deletionResult;
};

exports.cloudinaryServices = {
  cloudinaryImageDelete,
  cloudinaryImageUpload,
};
