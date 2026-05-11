const express = require("express");
const {
  paymentIntent,
  createPayUPayment,
  handlePayUResponse,
  addOrder,
  getOrders,
  updateOrderStatus,
  getSingleOrder,
} = require("../controller/order.controller");
const verifyToken = require("../middleware/verifyToken");
const authorization = require("../middleware/authorization");

// router
const router = express.Router();

// get orders
router.get("/orders", verifyToken, authorization("Admin", "Super Admin", "Manager", "CEO"), getOrders);
// single order
router.get("/:id", verifyToken, authorization("Admin", "Super Admin", "Manager", "CEO"), getSingleOrder);
// add a create payment intent
router.post("/create-payment-intent", paymentIntent);
// create PayU payment request
router.post("/payu/create", createPayUPayment);
// PayU response callback
router.post("/payu/response", handlePayUResponse);
// save Order
router.post("/saveOrder", verifyToken, addOrder);
// update status
router.patch("/update-status/:id", verifyToken, authorization("Admin", "Super Admin", "Manager", "CEO"), updateOrderStatus);

module.exports = router;
