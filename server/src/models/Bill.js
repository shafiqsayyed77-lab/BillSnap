/**
 * Bill Model (Bill.js)
 * --------------------
 * Represents an individual bill/receipt scanned or entered by the user.
 * 
 * Beginner Concept:
 * An index speeds up queries on specific fields. Here, we create:
 * 1) A compound index on { userId: 1, date: -1 } so a user's bills can be fetched and sorted by date in milliseconds.
 * 2) A text index on 'store' and 'items.name' allowing fast full-text searching across store names and purchased products.
 */

import mongoose from 'mongoose';

// Sub-schema for individual line items on a bill
const billItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Item price is required'],
      min: [0, 'Item price cannot be negative'],
    },
  },
  { _id: true }
);

const billSchema = new mongoose.Schema(
  {
    // The user who owns this bill (scoped queries ensure privacy)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    // Store or merchant name (e.g., Zudio, Croma, Swiggy)
    store: {
      type: String,
      required: [true, 'Store name is required'],
      trim: true,
    },
    // Date of purchase (defaults to today's date if not specified)
    date: {
      type: Date,
      default: Date.now,
      required: true,
    },
    // Total bill amount in INR (₹)
    total: {
      type: Number,
      required: [true, 'Bill total is required'],
      min: [0, 'Bill total cannot be negative'],
    },
    // Detailed item list extracted via OCR or entered manually
    items: {
      type: [billItemSchema],
      default: [],
    },
    // Spending category with strict enum validation
    category: {
      type: String,
      enum: {
        values: [
          'Food',
          'Shopping',
          'Electronics',
          'Groceries',
          'Bills',
          'Travel',
          'Health',
          'Other',
        ],
        message: '{VALUE} is not a supported category',
      },
      default: 'Other',
    },
    // Path or URL to the uploaded receipt image
    imageUrl: {
      type: String,
      default: null,
    },
    // Warranty expiration date (auto-calculated for Electronics or manually set)
    warrantyExpiry: {
      type: Date,
      default: null,
    },
    // Return window deadline (auto-calculated for Shopping or manually set)
    returnUntil: {
      type: Date,
      default: null,
    },
    // Optional personal notes or warranty instructions
    notes: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast timeline retrieval scoped per user
billSchema.index({ userId: 1, date: -1 });

// Full-text search index across store name and purchased item names
billSchema.index({ store: 'text', 'items.name': 'text' });

const Bill = mongoose.model('Bill', billSchema);

export default Bill;
