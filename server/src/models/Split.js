/**
 * Split Model (Split.js)
 * ----------------------
 * Represents a bill split among multiple people (friends, roommates, colleagues).
 * 
 * Beginner Concept:
 * When users dine out or share expenses, they can create a split.
 * BillSnap tracks each person's share and whether they have paid ('paid') or not ('pending').
 * The 'outstanding' amount is automatically recalculated whenever a person's status changes.
 */

import mongoose from 'mongoose';

// Sub-schema for each participant in the split
const splitPersonSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Person name is required'],
      trim: true,
    },
    share: {
      type: Number,
      required: [true, 'Share amount is required'],
      min: [0, 'Share amount cannot be negative'],
    },
    status: {
      type: String,
      enum: ['pending', 'paid'],
      default: 'pending',
    },
  },
  { _id: true }
);

const splitSchema = new mongoose.Schema(
  {
    // The user who created/manages this split
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    // The bill being split
    billId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bill',
      required: [true, 'Bill ID is required'],
    },
    // List of people involved with their shares
    people: {
      type: [splitPersonSchema],
      required: true,
      validate: [
        (val) => val.length > 0,
        'A split must have at least one participant',
      ],
    },
    // Total remaining unpaid amount across all participants with 'pending' status
    outstanding: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Method to re-calculate outstanding unpaid amount
splitSchema.methods.calculateOutstanding = function () {
  const pendingTotal = this.people
    .filter((p) => p.status === 'pending')
    .reduce((sum, p) => sum + p.share, 0);
  this.outstanding = Math.round(pendingTotal * 100) / 100;
  return this.outstanding;
};

// Hook to automatically update outstanding before save
splitSchema.pre('save', function (next) {
  this.calculateOutstanding();
  next();
});

const Split = mongoose.model('Split', splitSchema);

export default Split;
