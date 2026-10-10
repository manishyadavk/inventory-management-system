// OPTIONAL helper, not part of the assignment API. Run with: npm run seed
// Inserts sample products. Products whose SKU already exists are left unchanged.
require('dotenv').config({ quiet: true });

const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Product = require('../models/Product');

const sampleProducts = [
  { name: 'Wireless Mouse', sku: 'ELEC-001', category: 'Electronics', price: 799, quantity: 50, reorderLevel: 10, supplier: 'TechSupply Co.' },
  { name: 'Mechanical Keyboard', sku: 'ELEC-002', category: 'Electronics', price: 3499, quantity: 8, reorderLevel: 10, supplier: 'TechSupply Co.' },
  { name: 'USB-C Charger 65W', sku: 'ELEC-003', category: 'Electronics', price: 1299, quantity: 25, reorderLevel: 15, supplier: 'VoltEdge Traders' },
  { name: 'Ballpoint Pens (Pack of 10)', sku: 'STAT-001', category: 'Stationery', price: 120, quantity: 200, reorderLevel: 50, supplier: 'PaperWorld' },
  { name: 'A4 Notebook', sku: 'STAT-002', category: 'Stationery', price: 85, quantity: 40, reorderLevel: 40, supplier: 'PaperWorld' },
  { name: 'Office Chair', sku: 'FURN-001', category: 'Furniture', price: 6999, quantity: 12, reorderLevel: 5, supplier: 'Comfort Interiors' },
  { name: 'Standing Desk', sku: 'FURN-002', category: 'Furniture', price: 15499, quantity: 3, reorderLevel: 5, supplier: 'Comfort Interiors' },
  { name: 'Basmati Rice 5kg', sku: 'GROC-001', category: 'Grocery', price: 650, quantity: 0, reorderLevel: 20, supplier: 'Daily Fresh Foods' }
];

const seed = async () => {
  try {
    await connectDB();
    const result = await Product.bulkWrite(
      sampleProducts.map((product) => ({
        updateOne: { filter: { sku: product.sku }, update: { $setOnInsert: product }, upsert: true }
      }))
    );
    console.log(`Seed complete: ${result.upsertedCount} added, ${sampleProducts.length - result.upsertedCount} already existed`);
  } catch (error) {
    console.error(`Seeding failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

seed();
