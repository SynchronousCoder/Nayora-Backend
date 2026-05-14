/**
 * product.routes.js
 * 
 * All product-related API routes.
 * 
 * Base path: /api/product  (set in index.js / app.js)
 * 
 * ⚠️  Route order matters in Express:
 *      Specific static routes (/all, /offer, /slug/:slug) must come
 *      BEFORE wildcard routes (/:type, /:id) to avoid wrong matching.
 */

const express = require('express');
const router = express.Router();

const productController = require('../controller/product.controller');
const verifyToken = require('../middleware/verifyToken');
const authorization = require('../middleware/authorization');


// ─────────────────────────────────────────────
// WRITE ROUTES (Protected)
// ─────────────────────────────────────────────

// Create a single product (Admin/Manager/CEO only)
router.post(
  '/add',
  verifyToken,
  authorization('Admin', 'Super Admin', 'Manager', 'CEO'),
  productController.addProduct
);

// Bulk insert products — deletes all existing first (Admin/Super Admin only)
router.post(
  '/add-all',
  verifyToken,
  authorization('Admin', 'Super Admin'),
  productController.addAllProducts
);

// Update a product by ID (Admin/Manager/CEO only)
router.patch(
  '/edit-product/:id',
  verifyToken,
  authorization('Admin', 'Super Admin', 'Manager', 'CEO'),
  productController.updateProduct
);

// Delete a product by ID (Admin/Super Admin only)
router.delete(
  '/:id',
  verifyToken,
  authorization('Admin', 'Super Admin'),
  productController.deleteProduct
);


// ─────────────────────────────────────────────
// READ ROUTES — Static paths first (no params)
// ─────────────────────────────────────────────

// Get all products (supports filters: type, collection, category, search)
router.get('/all', productController.getAllProducts);

// Get products with active offer/countdown timer
router.get('/offer', productController.getOfferTimerProducts);

// Get top-rated products (sorted by average review rating)
router.get('/top-rated', productController.getTopRatedProducts);

// Get products that have at least one review
router.get('/review-product', productController.reviewProducts);

// Get out-of-stock products
router.get('/stock-out', productController.stockOutProducts);


// ─────────────────────────────────────────────
// READ ROUTES — Parameterized (specific before wildcard)
// ─────────────────────────────────────────────

// Get popular products by type (e.g. /popular/jewelry)
router.get('/popular/:type', productController.getPopularProductByType);

// Get related products for a given product ID
router.get('/related-product/:id', productController.getRelatedProducts);

// Get single product by MongoDB ObjectId
// (used by old /product-details/:id page to get slug for 301 redirect)
router.get('/single-product/:id', productController.getSingleProduct);

// ★ NEW — Get single product by SEO slug
// Used by new /product/[slug].jsx frontend page
// Example: GET /api/product/slug/gold-ring-925-1710000000000
// Must be ABOVE /:type to avoid Express treating "slug" as a type value
router.get('/slug/:slug', productController.getProductBySlug);


// ─────────────────────────────────────────────
// READ ROUTES — Wildcard (must be LAST)
// These catch anything not matched above.
// ─────────────────────────────────────────────

// Get products by type string (e.g. /jewelry, /diamond)
// Supports query: ?new=true | ?featured=true | ?topSellers=true
router.get('/:type', productController.getProductsByType);


module.exports = router;