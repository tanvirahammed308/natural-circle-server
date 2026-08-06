import mongoose from 'mongoose';
import slugify from 'slugify';

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, index: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    discountPrice: { type: Number, min: 0, default: 0 },
    unit: {
      type: String,
      enum: ['kg', 'g', 'lb', 'piece', 'dozen', 'liter', 'ml', 'pack'],
      required: true,
    },
    stock: { type: Number, required: true, min: 0, default: 0 },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    images: { type: [imageSchema], default: [] },
    isOrganic: { type: Boolean, default: true },
    origin: { type: String, default: '' },
    nutrition: {
      calories: Number,
      protein: Number,
      carbs: Number,
      fat: Number,
      fiber: Number,
    },
    tags: { type: [String], default: [] },
    ratingsAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingsCount: { type: Number, default: 0 },
    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

productSchema.index({ name: 'text', description: 'text', tags: 'text' });

productSchema.pre('save', function preSave(next) {
  if (this.isModified('name')) {
    this.slug = `${slugify(this.name, { lower: true, strict: true })}-${Date.now().toString(36)}`;
  }
  next();
});

productSchema.virtual('finalPrice').get(function getFinalPrice() {
  return this.discountPrice > 0 ? this.discountPrice : this.price;
});

productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

export default mongoose.model('Product', productSchema);
