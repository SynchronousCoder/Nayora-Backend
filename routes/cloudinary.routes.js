const express = require('express');
const router = express.Router();
const multer = require('multer');
const verifyToken = require('../middleware/verifyToken');
const authorization = require('../middleware/authorization');
const { cloudinaryController } = require('../controller/cloudinary.controller');

// Use memory storage for Cloudinary (buffer-based upload)
const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowed = /png|jpg|jpeg|webp|gif/;
    const ext = (file.originalname || '').toLowerCase();
    if (allowed.test(ext) || file.mimetype?.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (png, jpg, jpeg, webp, gif) are allowed'));
    }
  },
});

// Protected routes - require admin auth for uploads
router.post('/add-img', verifyToken, authorization('Admin', 'Super Admin', 'Manager', 'CEO'), upload.single('image'), cloudinaryController.saveImageCloudinary);
router.post('/add-multiple-img', verifyToken, authorization('Admin', 'Super Admin', 'Manager', 'CEO'), upload.array('images', 10), cloudinaryController.addMultipleImageCloudinary);

//delete image
router.delete('/img-delete', verifyToken, authorization('Admin', 'Super Admin', 'Manager', 'CEO'), cloudinaryController.cloudinaryDeleteController);

module.exports = router;
