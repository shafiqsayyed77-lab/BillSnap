/**
 * User Model (User.js)
 * --------------------
 * Represents a registered user in BillSnap.
 * 
 * Beginner Concept:
 * In Mongoose, a Schema defines the shape and structure of documents in a MongoDB collection.
 * Setting { timestamps: true } automatically adds 'createdAt' and 'updatedAt' fields.
 */

import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    // Full name of the user
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    // Unique email used for logging in, stored in lowercase to prevent duplicates
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    // Securely hashed password (never store plain-text passwords!)
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
    },
    // User's self-defined monthly budget in Indian Rupees (₹), default ₹20,000
    monthlyBudget: {
      type: Number,
      default: 20000,
      min: [0, 'Monthly budget cannot be negative'],
    },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt
  }
);

// Never expose passwordHash when converting document to JSON
userSchema.methods.toJSON = function () {
  const userObject = this.toObject();
  delete userObject.passwordHash;
  return userObject;
};

const User = mongoose.model('User', userSchema);

export default User;
