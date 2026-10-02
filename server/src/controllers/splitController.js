/**
 * Split Bills Controller (splitController.js)
 * -------------------------------------------
 * Manages splitting bills among groups of people, tracking individual payment status,
 * computing outstanding receivables, and validating share arithmetic.
 * 
 * Beginner Concept:
 * When dividing ₹1000 equally among 3 people, 1000 / 3 = 333.3333...
 * To prevent penny/paise loss, BillSnap rounds to 2 decimals and distributes the remainder
 * (e.g. ₹333.34, ₹333.33, ₹333.33 = ₹1000.00 exactly!).
 */

import Split from '../models/Split.js';
import Bill from '../models/Bill.js';

/**
 * Helper to divide an amount equally among N people with exact paise distribution.
 */
const calculateEqualShares = (total, count) => {
  const baseShare = Math.floor((total / count) * 100) / 100;
  const remainder = Math.round((total - baseShare * count) * 100); // in paise

  const shares = [];
  for (let i = 0; i < count; i++) {
    // Add 1 paise (0.01) to the first 'remainder' people
    const share = i < remainder ? baseShare + 0.01 : baseShare;
    shares.push(Math.round(share * 100) / 100);
  }
  return shares;
};

/**
 * @route   POST /api/splits
 * @desc    Create a new bill split (equal by default, or validated custom shares)
 * @access  Private (Scoped to req.user)
 */
export const createSplit = async (req, res, next) => {
  try {
    const { billId, people } = req.body;

    if (!billId) {
      return res.status(400).json({ message: 'Bill ID is required.' });
    }
    if (!Array.isArray(people) || people.length === 0) {
      return res.status(400).json({ message: 'At least one participant is required to split the bill.' });
    }

    // Verify the bill exists and belongs to this user
    const bill = await Bill.findOne({ _id: billId, userId: req.user._id });
    if (!bill) {
      return res.status(404).json({ message: 'Bill not found or access denied.' });
    }

    const billTotal = bill.total;

    // Check if custom shares were provided for all participants
    const hasCustomShares = people.every(
      (p) => p.share !== undefined && p.share !== null && !isNaN(Number(p.share)) && Number(p.share) > 0
    );

    let finalizedPeople = [];

    if (hasCustomShares) {
      // Validate that custom shares add up to the bill total
      const customSum = people.reduce((sum, p) => sum + Number(p.share), 0);
      const roundedSum = Math.round(customSum * 100) / 100;
      const roundedBillTotal = Math.round(billTotal * 100) / 100;

      if (Math.abs(roundedSum - roundedBillTotal) > 0.05) {
        return res.status(400).json({
          message: `The sum of shares (₹${roundedSum}) must equal the bill total (₹${roundedBillTotal}).`,
        });
      }

      finalizedPeople = people.map((p) => ({
        name: p.name.trim(),
        share: Math.round(Number(p.share) * 100) / 100,
        status: p.status || 'pending',
      }));
    } else {
      // Calculate equal shares ensuring exact rounding to the paise
      const equalShares = calculateEqualShares(billTotal, people.length);

      finalizedPeople = people.map((p, idx) => ({
        name: p.name.trim(),
        share: equalShares[idx],
        status: p.status || 'pending',
      }));
    }

    // Outstanding total = sum of pending shares
    const outstanding = finalizedPeople
      .filter((p) => p.status === 'pending')
      .reduce((sum, p) => sum + p.share, 0);

    const split = await Split.create({
      userId: req.user._id,
      billId: bill._id,
      people: finalizedPeople,
      outstanding: Math.round(outstanding * 100) / 100,
    });

    const populated = await Split.findById(split._id).populate('billId', 'store date total category');

    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/splits
 * @desc    Get all bill splits for current user
 * @access  Private (Scoped to req.user)
 */
export const getSplits = async (req, res, next) => {
  try {
    const splits = await Split.find({ userId: req.user._id })
      .populate('billId', 'store date total category')
      .sort({ createdAt: -1 });

    res.status(200).json(splits);
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/splits/:id
 * @desc    Get a single bill split by ID
 * @access  Private (Scoped to req.user)
 */
export const getSplitById = async (req, res, next) => {
  try {
    const split = await Split.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).populate('billId', 'store date total category items');

    if (!split) {
      return res.status(404).json({ message: 'Split not found.' });
    }

    res.status(200).json(split);
  } catch (err) {
    next(err);
  }
};

/**
 * @route   PATCH /api/splits/:id/people/:personId
 * @desc    Update a participant's status (paid/pending) or custom share, and recompute outstanding
 * @access  Private (Scoped to req.user)
 */
export const updateParticipant = async (req, res, next) => {
  try {
    const { id, personId } = req.params;
    const { status, share } = req.body;

    const split = await Split.findOne({
      _id: id,
      userId: req.user._id,
    });

    if (!split) {
      return res.status(404).json({ message: 'Split not found.' });
    }

    const person = split.people.id(personId);
    if (!person) {
      return res.status(404).json({ message: 'Participant not found in this split.' });
    }

    if (status !== undefined) {
      if (!['pending', 'paid'].includes(status)) {
        return res.status(400).json({ message: 'Status must be either "pending" or "paid".' });
      }
      person.status = status;
    }

    if (share !== undefined) {
      person.share = Number(share);
    }

    // Recalculate outstanding balance
    split.calculateOutstanding();
    await split.save();

    const updated = await Split.findById(split._id).populate('billId', 'store date total category');

    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
};
