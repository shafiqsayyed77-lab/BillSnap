/**
 * Recurring Model (Recurring.js)
 * ------------------------------
 * Tracks recurring subscriptions and periodic utility bills (e.g., Netflix, Jio, Rent, Gym).
 * 
 * Beginner Concept:
 * Recurring bills can be detected automatically from a user's bill history by analyzing
 * repeat stores, consistent amounts, and intervals (weekly, monthly, yearly), or added manually.
 */

import mongoose from 'mongoose';

const recurringSchema = new mongoose.Schema(
  {
    // The user who owns this recurring obligation
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    // Service/Bill name (e.g., "Netflix Subscription", "Jio Recharge")
    name: {
      type: String,
      required: [true, 'Recurring bill name is required'],
      trim: true,
    },
    // Expected amount per cycle in INR (₹)
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    // Billing interval in days (e.g., 7 for weekly, 30 for monthly, 365 for annual)
    interval: {
      type: Number,
      required: [true, 'Interval in days is required'],
      min: [1, 'Interval must be at least 1 day'],
    },
    // The next date this bill is due
    nextDue: {
      type: Date,
      required: [true, 'Next due date is required'],
    },
    // Reference to historical bills that triggered this recurring detection
    sourceBillIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bill',
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Index to quickly find upcoming bills due for a specific user
recurringSchema.index({ userId: 1, nextDue: 1 });

const Recurring = mongoose.model('Recurring', recurringSchema);

export default Recurring;
