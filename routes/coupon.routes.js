const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const authorization = require('../middleware/authorization');
const {
  addCoupon,
  addAllCoupon,
  getAllCoupons,
  getCouponById,
  updateCoupon,
  deleteCoupon,
} = require('../controller/coupon.controller');

//add a coupon
router.post('/add', verifyToken, authorization('Admin', 'Super Admin', 'Manager', 'CEO'), addCoupon);

//add multiple coupon
router.post('/all', verifyToken, authorization('Admin', 'Super Admin'), addAllCoupon);

//get all coupon
router.get('/', getAllCoupons);

//get a coupon
router.get('/:id', getCouponById);

//update a coupon
router.patch('/:id', verifyToken, authorization('Admin', 'Super Admin', 'Manager', 'CEO'), updateCoupon);

//delete a coupon
router.delete('/:id', verifyToken, authorization('Admin', 'Super Admin'), deleteCoupon);

module.exports = router;
