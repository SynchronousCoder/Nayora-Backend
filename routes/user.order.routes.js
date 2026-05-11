const express = require('express');
const router = express.Router();
const userOrderController = require('../controller/user.order.controller');
const verifyToken = require('../middleware/verifyToken');
const authorization = require('../middleware/authorization');


// get dashboard amount
router.get('/dashboard-amount', verifyToken, authorization('Admin', 'Super Admin', 'Manager', 'CEO'), userOrderController.getDashboardAmount);

// get sales-report
router.get('/sales-report', verifyToken, authorization('Admin', 'Super Admin', 'Manager', 'CEO'), userOrderController.getSalesReport);

// get sales-report
router.get('/most-selling-category', verifyToken, authorization('Admin', 'Super Admin', 'Manager', 'CEO'), userOrderController.mostSellingCategory);

// get sales-report
router.get('/dashboard-recent-order', verifyToken, authorization('Admin', 'Super Admin', 'Manager', 'CEO'), userOrderController.getDashboardRecentOrder);

//get a order by id
router.get('/:id', verifyToken, userOrderController.getOrderById);

//get all order by a user
router.get('/',verifyToken, userOrderController.getOrderByUser);

module.exports = router;
