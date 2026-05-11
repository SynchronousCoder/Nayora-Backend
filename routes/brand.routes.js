const express = require('express');
const router = express.Router();
// internal
const brandController = require('../controller/brand.controller');
const verifyToken = require('../middleware/verifyToken');
const authorization = require('../middleware/authorization');

// add Brand
router.post('/add',verifyToken, authorization('Admin', 'Super Admin', 'Manager', 'CEO'), brandController.addBrand);
// add All Brand
router.post('/add-all',verifyToken, authorization('Admin', 'Super Admin'), brandController.addAllBrand);
// get Active Brands
router.get('/active',brandController.getActiveBrands);
// get all Brands
router.get('/all',brandController.getAllBrands);
// delete brand
router.delete('/delete/:id',verifyToken, authorization('Admin', 'Super Admin'), brandController.deleteBrand);
// get single
router.get('/get/:id', brandController.getSingleBrand);
// delete product
router.patch('/edit/:id', verifyToken, authorization('Admin', 'Super Admin', 'Manager', 'CEO'), brandController.updateBrand);

module.exports = router;
