import Product from '../models/Product.js';
import cloudinary from '../config/cloudinary.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';

const uploadImageBuffer = (buffer, folder) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder }, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    stream.end(buffer);
  });

// GET /api/products?search=&category=&minPrice=&maxPrice=&isOrganic=&sort=&page=&limit=
export const getProducts = asyncHandler(async (req, res) => {
  const {
    search,
    category,
    minPrice,
    maxPrice,
    isOrganic,
    isFeatured,
    sort = '-createdAt',
    page = 1,
    limit = 12,
  } = req.query;

  const filter = { isActive: true };

  if (search) filter.$text = { $search: search };
  if (category) filter.category = category;
  if (isOrganic !== undefined) filter.isOrganic = isOrganic === 'true';
  if (isFeatured !== undefined) filter.isFeatured = isFeatured === 'true';
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(50, Math.max(1, Number(limit)));
  const skip = (pageNum - 1) * limitNum;

  const [products, total] = await Promise.all([
    Product.find(filter).populate('category', 'name slug').sort(sort).skip(skip).limit(limitNum),
    Product.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: products,
    pagination: {
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      limit: limitNum,
    },
  });
});

export const getProductBySlug = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug, isActive: true }).populate(
    'category',
    'name slug'
  );
  if (!product) throw new ApiError(404, 'Product not found');
  res.json({ success: true, data: product });
});

export const createProduct = asyncHandler(async (req, res) => {
  const body = req.body;

  let images = [];
  if (req.files && req.files.length) {
    const uploads = await Promise.all(
      req.files.map((file) => uploadImageBuffer(file.buffer, 'organic-food/products'))
    );
    images = uploads.map((r) => ({ url: r.secure_url, publicId: r.public_id }));
  }

  const product = await Product.create({
    name: body.name,
    description: body.description,
    price: body.price,
    discountPrice: body.discountPrice || 0,
    unit: body.unit,
    stock: body.stock,
    category: body.category,
    images,
    isOrganic: body.isOrganic !== undefined ? body.isOrganic === 'true' : true,
    origin: body.origin || '',
    tags: body.tags ? body.tags.split(',').map((t) => t.trim()) : [],
    isFeatured: body.isFeatured === 'true',
  });

  res.status(201).json({ success: true, data: product });
});

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, 'Product not found');

  const fields = [
    'name',
    'description',
    'price',
    'discountPrice',
    'unit',
    'stock',
    'category',
    'origin',
    'isOrganic',
    'isFeatured',
    'isActive',
  ];

  fields.forEach((field) => {
    if (req.body[field] !== undefined) {
      if (field === 'isOrganic' || field === 'isFeatured' || field === 'isActive') {
        product[field] = req.body[field] === 'true' || req.body[field] === true;
      } else {
        product[field] = req.body[field];
      }
    }
  });

  if (req.body.tags) {
    product.tags = req.body.tags.split(',').map((t) => t.trim());
  }

  if (req.files && req.files.length) {
    const uploads = await Promise.all(
      req.files.map((file) => uploadImageBuffer(file.buffer, 'organic-food/products'))
    );
    product.images.push(...uploads.map((r) => ({ url: r.secure_url, publicId: r.public_id })));
  }

  await product.save();
  res.json({ success: true, data: product });
});

export const deleteProductImage = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, 'Product not found');

  const { publicId } = req.body;
  const image = product.images.find((img) => img.publicId === publicId);
  if (!image) throw new ApiError(404, 'Image not found on this product');

  await cloudinary.uploader.destroy(publicId);
  product.images = product.images.filter((img) => img.publicId !== publicId);
  await product.save();

  res.json({ success: true, data: product });
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, 'Product not found');

  if (product.images.length) {
    await Promise.all(product.images.map((img) => cloudinary.uploader.destroy(img.publicId)));
  }
  await product.deleteOne();

  res.json({ success: true, message: 'Product deleted' });
});
