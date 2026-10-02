/**
 * Recurring Bills Controller (recurringController.js)
 * ---------------------------------------------------
 * Manages recurring subscriptions, automated pattern detection, and payment cycles.
 * 
 * Beginner Concept:
 * When you call GET /api/recurring:
 * 1. The background detector checks your recent bills for recurring patterns.
 * 2. It calculates how many days remain until each subscription is due (daysUntilDue).
 * 3. It calculates your projected monthly subscription budget (monthlyTotal).
 * 4. When a user marks a bill as 'paid', we automatically advance nextDue by the interval days!
 */

import Recurring from '../models/Recurring.js';
import { detectRecurring } from '../utils/recurringDetector.js';

/**
 * @route   GET /api/recurring
 * @desc    Run recurring detection, retrieve all subscriptions with daysUntilDue & monthlyTotal
 * @access  Private (Scoped to req.user)
 */
export const getRecurring = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Step 1: Run automated detection to discover new subscriptions from recent bills
    try {
      await detectRecurring(userId);
    } catch (detectErr) {
      console.warn('⚠️ [Recurring] Detection warning:', detectErr.message);
    }

    // Step 2: Fetch all recurring records for this user, sorted by upcoming due date
    const recurringList = await Recurring.find({ userId }).sort({ nextDue: 1 });

    const now = new Date();
    let projectedMonthlyTotal = 0;

    // Step 3: Enhance each item with daysUntilDue and add to projected monthly total
    const enhancedItems = recurringList.map((item) => {
      const obj = item.toObject();
      const dueDate = new Date(item.nextDue);
      const diffTime = dueDate.getTime() - now.getTime();
      const daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      obj.daysUntilDue = daysUntilDue;

      // Project amount into standard 30-day monthly equivalent
      if (item.interval === 7) {
        projectedMonthlyTotal += item.amount * (30 / 7);
      } else if (item.interval === 365) {
        projectedMonthlyTotal += item.amount / 12;
      } else {
        projectedMonthlyTotal += item.amount * (30 / (item.interval || 30));
      }

      return obj;
    });

    res.status(200).json({
      recurring: enhancedItems,
      monthlyTotal: Math.round(projectedMonthlyTotal * 100) / 100,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   POST /api/recurring
 * @desc    Manually add a recurring subscription/bill
 * @access  Private (Scoped to req.user)
 */
export const createRecurring = async (req, res, next) => {
  try {
    const { name, amount, interval = 30, nextDue } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Recurring bill name is required.' });
    }
    if (amount === undefined || isNaN(Number(amount))) {
      return res.status(400).json({ message: 'Valid amount is required.' });
    }

    const dueDate = nextDue ? new Date(nextDue) : new Date();

    const recurring = await Recurring.create({
      userId: req.user._id,
      name: name.trim(),
      amount: Number(amount),
      interval: Number(interval) || 30,
      nextDue: dueDate,
    });

    res.status(201).json(recurring);
  } catch (err) {
    next(err);
  }
};

/**
 * @route   PATCH /api/recurring/:id
 * @desc    Edit a recurring bill or mark as paid (moving nextDue forward by interval days)
 * @access  Private (Scoped to req.user)
 */
export const updateRecurring = async (req, res, next) => {
  try {
    const recurring = await Recurring.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!recurring) {
      return res.status(404).json({ message: 'Recurring bill not found.' });
    }

    const { name, amount, interval, nextDue, markPaid } = req.body;

    // Handle "Mark Paid": advance nextDue forward by interval days
    if (markPaid) {
      const currentNextDue = new Date(recurring.nextDue);
      currentNextDue.setDate(currentNextDue.getDate() + recurring.interval);
      recurring.nextDue = currentNextDue;
    } else {
      if (name !== undefined) recurring.name = name.trim();
      if (amount !== undefined) recurring.amount = Number(amount);
      if (interval !== undefined) recurring.interval = Number(interval);
      if (nextDue !== undefined) recurring.nextDue = new Date(nextDue);
    }

    await recurring.save();

    // Recompute daysUntilDue
    const obj = recurring.toObject();
    const dueDate = new Date(recurring.nextDue);
    const diffTime = dueDate.getTime() - new Date().getTime();
    obj.daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    res.status(200).json(obj);
  } catch (err) {
    next(err);
  }
};

/**
 * @route   DELETE /api/recurring/:id
 * @desc    Delete a recurring subscription
 * @access  Private (Scoped to req.user)
 */
export const deleteRecurring = async (req, res, next) => {
  try {
    const recurring = await Recurring.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!recurring) {
      return res.status(404).json({ message: 'Recurring bill not found.' });
    }

    res.status(200).json({ message: 'Recurring bill deleted successfully.' });
  } catch (err) {
    next(err);
  }
};
