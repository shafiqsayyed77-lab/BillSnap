/**
 * Authentication Controller (authController.js)
 * ---------------------------------------------
 * Handles user registration, login, and profile fetching.
 * 
 * Beginner Concept:
 * - Passwords are NEVER saved in plain text. We hash them using bcryptjs with a cryptographic salt.
 * - JSON Web Tokens (JWT) act as a digital passport. Once the user provides valid credentials,
 *   they receive a signed token to access protected endpoints.
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Generate a signed JWT token containing the user's MongoDB ID.
 */
export const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'billsnap_super_secret_jwt_key_2026_change_in_production',
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    }
  );
};

/**
 * @route   POST /api/auth/signup
 * @desc    Register a new user account
 * @access  Public
 */
export const signup = async (req, res, next) => {
  try {
    const { name, email, password, monthlyBudget } = req.body;

    // 1. Validate required inputs
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Name is required.' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ message: 'Email is required.' });
    }
    // Email regex validation
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ message: 'Please provide a valid email address.' });
    }
    // Password min length check
    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 2. Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: 'An account with this email already exists.' });
    }

    // 3. Hash the password with bcrypt (salt rounds = 10)
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 4. Create the new user
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      monthlyBudget: monthlyBudget !== undefined ? Number(monthlyBudget) : 20000,
    });

    // 5. Generate token and return response
    const token = generateToken(user._id);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        monthlyBudget: user.monthlyBudget,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user & return token
 * @access  Public
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate inputs
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide both email and password.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find user in database
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Compare provided password with stored hash
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Generate token
    const token = generateToken(user._id);

    res.status(200).json({
      token,
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        monthlyBudget: user.monthlyBudget,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/auth/me
 * @desc    Get currently authenticated user's profile
 * @access  Private (Scoped to req.user)
 */
export const getMe = async (req, res, next) => {
  try {
    // req.user was populated by auth middleware
    res.status(200).json({
      user: req.user,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   PUT /api/auth/profile
 * @desc    Update current user's profile and budget preferences
 * @access  Private (Scoped to req.user)
 */
export const updateProfile = async (req, res, next) => {
  try {
    const { name, monthlyBudget } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (name) user.name = name.trim();
    if (monthlyBudget !== undefined && !isNaN(Number(monthlyBudget))) {
      user.monthlyBudget = Math.max(0, Number(monthlyBudget));
    }

    await user.save();

    res.status(200).json({
      message: 'Profile updated successfully.',
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        monthlyBudget: user.monthlyBudget,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
};
