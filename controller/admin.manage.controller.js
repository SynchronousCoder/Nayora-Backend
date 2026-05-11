const User = require("../model/User");
const Order = require("../model/Order");
const Product = require("../model/Products");
const Category = require("../model/Category");
const Brand = require("../model/Brand");
const Coupon = require("../model/Coupon");
const Reviews = require("../model/Review");
const dayjs = require("dayjs");

// Get admin dashboard stats
exports.getDashboardStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: "active" });
    const totalProducts = await Product.countDocuments();
    const totalOrders = await Order.countDocuments();
    const totalCategories = await Category.countDocuments();
    const totalBrands = await Brand.countDocuments();
    const totalCoupons = await Coupon.countDocuments();
    const totalReviews = await Reviews.countDocuments();

    const pendingOrders = await Order.countDocuments({ status: "pending" });
    const processingOrders = await Order.countDocuments({ status: "processing" });
    const deliveredOrders = await Order.countDocuments({ status: "delivered" });
    const cancelledOrders = await Order.countDocuments({ status: "cancel" });

    // Revenue calculations
    const revenueData = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalAmount" },
          avgOrderValue: { $avg: "$totalAmount" },
        },
      },
    ]);

    const totalRevenue = revenueData.length > 0 ? revenueData[0].totalRevenue : 0;
    const avgOrderValue = revenueData.length > 0 ? revenueData[0].avgOrderValue : 0;

    // Today's stats
    const todayStart = dayjs().startOf("day").toDate();
    const todayEnd = dayjs().endOf("day").toDate();

    const todayOrders = await Order.countDocuments({
      createdAt: { $gte: todayStart, $lte: todayEnd },
    });

    const todayRevenueData = await Order.aggregate([
      {
        $match: { createdAt: { $gte: todayStart, $lte: todayEnd } },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$totalAmount" },
        },
      },
    ]);

    const todayRevenue = todayRevenueData.length > 0 ? todayRevenueData[0].total : 0;

    // This month stats
    const monthStart = dayjs().startOf("month").toDate();
    const monthEnd = dayjs().endOf("month").toDate();

    const monthlyRevenueData = await Order.aggregate([
      {
        $match: { createdAt: { $gte: monthStart, $lte: monthEnd } },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$totalAmount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const monthlyRevenue = monthlyRevenueData.length > 0 ? monthlyRevenueData[0].total : 0;
    const monthlyOrders = monthlyRevenueData.length > 0 ? monthlyRevenueData[0].count : 0;

    // Recent orders (last 10)
    const recentOrders = await Order.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("user", "name email");

    // Low stock products (quantity < 10)
    const lowStockProducts = await Product.find({ quantity: { $lt: 10 } })
      .sort({ quantity: 1 })
      .limit(10)
      .select("title img quantity price status");

    // Out of stock products count
    const outOfStockProducts = await Product.countDocuments({ status: "out-of-stock" });

    res.status(200).json({
      success: true,
      data: {
        users: { total: totalUsers, active: activeUsers },
        products: { total: totalProducts, outOfStock: outOfStockProducts },
        orders: {
          total: totalOrders,
          pending: pendingOrders,
          processing: processingOrders,
          delivered: deliveredOrders,
          cancelled: cancelledOrders,
        },
        categories: totalCategories,
        brands: totalBrands,
        coupons: totalCoupons,
        reviews: totalReviews,
        revenue: {
          total: totalRevenue,
          today: todayRevenue,
          monthly: monthlyRevenue,
          avgOrderValue: Math.round(avgOrderValue * 100) / 100,
        },
        todayOrders,
        monthlyOrders,
        recentOrders,
        lowStockProducts,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get all users (admin)
exports.getAllUsers = async (req, res, next) => {
  try {
    const { page, limit, search, status, sort } = req.query;

    const pages = Number(page) || 1;
    const limits = Number(limit) || 10;
    const skip = (pages - 1) * limits;

    let query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    if (status && status !== "all") {
      query.status = status;
    }

    let sortOption = { createdAt: -1 };
    if (sort === "name") sortOption = { name: 1 };
    if (sort === "newest") sortOption = { createdAt: -1 };
    if (sort === "oldest") sortOption = { createdAt: 1 };

    const totalDoc = await User.countDocuments(query);
    const users = await User.find(query, { password: 0 })
      .sort(sortOption)
      .skip(skip)
      .limit(limits);

    res.status(200).json({
      success: true,
      data: users,
      totalDoc,
      page: pages,
      limit: limits,
      totalPages: Math.ceil(totalDoc / limits),
    });
  } catch (error) {
    next(error);
  }
};

// Get single user (admin)
exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id, { password: 0 });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Get user's orders
    const orders = await Order.find({ user: req.params.id }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: { user, orders },
    });
  } catch (error) {
    next(error);
  }
};

// Update user status (admin)
exports.updateUserStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, select: "-password" }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({
      success: true,
      message: `User status updated to ${status}`,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// Delete user (admin)
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// Get revenue chart data (last 30 days)
exports.getRevenueChart = async (req, res, next) => {
  try {
    const days = Number(req.query.days) || 30;
    const startDate = dayjs().subtract(days, "day").startOf("day").toDate();

    const revenueData = await Order.aggregate([
      {
        $match: { createdAt: { $gte: startDate } },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          revenue: { $sum: "$totalAmount" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      success: true,
      data: revenueData,
    });
  } catch (error) {
    next(error);
  }
};

// Get order status distribution
exports.getOrderStatusDistribution = async (req, res, next) => {
  try {
    const distribution = await Order.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          total: { $sum: "$totalAmount" },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: distribution,
    });
  } catch (error) {
    next(error);
  }
};
