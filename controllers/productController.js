const Product = require('../models/Product');
const { AppError } = require('../middleware/errorHandler');

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Copies only the allowed product fields from the request body.
// Unknown or protected fields (_id, createdAt, stockValue, ...) cause a 400 error.
const pickProductFields = (body) => {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError('Request body must be a JSON object', 400);
  }

  const unknownFields = Object.keys(body).filter((key) => !Product.EDITABLE_FIELDS.includes(key));
  if (unknownFields.length > 0) {
    throw new AppError(`These fields cannot be set: ${unknownFields.join(', ')}`, 400);
  }
  return body;
};

// Reads a query value that must be a number (e.g. minPrice). Returns undefined when absent.
const parseNumberParam = (value, name) => {
  if (value === undefined || value === '') return undefined;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw new AppError(`${name} must be a non-negative number`, 400);
  }
  return number;
};

// POST /api/products
const createProduct = async (req, res) => {
  const product = await Product.create(pickProductFields(req.body));
  res.status(201).json({ success: true, message: 'Product created successfully', product });
};

// GET /api/products
const getProducts = async (req, res) => {
  const { category, search, lowStock } = req.query;
  const sortBy = req.query.sortBy || 'createdAt';
  const order = (req.query.order || 'asc').toLowerCase();

  const sortableFields = ['name', 'price', 'quantity', 'createdAt'];
  if (!sortableFields.includes(sortBy)) {
    throw new AppError(`sortBy must be one of: ${sortableFields.join(', ')}`, 400);
  }
  if (!['asc', 'desc'].includes(order)) {
    throw new AppError("order must be 'asc' or 'desc'", 400);
  }
  if (lowStock !== undefined && !['true', 'false'].includes(lowStock)) {
    throw new AppError("lowStock must be 'true' or 'false'", 400);
  }

  const page = req.query.page === undefined ? 1 : Number(req.query.page);
  const limit = req.query.limit === undefined ? 10 : Number(req.query.limit);
  if (!Number.isInteger(page) || page < 1) {
    throw new AppError('page must be a positive integer', 400);
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new AppError('limit must be an integer between 1 and 100', 400);
  }

  const minPrice = parseNumberParam(req.query.minPrice, 'minPrice');
  const maxPrice = parseNumberParam(req.query.maxPrice, 'maxPrice');
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    throw new AppError('minPrice cannot be greater than maxPrice', 400);
  }

  // Build the filter. Every condition is optional and they combine with AND.
  const filter = {};
  if (category) {
    filter.category = new RegExp(`^${escapeRegex(category.trim())}$`, 'i');
  }
  if (search) {
    const pattern = new RegExp(escapeRegex(search.trim()), 'i');
    filter.$or = [{ name: pattern }, { sku: pattern }];
  }
  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {};
    if (minPrice !== undefined) filter.price.$gte = minPrice;
    if (maxPrice !== undefined) filter.price.$lte = maxPrice;
  }
  if (lowStock === 'true') {
    filter.$expr = { $lte: ['$quantity', '$reorderLevel'] };
  }

  // _id is a tie-breaker so pages stay stable when many products share the same sort value.
  const sort = { [sortBy]: order === 'asc' ? 1 : -1, _id: 1 };

  const [total, products] = await Promise.all([
    Product.countDocuments(filter),
    Product.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
  ]);

  res.json({
    success: true,
    total, // all products matching the filters
    page, // current page number
    totalPages: Math.ceil(total / limit),
    count: products.length, // products on this page
    products
  });
};

// GET /api/products/:id
const getProductById = async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new AppError('Product not found', 404);
  res.json({ success: true, product });
};

// PUT /api/products/:id
// Partial update: only the fields sent in the body are changed.
const updateProduct = async (req, res) => {
  const updates = pickProductFields(req.body);
  if (Object.keys(updates).length === 0) {
    throw new AppError('Provide at least one field to update', 400);
  }

  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { $set: updates },
    { returnDocument: 'after', runValidators: true }
  );
  if (!product) throw new AppError('Product not found', 404);

  res.json({ success: true, message: 'Product updated successfully', product });
};

// DELETE /api/products/:id
const deleteProduct = async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) throw new AppError('Product not found', 404);
  res.json({ success: true, message: 'Product deleted successfully' });
};

// PATCH /api/products/:id/stock
const adjustStock = async (req, res) => {
  const change = req.body && req.body.change;
  if (typeof change !== 'number' || !Number.isSafeInteger(change) || change === 0) {
    throw new AppError('change must be a non-zero integer (e.g. 10 or -5)', 400);
  }

  // One atomic operation: the quantity check and the $inc happen together inside MongoDB.
  // Two simultaneous requests can never push the quantity below zero.
  const product = await Product.findOneAndUpdate(
    { _id: req.params.id, quantity: { $gte: -change } },
    { $inc: { quantity: change } },
    { returnDocument: 'after' }
  );

  if (!product) {
    // The filter did not match: either the product is missing or stock is too low.
    const existing = await Product.findById(req.params.id);
    if (!existing) throw new AppError('Product not found', 404);
    throw new AppError(
      `Insufficient stock: available ${existing.quantity}, requested reduction ${-change}`,
      400
    );
  }

  const message =
    change > 0
      ? `Stock increased by ${change}. New quantity: ${product.quantity}`
      : `Stock decreased by ${-change}. New quantity: ${product.quantity}`;
  res.json({ success: true, message, product });
};

// GET /api/products/low-stock
const getLowStockProducts = async (req, res) => {
  const products = await Product.find({ $expr: { $lte: ['$quantity', '$reorderLevel'] } }).sort({
    quantity: 1,
    name: 1
  });
  res.json({ success: true, total: products.length, products });
};

// GET /api/products/summary
const getCategorySummary = async (req, res) => {
  const summary = await Product.aggregate([
    {
      $group: {
        _id: '$category',
        totalProducts: { $sum: 1 },
        totalQuantity: { $sum: '$quantity' },
        totalInventoryValue: { $sum: { $multiply: ['$price', '$quantity'] } },
        averagePrice: { $avg: '$price' }
      }
    },
    {
      $project: {
        _id: 0,
        category: '$_id',
        totalProducts: 1,
        totalQuantity: 1,
        totalInventoryValue: { $round: ['$totalInventoryValue', 2] },
        averagePrice: { $round: ['$averagePrice', 2] }
      }
    },
    { $sort: { category: 1 } }
  ]);

  res.json({ success: true, totalCategories: summary.length, summary });
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  adjustStock,
  getLowStockProducts,
  getCategorySummary
};
