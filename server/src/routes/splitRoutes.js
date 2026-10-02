/**
 * Split Routes (splitRoutes.js)
 * ------------------------------
 * Endpoints for creating splits, listing splits, and updating participant shares/status.
 */

import express from 'express';
import {
  createSplit,
  getSplits,
  getSplitById,
  updateParticipant,
} from '../controllers/splitController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/').post(createSplit).get(getSplits);
router.route('/:id').get(getSplitById);
router.route('/:id/people/:personId').patch(updateParticipant);

export default router;
