require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("../model/Products");

const MAX_SLUG_LENGTH = 80;

/**
 * Clean SEO-friendly slug generator
 */
const slugify = (text = "") => {
  return text
    .normalize("NFKD") // remove accents safely
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, MAX_SLUG_LENGTH);
};

const generateUniqueSlug = async (title, productId) => {
  const baseSlug = slugify(title);

  // First attempt — clean URL without suffix
  let slug = baseSlug;

  // Check if slug already exists
  const existingProduct = await Product.findOne({
    slug,
    _id: { $ne: productId },
  });

  // If duplicate exists → add short unique suffix
  if (existingProduct) {
    slug = `${baseSlug}-${productId.toString().slice(-6)}`;
  }

  return slug;
};

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  console.log("✅ Connected to MongoDB");

  const products = await Product.find({
    $or: [
      { slug: { $exists: false } },
      { slug: null },
      { slug: "" },
    ],
  });

  console.log(`📦 ${products.length} products ko slug dena hai`);

  for (const product of products) {
    try {
      const slug = await generateUniqueSlug(
        product.title,
        product._id
      );

      product.slug = slug;

      await product.save();

      console.log(`✅ ${product.title}`);
      console.log(`   → ${slug}`);
    } catch (error) {
      console.log(`❌ Failed for: ${product.title}`);
      console.error(error.message);
    }
  }

  console.log("🎉 Done! Sab products ko slug mil gayi.");

  process.exit(0);
};

run().catch((err) => {
  console.error("❌ Script failed");
  console.error(err);
  process.exit(1);
});