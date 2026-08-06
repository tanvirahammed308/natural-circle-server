import Category from '../models/Category.js';
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

export const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find().sort({ name: 1 });
  res.json({ success: true, data: categories });
});

export const getCategoryBySlug = asyncHandler(async (req, res) => {
  const category = await Category.findOne({ slug: req.params.slug });
  if (!category) throw new ApiError(404, 'Category not found');
  res.json({ success: true, data: category });
});

export const createCategory = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  let image = { url: '', publicId: '' };
  if (req.file) {
    const result = await uploadImageBuffer(req.file.buffer, 'organic-food/categories');
    image = { url: result.secure_url, publicId: result.public_id };
  }

  const category = await Category.create({ name, description, image });
  res.status(201).json({ success: true, data: category });
});

export const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw new ApiError(404, 'Category not found');

  const { name, description } = req.body;
  if (name) category.name = name;
  if (description !== undefined) category.description = description;

  if (req.file) {
    if (category.image?.publicId) {
      await cloudinary.uploader.destroy(category.image.publicId);
    }
    const result = await uploadImageBuffer(req.file.buffer, 'organic-food/categories');
    category.image = { url: result.secure_url, publicId: result.public_id };
  }

  await category.save();
  res.json({ success: true, data: category });
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw new ApiError(404, 'Category not found');

  if (category.image?.publicId) {
    await cloudinary.uploader.destroy(category.image.publicId);
  }
  await category.deleteOne();

  res.json({ success: true, message: 'Category deleted' });
});
