/**
 * EMI Model (EMI.js)
 * ------------------
 * Represents an Equated Monthly Installment (EMI) commitment for high-value purchases.
 * 
 * Distinct from recurring bills:
 * - Fixed total financed amount
 * - Fixed tenure (months)
 * - Tracked payment milestones (months completed vs remaining)
 * - Auto-computed completion percentage and definitive loan end date.
 */

import mongoose from 'mongoose';

const emiPaymentSchema = new mongoose.Schema(
  {
    installmentNumber: {
      type: Number,
      required: true,
    },
    paidAt: {
      type: Date,
      default: Date.now,
    },
    amount: {
      type: Number,
      required: true,
      min: [0, 'Payment amount must be positive'],
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: true }
);

const emiSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Product or EMI name is required'],
      trim: true,
    },
    lender: {
      type: String,
      required: [true, 'Store or Lender name is required'],
      trim: true,
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total financed amount is required'],
      min: [1, 'Total amount must be greater than zero'],
    },
    monthlyAmount: {
      type: Number,
      required: [true, 'Monthly EMI installment is required'],
      min: [1, 'Monthly amount must be greater than zero'],
    },
    tenureMonths: {
      type: Number,
      required: [true, 'Total tenure in months is required'],
      min: [1, 'Tenure must be at least 1 month'],
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
      default: Date.now,
    },
    dueDay: {
      type: Number,
      required: [true, 'EMI due day of month is required'],
      min: [1, 'Due day must be between 1 and 31'],
      max: [31, 'Due day must be between 1 and 31'],
      default: 5,
    },
    category: {
      type: String,
      enum: ['Electronics', 'Shopping', 'Appliances', 'Vehicles', 'Education', 'Personal Loan', 'Home', 'Bills', 'Other'],
      default: 'Electronics',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['active', 'due_soon', 'overdue', 'completed'],
      default: 'active',
    },
    payments: [emiPaymentSchema],
  },
  {
    timestamps: true,
  }
);

// Index to efficiently query user's EMIs sorted by creation or due day
emiSchema.index({ userId: 1, status: 1 });

const EMI = mongoose.model('EMI', emiSchema);

export default EMI;
