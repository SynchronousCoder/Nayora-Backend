const express = require('express');
const router = express.Router();
// internal
const categoryController = require('../controller/category.controller');
const verifyToken = require('../middleware/verifyToken');
const authorization = require('../middleware/authorization');

// Nested slug route (parent/child)
router.get('/slug/:parent/:child', categoryController.getCategoryByNestedSlug);

// Single slug route (parent only)
router.get('/slug/:slug', categoryController.getCategoryBySlug);

// get
router.get('/get/:id', categoryController.getSingleCategory);
// add
router.post('/add', verifyToken, authorization('Admin', 'Super Admin', 'Manager', 'CEO'), categoryController.addCategory);
// add All Category
router.post('/add-all', verifyToken, authorization('Admin', 'Super Admin'), categoryController.addAllCategory);
// get all Category
router.get('/all', categoryController.getAllCategory);
// get Product Type Category
router.get('/show/:type', categoryController.getProductTypeCategory);
// get Show Category
router.get('/show', categoryController.getShowCategory);
// delete category
router.delete('/delete/:id', verifyToken, authorization('Admin', 'Super Admin'), categoryController.deleteCategory);
// delete product
router.patch('/edit/:id', verifyToken, authorization('Admin', 'Super Admin', 'Manager', 'CEO'), categoryController.updateCategory);

module.exports = router;