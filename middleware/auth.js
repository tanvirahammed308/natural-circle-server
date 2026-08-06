import admin from '../config/firebase.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

// Verifies the Firebase ID token sent as "Authorization: Bearer <token>"
// and attaches the corresponding local MongoDB user to req.user.
export const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization || '';

  if (!authHeader.startsWith('Bearer ')) {
    throw new ApiError(401, 'Not authorized, no token provided');
  }

  const token = authHeader.split(' ')[1];

  let decodedToken;
  try {
    decodedToken = await admin.auth().verifyIdToken(token);
  } catch (err) {
    throw new ApiError(401, 'Not authorized, invalid or expired token');
  }

  let user = await User.findOne({ firebaseUid: decodedToken.uid });

  // Auto-provision a local profile the first time a verified Firebase user hits the API
  if (!user) {
    user = await User.create({
      firebaseUid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name || decodedToken.email?.split('@')[0] || 'User',
      avatar: decodedToken.picture || '',
      provider: decodedToken.firebase?.sign_in_provider || 'password',
    });
  }

  if (user.isBlocked) {
    throw new ApiError(403, 'This account has been blocked');
  }

  req.user = user;
  next();
});

// Restricts access to specific roles, e.g. authorize('admin')
export const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    throw new ApiError(403, 'You do not have permission to perform this action');
  }
  next();
};
