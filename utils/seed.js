import 'dotenv/config';
import connectDB from '../config/db.js';
import Category from '../models/Category.js';

const run = async () => {
  await connectDB();

  const categories = [
    { name: 'Fresh Vegetables', description: 'Locally sourced organic vegetables' },
    { name: 'Fresh Fruits', description: 'Seasonal organic fruits' },
    { name: 'Dairy & Eggs', description: 'Organic dairy products and free-range eggs' },
    { name: 'Grains & Pulses', description: 'Whole grains, rice, and lentils' },
  ];

  for (const cat of categories) {
    await Category.findOneAndUpdate({ name: cat.name }, cat, { upsert: true, new: true });
  }

  console.log('Seed complete');
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
