/**
 * Search Routes (searchRoutes.js)
 * --------------------------------
 * Endpoints for natural language smart search.
 */

import express from 'express';
import { searchBills } from '../controllers/searchController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.post('/', searchBills);
router.get('/', searchBills);

export default router;
