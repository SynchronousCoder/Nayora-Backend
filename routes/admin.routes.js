const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/verifyToken");
const authorization = require("../middleware/authorization");
const {
  registerAdmin,
  loginAdmin,
  updateStaff,
  changePassword,
  addStaff,
  getAllStaff,
  deleteStaff,
  getStaffById,
  forgetPassword,
  confirmAdminForgetPass,
  updatedStatus,
} = require("../controller/admin.controller");
const {
  getDashboardStats,
  getAllUsers,
  getUserById,
  updateUserStatus,
  deleteUser,
  getRevenueChart,
  getOrderStatusDistribution,
} = require("../controller/admin.manage.controller");
const {
  getAdminContactMessages,
  updateContactMessageStatus,
  deleteContactMessage,
} = require("../controller/contact.controller");

//META TAG CONTROLLER
const {
  getAllMetaTags,
  getMetaTagByPage,
  createMetaTag,
  updateMetaTag,
  deleteMetaTag,
} = require("../controller/metaTag.controller");

// ===== Public routes =====
//register a admin
router.post("/register", registerAdmin);
//login a admin
router.post("/login", loginAdmin);
//forget-password
router.patch("/forget-password", forgetPassword);
//confirm-forget-password
router.patch("/confirm-forget-password", confirmAdminForgetPass);

// ===== Protected admin routes =====
//change password
router.patch("/change-password", verifyToken, changePassword);
//add a staff
router.post("/add", verifyToken, authorization("Admin", "Super Admin"), addStaff);
//get all staff
router.get("/all", verifyToken, authorization("Admin", "Super Admin", "Manager", "CEO"), getAllStaff);
//get a staff
router.get("/get/:id", verifyToken, authorization("Admin", "Super Admin", "Manager", "CEO"), getStaffById);
//update a staff
router.patch("/update-stuff/:id", verifyToken, authorization("Admin", "Super Admin"), updateStaff);
//update staff status
router.put("/update-status/:id", verifyToken, authorization("Admin", "Super Admin"), updatedStatus);
//delete a staff
router.delete("/staff/:id", verifyToken, authorization("Admin", "Super Admin"), deleteStaff);

// ===== Dashboard & Analytics =====
router.get("/dashboard-stats", verifyToken, authorization("Admin", "Super Admin", "Manager", "CEO"), getDashboardStats);
router.get("/revenue-chart", verifyToken, authorization("Admin", "Super Admin", "Manager", "CEO"), getRevenueChart);
router.get("/order-status-distribution", verifyToken, authorization("Admin", "Super Admin", "Manager", "CEO"), getOrderStatusDistribution);

// ===== User Management =====
router.get("/users", verifyToken, authorization("Admin", "Super Admin"), getAllUsers);
router.get("/users/:id", verifyToken, authorization("Admin", "Super Admin"), getUserById);
router.patch("/users/status/:id", verifyToken, authorization("Admin", "Super Admin"), updateUserStatus);
router.delete("/users/:id", verifyToken, authorization("Admin", "Super Admin"), deleteUser);

// ===== Contact Messages =====
router.get(
  "/contact-messages",
  verifyToken,
  authorization("Admin", "Super Admin", "Manager", "CEO"),
  getAdminContactMessages
);
router.patch(
  "/contact-messages/:id/read",
  verifyToken,
  authorization("Admin", "Super Admin", "Manager", "CEO"),
  updateContactMessageStatus
);
router.delete(
  "/contact-messages/:id",
  verifyToken,
  authorization("Admin", "Super Admin"),
  deleteContactMessage
);



// ===== Meta Tag Management =====



router.get(
  "/meta-tags",
  verifyToken,
  authorization("Admin", "Super Admin", "Manager", "CEO"),
  getAllMetaTags
);

router.get(
  "/meta-tags/page/:page",
  getMetaTagByPage  // sirf yahi — koi verifyToken, koi authorization nahi
);

router.post(
  "/meta-tags",
  verifyToken,
  authorization("Admin", "Super Admin"),
  createMetaTag
);

router.patch(
  "/meta-tags/:id",
  verifyToken,
  authorization("Admin", "Super Admin"),
  updateMetaTag
);

router.delete(
  "/meta-tags/:id",
  verifyToken,
  authorization("Admin", "Super Admin"),
  deleteMetaTag
);

module.exports = router;