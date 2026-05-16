const mongoose = require("mongoose");
const Category = require("../model/Category");
require("dotenv").config();

const slugify = (text = "") => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/&/g, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const migrate = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const categories = await Category.find({}).lean();
    console.log(`📊 Found ${categories.length} categories\n`);

    const existingSlugs = new Set(
      categories.map((cat) => cat.slug).filter(Boolean)
    );

    const bulkOps = [];
    let createdCount = 0;
    let updatedCount = 0;

    for (const cat of categories) {
      const parentSlug = slugify(cat.parent || "");
      const nextSlug = parentSlug;

      // update parent only if needed
      if (cat.slug !== nextSlug || cat.parentSlug !== parentSlug) {
        bulkOps.push({
          updateOne: {
            filter: { _id: cat._id },
            update: {
              $set: {
                parentSlug,
                slug: nextSlug,
              },
            },
          },
        });
        updatedCount++;
        existingSlugs.add(nextSlug);
      }

      // create child docs
      if (Array.isArray(cat.children) && cat.children.length > 0) {
        for (const child of cat.children) {
          const childSlug = slugify(child || "");
          const combinedSlug = `${parentSlug}/${childSlug}`;

          if (existingSlugs.has(combinedSlug)) {
            continue;
          }

          bulkOps.push({
            insertOne: {
              document: {
                parent: cat.parent,
                parentSlug,
                child,
                childSlug,
                slug: combinedSlug,
                productType: cat.productType,
                status: cat.status,
                img: cat.img,
                description: cat.description || `${cat.parent} - ${child}`,
                products: cat.products || [],
                children: [],
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            },
          });

          existingSlugs.add(combinedSlug);
          createdCount++;
        }
      }
    }

    if (bulkOps.length > 0) {
      await Category.bulkWrite(bulkOps, { ordered: false });
    }

    console.log(`\n✅ Migration complete!`);
    console.log(`   Parent documents updated: ${updatedCount}`);
    console.log(`   Child documents created: ${createdCount}`);

    await mongoose.disconnect();
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
};

migrate();