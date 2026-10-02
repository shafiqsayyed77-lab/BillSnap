/**
 * EMI Controller (emiController.js)
 * ----------------------------------
 * Handles complete lifecycle of loan installments and EMI commitments.
 * Ensures strict multi-tenant isolation (every query filtered by req.user._id).
 */

import EMI from '../models/EMI.js';
import { enrichEMI, calculateEMISummary } from '../utils/emiCalculator.js';

/**
 * @route   GET /api/emis
 * @desc    Retrieve all EMIs for authenticated user with dashboard metrics
 * @access  Private (Scoped to req.user)
 */
export const getEMIs = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const rawEmis = await EMI.find({ userId }).sort({ createdAt: -1 });

    const emis = rawEmis.map((e) => enrichEMI(e));
    const summary = calculateEMISummary(emis);

    res.status(200).json({ emis, summary });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/emis/:id
 * @desc    Get detailed breakdown for a single EMI
 * @access  Private (Scoped to req.user)
 */
export const getEMIById = async (req, res, next) => {
  try {
    const emi = await EMI.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!emi) {
      return res.status(404).json({ message: 'EMI record not found.' });
    }

    res.status(200).json({ emi: enrichEMI(emi) });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   POST /api/emis
 * @desc    Create a new EMI loan tracker
 * @access  Private (Scoped to req.user)
 */
export const createEMI = async (req, res, next) => {
  try {
    const {
      name,
      lender,
      totalAmount,
      monthlyAmount,
      tenureMonths,
      startDate,
      dueDay,
      category,
      notes,
    } = req.body;

    if (!name || !lender || !totalAmount || !tenureMonths) {
      return res.status(400).json({
        message: 'Name, lender, total financed amount, and tenure in months are required.',
      });
    }

    const numTotal = Number(totalAmount);
    const numTenure = Number(tenureMonths);

    if (isNaN(numTotal) || numTotal <= 0 || isNaN(numTenure) || numTenure <= 0) {
      return res.status(400).json({
        message: 'Total amount and tenure must be positive numbers.',
      });
    }

    // Default monthly amount = total / tenure if unspecified
    let numMonthly = Number(monthlyAmount);
    if (isNaN(numMonthly) || numMonthly <= 0) {
      numMonthly = Math.round((numTotal / numTenure) * 100) / 100;
    }

    const parsedDueDay = dueDay ? Math.min(31, Math.max(1, Number(dueDay))) : 5;

    const newEMI = await EMI.create({
      userId: req.user._id,
      name: name.trim(),
      lender: lender.trim(),
      totalAmount: numTotal,
      monthlyAmount: numMonthly,
      tenureMonths: numTenure,
      startDate: startDate ? new Date(startDate) : new Date(),
      dueDay: parsedDueDay,
      category: category || 'Electronics',
      notes: notes ? notes.trim() : '',
      payments: [],
    });

    res.status(201).json({
      message: 'EMI tracker created successfully.',
      emi: enrichEMI(newEMI),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   PATCH /api/emis/:id
 * @desc    Update an existing EMI configuration
 * @access  Private (Scoped to req.user)
 */
export const updateEMI = async (req, res, next) => {
  try {
    const emi = await EMI.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!emi) {
      return res.status(404).json({ message: 'EMI record not found.' });
    }

    const {
      name,
      lender,
      totalAmount,
      monthlyAmount,
      tenureMonths,
      startDate,
      dueDay,
      category,
      notes,
    } = req.body;

    if (name !== undefined) emi.name = name.trim();
    if (lender !== undefined) emi.lender = lender.trim();
    if (totalAmount !== undefined && Number(totalAmount) > 0) emi.totalAmount = Number(totalAmount);
    if (monthlyAmount !== undefined && Number(monthlyAmount) > 0) emi.monthlyAmount = Number(monthlyAmount);
    if (tenureMonths !== undefined && Number(tenureMonths) > 0) emi.tenureMonths = Number(tenureMonths);
    if (startDate) emi.startDate = new Date(startDate);
    if (dueDay !== undefined) emi.dueDay = Math.min(31, Math.max(1, Number(dueDay)));
    if (category) emi.category = category;
    if (notes !== undefined) emi.notes = notes.trim();

    await emi.save();

    res.status(200).json({
      message: 'EMI updated successfully.',
      emi: enrichEMI(emi),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   DELETE /api/emis/:id
 * @desc    Delete an EMI record
 * @access  Private (Scoped to req.user)
 */
export const deleteEMI = async (req, res, next) => {
  try {
    const result = await EMI.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!result) {
      return res.status(404).json({ message: 'EMI record not found.' });
    }

    res.status(200).json({ message: 'EMI record deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   POST /api/emis/:id/pay
 * @desc    Mark current installment as paid (records payment history & updates progress)
 * @access  Private (Scoped to req.user)
 */
export const recordPayment = async (req, res, next) => {
  try {
    const emi = await EMI.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!emi) {
      return res.status(404).json({ message: 'EMI record not found.' });
    }

    const currentPayments = emi.payments || [];
    if (currentPayments.length >= emi.tenureMonths) {
      return res.status(400).json({
        message: 'This EMI loan is already 100% paid off and completed!',
      });
    }

    const paymentAmount = req.body.amount !== undefined && Number(req.body.amount) > 0
      ? Number(req.body.amount)
      : emi.monthlyAmount;

    const installmentNum = currentPayments.length + 1;
    const paidAt = req.body.paidAt ? new Date(req.body.paidAt) : new Date();
    const note = req.body.note ? String(req.body.note).trim() : `Installment ${installmentNum} of ${emi.tenureMonths}`;

    emi.payments.push({
      installmentNumber: installmentNum,
      paidAt,
      amount: paymentAmount,
      note,
    });

    // Update status if finished
    if (emi.payments.length >= emi.tenureMonths) {
      emi.status = 'completed';
    }

    await emi.save();

    res.status(200).json({
      message: `Installment #${installmentNum} marked as paid! 🎉`,
      emi: enrichEMI(emi),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   POST /api/emis/:id/undo-pay
 * @desc    Undo the latest payment for this EMI
 * @access  Private (Scoped to req.user)
 */
export const undoPayment = async (req, res, next) => {
  try {
    const emi = await EMI.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!emi) {
      return res.status(404).json({ message: 'EMI record not found.' });
    }

    if (!emi.payments || emi.payments.length === 0) {
      return res.status(400).json({ message: 'No payments to undo for this EMI.' });
    }

    // Pop the latest payment
    const removedPayment = emi.payments.pop();
    emi.status = 'active';

    await emi.save();

    res.status(200).json({
      message: `Payment #${removedPayment.installmentNumber} reverted.`,
      emi: enrichEMI(emi),
    });
  } catch (err) {
    next(err);
  }
};
