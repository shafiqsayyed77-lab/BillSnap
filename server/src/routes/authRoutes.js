/**
 * Authentication Routes (authRoutes.js)
 * -------------------------------------
 * Public and private authentication endpoints.
 */

import express from 'express';
import { signup, login, getMe, updateProfile } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Public routes for user onboarding and session creation
router.post('/signup', signup);
router.post('/login', login);

// Protected routes to fetch/update current session user info
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);

export default router;
