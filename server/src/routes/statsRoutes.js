/**
 * Stats Routes (statsRoutes.js)
 * ------------------------------
 * Endpoints for monthly financial statistics and analytical insights.
 */

import express from 'express';
import { getMonthlyStats, getInsights } from '../controllers/statsController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', getMonthlyStats);
router.get('/monthly', getMonthlyStats);
router.get('/insights', getInsights);

export default router;
