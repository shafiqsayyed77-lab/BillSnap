/**
 * Alert Routes (alertRoutes.js)
 * ------------------------------
 * Endpoints for deadlines and financial alerts feed.
 */

import express from 'express';
import { getAlerts } from '../controllers/alertController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', getAlerts);

export default router;
