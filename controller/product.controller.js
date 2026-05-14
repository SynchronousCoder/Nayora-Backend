/**
 * product.controller.js
 * 
 * Handles all HTTP request/response logic for products.
 * Business logic lives in services/product.service.js
 * 
 * Routes handled:
 *   POST   /api/product/add
 *   POST   /api/product/add-all
 *   GET    /api/product/all
 *   GET    /api/product/offer
 *   GET    /api/product/top-rated
 *   GET    /api/product/review-product
 *   GET    /api/product/popular/:type
 *   GET    /api/product/related-product/:id
 *   GET    /api/product/single-product/:id
 *   GET    /api/product/slug/:slug     ← NEW (SEO-friendly URL)
 *   GET    /api/product/stock-out
 *   PATCH  /api/product/edit-product/:id
 *   GET    /api/product/:type
 *   DELETE /api/product/:id
 */

const Brand = require("../model/Brand");
const productServices = require("../services/product.service");
const Product = require("../model/Products");


// ─────────────────────────────────────────────
// ADD PRODUCT
// POST /api/product/add
// Admin/Manager only — creates a new product.
// First image is auto-constructed from the main img field.
// ─────────────────────────────────────────────
exports.addProduct = async (req, res, next) => {
  console.log('product--->', req.body);
  try {
    // Always prepend the primary image as the first item in imageURLs
    const firstItem = {
      color: { name: '', clrCode: '' },
      img: req.body.img,
    };
    const imageURLs = [firstItem, ...(req.body.imageURLs || [])];

    const result = await productServices.createProductService({
      ...req.body,
      imageURLs: imageURLs,
    });

    console.log('product-result', result);

    res.status(200).json({
      success: true,
      status: "success",
      message: "Product created successfully!",
      data: result,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};


// ─────────────────────────────────────────────
// ADD ALL PRODUCTS (Bulk)
// POST /api/product/add-all
// Deletes all existing products, then inserts the new batch.
// Used for seeding or full catalog replacement.
// ─────────────────────────────────────────────
module.exports.addAllProducts = async (req, res, next) => {
  try {
    const result = await productServices.addAllProductService(req.body);
    res.json({
      message: 'Products added successfully',
      result,
    });
  } catch (error) {
    next(error);
  }
};


// ─────────────────────────────────────────────
// GET ALL PRODUCTS
// GET /api/product/all
// Supports filters via query params: type, collection, category, subCategory, search
// ─────────────────────────────────────────────
exports.getAllProducts = async (req, res, next) => {
  try {
    const result = await productServices.getAllProductsService(req.query);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};


// ─────────────────────────────────────────────
// GET PRODUCTS BY TYPE
// GET /api/product/:type
// Fetches products filtered by productType.
// Supports query: ?new=true | ?featured=true | ?topSellers=true
// ─────────────────────────────────────────────
module.exports.getProductsByType = async (req, res, next) => {
  try {
    const result = await productServices.getProductTypeService(req);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};


// ─────────────────────────────────────────────
// GET OFFER TIMER PRODUCTS
// GET /api/product/offer?type=jewelry
// Returns products that have an active offer (endDate in future).
// ─────────────────────────────────────────────
module.exports.getOfferTimerProducts = async (req, res, next) => {
  try {
    const result = await productServices.getOfferTimerProductService(req.query.type);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};


// ─────────────────────────────────────────────
// GET POPULAR PRODUCTS BY TYPE
// GET /api/product/popular/:type
// Returns top 8 products of a given type, sorted by review count.
// ─────────────────────────────────────────────
module.exports.getPopularProductByType = async (req, res, next) => {
  try {
    const result = await productServices.getPopularProductServiceByType(req.params.type);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};


// ─────────────────────────────────────────────
// GET TOP RATED PRODUCTS
// GET /api/product/top-rated
// Returns all products sorted by average review rating (highest first).
// ─────────────────────────────────────────────
module.exports.getTopRatedProducts = async (req, res, next) => {
  try {
    const result = await productServices.getTopRatedProductService();
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};


// ─────────────────────────────────────────────
// GET SINGLE PRODUCT BY ID
// GET /api/product/single-product/:id
// Fetches one product by MongoDB ObjectId.
// Used by old ID-based URLs — will 301 redirect to slug URL on frontend.
// ─────────────────────────────────────────────
exports.getSingleProduct = async (req, res, next) => {
  try {
    const product = await productServices.getProductService(req.params.id);
    res.json(product);
  } catch (error) {
    next(error);
  }
};


// ─────────────────────────────────────────────
// GET SINGLE PRODUCT BY SLUG  ← NEW
// GET /api/product/slug/:slug
// Fetches one product by its SEO-friendly slug.
// Used by the new /product/[slug].jsx frontend page.
// Example: GET /api/product/slug/gold-ring-925-1710000000000
// ─────────────────────────────────────────────
exports.getProductBySlug = async (req, res, next) => {
  try {
    const product = await productServices.getProductBySlugService(req.params.slug);
    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
};


// ─────────────────────────────────────────────
// GET RELATED PRODUCTS
// GET /api/product/related-product/:id
// Returns products in the same category, excluding the current product.
// ─────────────────────────────────────────────
exports.getRelatedProducts = async (req, res, next) => {
  try {
    const products = await productServices.getRelatedProductService(req.params.id);
    res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error) {
    next(error);
  }
};


// ─────────────────────────────────────────────
// UPDATE PRODUCT
// PATCH /api/product/edit-product/:id
// Admin/Manager only — updates all fields of an existing product.
// ─────────────────────────────────────────────
exports.updateProduct = async (req, res, next) => {
  try {
    const product = await productServices.updateProductService(req.params.id, req.body);
    res.send({ data: product, message: "Product updated successfully!" });
  } catch (error) {
    next(error);
  }
};


// ─────────────────────────────────────────────
// GET REVIEW PRODUCTS
// GET /api/product/review-product
// Returns all products that have at least one review.
// ─────────────────────────────────────────────
exports.reviewProducts = async (req, res, next) => {
  try {
    const products = await productServices.getReviewsProducts();
    res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error) {
    next(error);
  }
};


// ─────────────────────────────────────────────
// GET STOCK-OUT PRODUCTS
// GET /api/product/stock-out
// Returns all products with status = "out-of-stock", newest first.
// ─────────────────────────────────────────────
exports.stockOutProducts = async (req, res, next) => {
  try {
    const products = await productServices.getStockOutProducts();
    res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error) {
    next(error);
  }
};


// ─────────────────────────────────────────────
// DELETE PRODUCT
// DELETE /api/product/:id
// Admin/Super Admin only — permanently deletes a product.
// ─────────────────────────────────────────────
exports.deleteProduct = async (req, res, next) => {
  try {
    await productServices.deleteProduct(req.params.id);
    res.status(200).json({
      message: 'Product deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};