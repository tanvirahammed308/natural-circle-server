import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';

export const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, data: req.user });
});

export const updateMe = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;
  if (name) req.user.name = name;
  if (phone !== undefined) req.user.phone = phone;
  await req.user.save();
  res.json({ success: true, data: req.user });
});

export const addAddress = asyncHandler(async (req, res) => {
  const { label, street, city, state, postalCode, country, phone, isDefault } = req.body;

  if (isDefault) {
    req.user.addresses.forEach((addr) => {
      addr.isDefault = false;
    });
  }

  req.user.addresses.push({ label, street, city, state, postalCode, country, phone, isDefault });
  await req.user.save();

  res.status(201).json({ success: true, data: req.user.addresses });
});

export const updateAddress = asyncHandler(async (req, res) => {
  const address = req.user.addresses.id(req.params.addressId);
  if (!address) throw new ApiError(404, 'Address not found');

  const fields = ['label', 'street', 'city', 'state', 'postalCode', 'country', 'phone'];
  fields.forEach((field) => {
    if (req.body[field] !== undefined) address[field] = req.body[field];
  });

  if (req.body.isDefault) {
    req.user.addresses.forEach((addr) => {
      addr.isDefault = false;
    });
    address.isDefault = true;
  }

  await req.user.save();
  res.json({ success: true, data: req.user.addresses });
});

export const deleteAddress = asyncHandler(async (req, res) => {
  const address = req.user.addresses.id(req.params.addressId);
  if (!address) throw new ApiError(404, 'Address not found');

  address.deleteOne();
  await req.user.save();

  res.json({ success: true, data: req.user.addresses });
});

// Admin: list & manage users
export const getUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(100, Math.max(1, Number(limit)));

  const [users, total] = await Promise.all([
    User.find()
      .select('-addresses')
      .sort('-createdAt')
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    User.countDocuments(),
  ]);

  res.json({
    success: true,
    data: users,
    pagination: { total, page: pageNum, pages: Math.ceil(total / limitNum) },
  });
});

export const setUserRole = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');

  user.role = req.body.role;
  await user.save();

  res.json({ success: true, data: user });
});

export const toggleBlockUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');

  user.isBlocked = !user.isBlocked;
  await user.save();

  res.json({ success: true, data: user });
});
