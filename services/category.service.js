const ApiError = require('../errors/api-error');
const Category = require('../model/Category');
const Products = require('../model/Products');

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

// create category service
exports.createCategoryService = async (data) => {
  const category = await Category.create(normalizePayloadType(data));
  return category;
}

// create all category service
exports.addAllCategoryService = async (data) => {
  await Category.deleteMany()
  const category = await Category.insertMany(data);
  return category;
}

// get all show category service
exports.getShowCategoryServices = async () => {
  const category = await Category.find({status:'Show'}).populate('products');
  return category;
}

// get all category 
exports.getAllCategoryServices = async () => {
  const category = await Category.find({})
  return category;
}

// get type of category service
exports.getCategoryTypeService = async (param) => {
  const typeAliases = resolveTypeAliases(param);
  const categories = await Category.find({ productType: { $in: typeAliases } }).populate('products');
  return categories;
}

// get type of category service
exports.deleteCategoryService = async (id) => {
  const result = await Category.findByIdAndDelete(id);
  return result;
}

// update category
exports.updateCategoryService = async (id,payload) => {
  const isExist = await Category.findOne({ _id:id })

  if (!isExist) {
    throw new ApiError(404, 'Category not found !')
  }

  const result = await Category.findOneAndUpdate({ _id:id }, normalizePayloadType(payload), {
    new: true,
  })
  return result
}

// get single category
exports.getSingleCategoryService = async (id) => {
  const result = await Category.findById(id);
  return result;
}