require('dotenv').config();

const connectDB = require('../config/db');
const Category = require('../model/Category');
const Products = require('../model/Products');
const Brand = require('../model/Brand');

const COLLECTION_NAME = 'The Midnight Drop';
const COLLECTION_SLUG = 'the-midnight-drop';

const midnightDropProducts = [
  { title: 'Serpent Glow Ring', children: 'Rings', price: 159 },
  { title: 'Lumiere Bloom Ring', children: 'Rings', price: 169 },
  { title: 'Silver Fox Ring', children: 'Rings', price: 149 },
  { title: 'The Absolute Crimson Ring', children: 'Rings', price: 189 },
  { title: 'ucid Silver Tennis Bracelet', children: 'Bracelets', price: 209 },
  { title: 'Silver Snake Bracelet', children: 'Bracelets', price: 199 },
  { title: 'Duo-Glow Tennis Bracelet', children: 'Bracelets', price: 219 },
  { title: 'Red Stone Heart Bracelet', children: 'Bracelets', price: 179 },
  { title: 'Viper Pave Snake Earrings', children: 'Earrings', price: 169 },
  { title: 'Silver Rectangle Drops', children: 'Earrings', price: 139 },
  { title: 'Silver Butterfly Studs', children: 'Earrings', price: 119 },
  { title: 'Leaf Silver Earrings', children: 'Earrings', price: 149 },
  { title: 'Bow Earrings', children: 'Earrings', price: 129 },
  { title: 'Silver Tassel Statement Necklace', children: 'Necklaces', price: 229 },
  { title: 'The Duo Necklace', children: 'Necklaces', price: 199 },
  { title: 'Prism Heart Necklace', children: 'Necklaces', price: 189 },
  { title: 'Azur Silver Necklace', children: 'Necklaces', price: 179 },
];

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

const imageFor = (title) => `https://placehold.co/600x600/png?text=${encodeURIComponent(title)}`;

const run = async () => {
  try {
    await connectDB();

    let brand = await Brand.findOne({ name: 'Louis Vuitton' });
    if (!brand) {
      brand = await Brand.findOne({ status: 'active' }).sort({ createdAt: 1 });
    }
    if (!brand) {
      throw new Error('No brand found. Please create at least one active brand first.');
    }

    const categoryChildren = Array.from(new Set(midnightDropProducts.map((p) => p.children)));
    const category = await Category.findOneAndUpdate(
      { parent: COLLECTION_NAME },
      {
        parent: COLLECTION_NAME,
        productType: 'jewelry',
        img: imageFor(COLLECTION_NAME),
        children: categoryChildren,
        status: 'Show',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const upsertedProductIds = [];

    for (const product of midnightDropProducts) {
      const slug = slugify(product.title);
      const img = imageFor(product.title);
      const upserted = await Products.findOneAndUpdate(
        { slug, 'category.id': category._id },
        {
          sku: `MND-${slug.slice(0, 8).toUpperCase()}`,
          img,
          title: product.title,
          slug,
          unit: '925 Silver',
          imageURLs: [{ img }],
          parent: COLLECTION_NAME,
          children: product.children,
          price: product.price,
          discount: 0,
          quantity: 25,
          brand: {
            name: brand.name,
            id: brand._id,
          },
          category: {
            name: COLLECTION_NAME,
            id: category._id,
          },
          status: 'in-stock',
          reviews: [],
          productType: 'jewelry',
          description: `${product.title} from the temporary ${COLLECTION_NAME} collection.`,
          additionalInformation: [{ key: 'Collection', value: COLLECTION_NAME }],
          tags: [COLLECTION_SLUG, slugify(product.children)],
          featured: false,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      upsertedProductIds.push(upserted._id);
    }

    await Category.findByIdAndUpdate(category._id, {
      products: upsertedProductIds,
      children: categoryChildren,
    });

    await Brand.findByIdAndUpdate(brand._id, {
      $addToSet: { products: { $each: upsertedProductIds } },
    });

    const finalCategory = await Category.findById(category._id);
    const count = await Products.countDocuments({ 'category.id': category._id });

    console.log('Midnight Drop import complete.');
    console.log(`Category: ${finalCategory.parent}`);
    console.log(`Category ID: ${finalCategory._id}`);
    console.log(`Products in category: ${count}`);
    console.log(`Brand linked: ${brand.name}`);

    process.exit(0);
  } catch (error) {
    console.error('Midnight Drop import failed:', error.message);
    process.exit(1);
  }
};

run();
