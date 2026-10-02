/**
 * Recurring Routes (recurringRoutes.js)
 * -------------------------------------
 * Routes for listing, auto-detecting, manually adding, and paying recurring subscriptions.
 */

import express from 'express';
import {
  getRecurring,
  createRecurring,
  updateRecurring,
  deleteRecurring,
} from '../controllers/recurringController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/').get(getRecurring).post(createRecurring);
router.route('/:id').patch(updateRecurring).delete(deleteRecurring);

export default router;
