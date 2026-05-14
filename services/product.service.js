const Brand = require("../model/Brand");
const Category = require("../model/Category");
const Product = require("../model/Products");

const normalizeSlug = (value = "") =>
  String(value).toLowerCase().replace("&", "").split(" ").join("-");

//Slugify Function for correcting the routes
const slugify = (text = "") =>
  text
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

// create product service
exports.createProductService = async (data) => {
  //Injecting slug if not provided
  if (data.title && !data.slug) {
    data.slug = slugify(data.title) + "-" + Date.now();
  }
  const product = await Product.create(data);


  const { _id: productId, brand, category } = product;
  //update Brand
  await Brand.updateOne({ _id: brand.id }, { $push: { products: productId } });
  //Category Brand
  await Category.updateOne(
    { _id: category.id },
    { $push: { products: productId } },
  );
  return product;
};

// create all product service
exports.addAllProductService = async (data) => {
  await Product.deleteMany();
  const products = await Product.insertMany(data);
  for (const product of products) {
    await Brand.findByIdAndUpdate(product.brand.id, {
      $push: { products: product._id },
    });
    await Category.findByIdAndUpdate(product.category.id, {
      $push: { products: product._id },
    });
  }
  return products;
};

// get product data
exports.getAllProductsService = async (filters = {}) => {
  const dbQuery = {};
  if (filters.type) {
    dbQuery.productType = String(filters.type).toLowerCase();
  }

  let products = await Product.find(dbQuery).populate("reviews");

  const collection = normalizeSlug(filters.collection);
  const category = normalizeSlug(filters.category);
  const subCategory = normalizeSlug(filters.subCategory || filters.subcategory);
  const search = String(filters.search || filters.q || "")
    .trim()
    .toLowerCase();

  // Collection-first filtering for precise menu-based navigation.
  if (collection) {
    products = products.filter((p) => {
      const tags = Array.isArray(p.tags) ? p.tags.map(normalizeSlug) : [];
      const matchesCollectionFlags =
        (collection === "exclusive" && Boolean(p.isExclusive)) ||
        (collection === "best-sellers" && Boolean(p.isBestSellerMenu));

      return (
        matchesCollectionFlags ||
        normalizeSlug(p.category?.name) === collection ||
        normalizeSlug(p.parent) === collection ||
        tags.includes(collection)
      );
    });
  }

  if (category) {
    products = products.filter(
      (p) =>
        normalizeSlug(p.parent) === category ||
        normalizeSlug(p.category?.name) === category,
    );
  }

  if (subCategory) {
    products = products.filter(
      (p) => normalizeSlug(p.children) === subCategory,
    );
  }

  // Product text search is applied after category filters.
  if (search) {
    products = products.filter((p) => {
      const title = String(p.title || "").toLowerCase();
      const description = String(p.description || "").toLowerCase();
      return title.includes(search) || description.includes(search);
    });
  }

  return products;
};

// get type of product service
exports.getProductTypeService = async (req) => {
  const type = req.params.type;
  const query = req.query;
  let products;
  if (query.new === "true") {
    products = await Product.find({ productType: type })
      .sort({ createdAt: -1 })
      .limit(8)
      .populate("reviews");
  } else if (query.featured === "true") {
    products = await Product.find({
      productType: type,
      featured: true,
    }).populate("reviews");
  } else if (query.topSellers === "true") {
    products = await Product.find({ productType: type })
      .sort({ sellCount: -1 })
      .limit(8)
      .populate("reviews");
  } else {
    products = await Product.find({ productType: type }).populate("reviews");
  }
  return products;
};

// get offer product service
exports.getOfferTimerProductService = async (query) => {
  const products = await Product.find({
    productType: query,
    "offerDate.endDate": { $gt: new Date() },
  }).populate("reviews");
  return products;
};

// get popular product service by type
exports.getPopularProductServiceByType = async (type) => {
  const products = await Product.find({ productType: type })
    .sort({ "reviews.length": -1 })
    .limit(8)
    .populate("reviews");
  return products;
};

exports.getTopRatedProductService = async () => {
  const products = await Product.find({
    reviews: { $exists: true, $ne: [] },
  }).populate("reviews");

  const topRatedProducts = products.map((product) => {
    const totalRating = product.reviews.reduce(
      (sum, review) => sum + review.rating,
      0,
    );
    const averageRating = totalRating / product.reviews.length;

    return {
      ...product.toObject(),
      rating: averageRating,
    };
  });

  topRatedProducts.sort((a, b) => b.rating - a.rating);

  return topRatedProducts;
};

// get product data
exports.getProductService = async (id) => {
  const product = await Product.findById(id).populate({
    path: "reviews",
    populate: { path: "userId", select: "name email imageURL" },
  });
  return product;
};

// get product data
exports.getRelatedProductService = async (productId) => {
  const currentProduct = await Product.findById(productId);

  const relatedProducts = await Product.find({
    "category.name": currentProduct.category.name,
    _id: { $ne: productId }, // Exclude the current product ID
  });
  return relatedProducts;
};

// update a product
exports.updateProductService = async (id, currProduct) => {
  // console.log('currProduct',currProduct)
  const product = await Product.findById(id);
  if (product) {
    product.title = currProduct.title;
    product.brand.name = currProduct.brand.name;
    product.brand.id = currProduct.brand.id;
    product.category.name = currProduct.category.name;
    product.category.id = currProduct.category.id;
    product.sku = currProduct.sku;
    product.img = currProduct.img;
    product.slug = currProduct.slug;
    product.unit = currProduct.unit;
    product.imageURLs = currProduct.imageURLs;
    product.tags = currProduct.tags;
    product.sizes = Array.isArray(currProduct.sizes) ? currProduct.sizes : [];
    product.isExclusive = Boolean(currProduct.isExclusive);
    product.isBestSellerMenu = Boolean(currProduct.isBestSellerMenu);
    product.parent = currProduct.parent;
    product.children = currProduct.children;
    product.price = currProduct.price;
    product.discount = currProduct.discount;
    product.quantity = currProduct.quantity;
    product.status = currProduct.status;
    product.productType = currProduct.productType;
    product.description = currProduct.description;
    product.additionalInformation = currProduct.additionalInformation || [];
    if (currProduct.offerDate) {
      product.offerDate = product.offerDate || {};
      product.offerDate.startDate = currProduct.offerDate.startDate;
      product.offerDate.endDate = currProduct.offerDate.endDate;
    }

    await product.save();
  }

  return product;
};

// get Reviews Products
exports.getReviewsProducts = async () => {
  const result = await Product.find({
    reviews: { $exists: true, $ne: [] },
  }).populate({
    path: "reviews",
    populate: { path: "userId", select: "name email imageURL" },
  });

  const products = result.filter((p) => p.reviews.length > 0);

  return products;
};

// get Reviews Products
exports.getStockOutProducts = async () => {
  const result = await Product.find({ status: "out-of-stock" }).sort({
    createdAt: -1,
  });
  return result;
};

// get Reviews Products
exports.deleteProduct = async (id) => {
  const result = await Product.findByIdAndDelete(id);
  return result;
};


// get product by slug
exports.getProductBySlugService = async (slug) => {
  const product = await Product.findOne({ slug }).populate({
    path: "reviews",
    populate: { path: "userId", select: "name email imageURL" },
  });
  if (!product) {
    const error = new Error("Product not found with this slug");
    error.status = 404;
    throw error;
  }
  return product;
};