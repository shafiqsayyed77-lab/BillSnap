/**
 * Passkey Routes (passkeyRoutes.js)
 * ---------------------------------
 * Endpoints for WebAuthn passkey registration, authentication and device management.
 */

import express from 'express';
import {
  getRegisterOptions,
  verifyRegistration,
  getLoginOptions,
  verifyLogin,
  listPasskeys,
  deletePasskey,
} from '../controllers/passkeyController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Public routes for passkey sign-in
router.post('/login-options', getLoginOptions);
router.post('/verify-login', verifyLogin);

// Protected routes for enrolling and managing passkeys
router.post('/register-options', protect, getRegisterOptions);
router.post('/verify-registration', protect, verifyRegistration);
router.get('/list', protect, listPasskeys);
router.delete('/:id', protect, deletePasskey);

export default router;
