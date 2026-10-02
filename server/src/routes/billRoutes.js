/**
 * Bill Routes (billRoutes.js)
 * ----------------------------
 * Endpoints for creating, searching, updating, and deleting bills.
 */

import express from 'express';
import {
  createBill,
  getBills,
  getBillById,
  updateBill,
  deleteBill,
  checkDuplicateBill,
  getPriceHistory,
  getTimeline,
} from '../controllers/billController.js';
import { protect } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

// All bill routes require valid authentication
router.use(protect);

router
  .route('/')
  .post(upload.single('image'), createBill)
  .get(getBills);

// Static custom feature endpoints (must come before /:id)
router.post('/check-duplicate', checkDuplicateBill);
router.get('/price-history', getPriceHistory);
router.get('/timeline', getTimeline);

router
  .route('/:id')
  .get(getBillById)
  .patch(upload.single('image'), updateBill)
  .delete(deleteBill);

export default router;
