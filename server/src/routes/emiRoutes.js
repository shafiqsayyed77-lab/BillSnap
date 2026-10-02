/**
 * EMI Routes (emiRoutes.js)
 * -------------------------
 * Protected routes for Equated Monthly Installment (EMI) management.
 */

import express from 'express';
import {
  getEMIs,
  getEMIById,
  createEMI,
  updateEMI,
  deleteEMI,
  recordPayment,
  undoPayment,
} from '../controllers/emiController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getEMIs)
  .post(createEMI);

router.route('/:id')
  .get(getEMIById)
  .patch(updateEMI)
  .delete(deleteEMI);

router.post('/:id/pay', recordPayment);
router.post('/:id/undo-pay', undoPayment);

export default router;
