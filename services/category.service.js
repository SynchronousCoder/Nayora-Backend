const ApiError = require('../errors/api-error');
const Category = require('../model/Category');

const normalizeType = (value = '') => String(value).trim().toLowerCase();

const resolveTypeAliases = (value = '') => {
  const normalized = normalizeType(value);
  if (['jewelry', 'jewellery', 'jwellery'].includes(normalized)) {
    return ['jewelry', 'jewellery', 'jwellery'];
  }
  return [normalized];
};

const normalizePayloadType = (payload = {}) => {
  const nextPayload = { ...payload };
  const type = normalizeType(nextPayload.productType);
  if (['jewelry', 'jewellery', 'jwellery'].includes(type)) {
    nextPayload.productType = 'jewelry';
  } else if (type) {
    nextPayload.productType = type;
  }
  return nextPayload;
};

const slugify = (text = '') => {
  return text.toString().toLowerCase().trim()
    .replace(/&/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
};

exports.createCategoryService = async (data) => {
  const normalized = normalizePayloadType(data);
  if (!normalized.slug && normalized.parent) {
    normalized.slug = slugify(normalized.parent);
  }
  const category = await Category.create(normalized);
  return category;
};

exports.addAllCategoryService = async (data) => {
  await Category.deleteMany();
  const dataWithSlugs = data.map(item => ({
    ...item,
    slug: slugify(item.parent || ''),
  }));
  const category = await Category.insertMany(dataWithSlugs);
  return category;
};

// ✅ populate HATAYA - products sirf IDs return honge
exports.getShowCategoryServices = async () => {
  const categories = await Category.aggregate([
    { 
      $match: { 
        status: 'Show',
        // Sirf parent documents — child field nahi honi chahiye
        child: { $exists: false }
      } 
    },
    { $sort: { parent: 1 } }
  ]);
  return categories;
};

exports.getAllCategoryServices = async () => {
  const category = await Category.find({});
  return category;
};

// ✅ populate HATAYA
exports.getCategoryTypeService = async (param) => {
  const typeAliases = resolveTypeAliases(param);
  const categories = await Category.find({ productType: { $in: typeAliases } });
  return categories;
};

exports.deleteCategoryService = async (id) => {
  const result = await Category.findByIdAndDelete(id);
  return result;
};

exports.updateCategoryService = async (id, payload) => {
  const isExist = await Category.findOne({ _id: id });
  if (!isExist) {
    throw new ApiError(404, 'Category not found!');
  }
  const normalized = normalizePayloadType(payload);
  if (normalized.parent) {
    normalized.slug = slugify(normalized.parent);
  }
  const result = await Category.findOneAndUpdate({ _id: id }, normalized, { new: true });
  return result;
};

exports.getSingleCategoryService = async (id) => {
  const result = await Category.findById(id);
  return result;
};

// ✅ slug based - populate WITH products (sirf yahan chahiye)
exports.getCategoryBySlugService = async (slug) => {
  // Try exact slug match pehle
  let result = await Category.findOne({ slug }).populate('products');
  
  // Agar nahi mila, try case-insensitive
  if (!result) {
    result = await Category.findOne({ 
      slug: { $regex: new RegExp(`^${slug}$`, 'i') } 
    }).populate('products');
  }
  
  return result;
};