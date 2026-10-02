/**
 * Alerts and Deadlines Controller (alertController.js)
 * ---------------------------------------------------
 * Aggregates urgent financial and consumer deadlines into a single prioritized notification feed.
 * 
 * Monitored Alerts:
 * 1. Warranties expiring within 30 days (type: 'warranty')
 * 2. Return windows closing within 2 days (type: 'return')
 * 3. Recurring subscriptions due within 3 days (type: 'recurring')
 * 4. Monthly budget utilization exceeding 80% (type: 'budget')
 * 
 * Result is sorted in ascending order of urgency (smallest daysLeft first).
 */

import Bill from '../models/Bill.js';
import Recurring from '../models/Recurring.js';
import Split from '../models/Split.js';
import EMI from '../models/EMI.js';
import User from '../models/User.js';
import { enrichEMI } from '../utils/emiCalculator.js';

/**
 * Calculates remaining calendar days from now to target date.
 */
const getDaysRemaining = (targetDate) => {
  const now = new Date();
  const diffTime = new Date(targetDate).getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * @route   GET /api/alerts
 * @desc    Get sorted list of urgent alerts (warranties, returns, recurring, budget)
 * @access  Private (Scoped to req.user)
 */
export const getAlerts = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const alerts = [];

    // -------------------------------------------------------------
    // 1. WARRANTIES EXPIRING WITHIN 30 DAYS
    // -------------------------------------------------------------
    const thirtyDaysFromNow = new Date(now);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringWarranties = await Bill.find({
      userId,
      warrantyExpiry: { $gte: now, $lte: thirtyDaysFromNow },
    });

    for (const bill of expiringWarranties) {
      const daysLeft = getDaysRemaining(bill.warrantyExpiry);
      alerts.push({
        type: 'warranty',
        title: 'Warranty Expiring Soon',
        message: `Warranty for ${bill.store} purchase ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`,
        daysLeft,
        refId: bill._id,
      });
    }

    // -------------------------------------------------------------
    // 2. RETURN WINDOWS CLOSING WITHIN 2 DAYS
    // -------------------------------------------------------------
    const twoDaysFromNow = new Date(now);
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

    const closingReturns = await Bill.find({
      userId,
      returnUntil: { $gte: now, $lte: twoDaysFromNow },
    });

    for (const bill of closingReturns) {
      const daysLeft = getDaysRemaining(bill.returnUntil);
      alerts.push({
        type: 'return',
        title: 'Return Window Closing',
        message: `Return window for ${bill.store} closes in ${daysLeft === 0 ? 'today' : daysLeft + ' day' + (daysLeft === 1 ? '' : 's')}.`,
        daysLeft,
        refId: bill._id,
      });
    }

    // -------------------------------------------------------------
    // 3. RECURRING BILLS DUE WITHIN 3 DAYS
    // -------------------------------------------------------------
    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const upcomingRecurring = await Recurring.find({
      userId,
      nextDue: { $gte: now, $lte: threeDaysFromNow },
    });

    for (const rec of upcomingRecurring) {
      const daysLeft = getDaysRemaining(rec.nextDue);
      alerts.push({
        type: 'recurring',
        title: 'Subscription Due',
        message: `${rec.name} (₹${rec.amount.toLocaleString('en-IN')}) is due in ${daysLeft === 0 ? 'today' : daysLeft + ' day' + (daysLeft === 1 ? '' : 's')}.`,
        daysLeft,
        refId: rec._id,
      });
    }

    // -------------------------------------------------------------
    // 4. BUDGET AT 80% OR MORE
    // -------------------------------------------------------------
    const user = await User.findById(userId);
    const budget = user?.monthlyBudget || 20000;

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const thisMonthBills = await Bill.find({
      userId,
      date: { $gte: startOfMonth, $lte: endOfMonth },
    });

    const thisMonthSpend = thisMonthBills.reduce((sum, b) => sum + b.total, 0);
    const percentUsed = budget > 0 ? (thisMonthSpend / budget) * 100 : 0;

    if (percentUsed >= 80) {
      const daysLeftInMonth = getDaysRemaining(endOfMonth);
      alerts.push({
        type: 'budget',
        title: 'Budget Alert (≥80%)',
        message: `You've reached ${Math.round(percentUsed)}% of your ₹${budget.toLocaleString('en-IN')} budget with ${daysLeftInMonth} day${daysLeftInMonth === 1 ? '' : 's'} remaining this month.`,
        daysLeft: 0,
        refId: user._id,
      });
    }

    // -------------------------------------------------------------
    // 5. POSSIBLE DUPLICATE BILLS ALERT
    // -------------------------------------------------------------
    const allUserBills = await Bill.find({ userId }).sort({ date: -1 }).limit(50);
    const checkedPairs = new Set();

    for (let i = 0; i < allUserBills.length; i++) {
      for (let j = i + 1; j < allUserBills.length; j++) {
        const b1 = allUserBills[i];
        const b2 = allUserBills[j];

        // Compare store names and totals
        const sameStore = b1.store.toLowerCase().trim() === b2.store.toLowerCase().trim();
        const sameTotal = Math.abs(b1.total - b2.total) < 0.01;
        const daysDiff = Math.abs(new Date(b1.date) - new Date(b2.date)) / (1000 * 60 * 60 * 24);

        if (sameStore && sameTotal && daysDiff <= 2) {
          const pairKey = `${b1._id}-${b2._id}`;
          if (!checkedPairs.has(pairKey)) {
            checkedPairs.add(pairKey);
            alerts.push({
              type: 'duplicate',
              title: 'Possible Duplicate Bill',
              message: `2 identical bills found for ${b1.store} (₹${b1.total.toLocaleString('en-IN')}).`,
              daysLeft: 0,
              refId: b1._id,
            });
            break; // Max 1 alert per recent duplicate
          }
        }
      }
      if (checkedPairs.size >= 2) break; // Don't spam
    }

    // -------------------------------------------------------------
    // 6. IMPORTANT SPLIT PAYMENT STATUS ALERT
    // -------------------------------------------------------------
    const pendingSplits = await Split.find({
      userId,
      outstanding: { $gt: 0 },
    }).populate('billId', 'store total date');

    for (const split of pendingSplits) {
      const pendingPeople = split.people
        .filter((p) => p.status === 'pending')
        .map((p) => p.name);

      if (pendingPeople.length > 0) {
        const billStore = split.billId?.store || 'Split Bill';
        alerts.push({
          type: 'split',
          title: 'Pending Split Payment',
          message: `₹${split.outstanding.toLocaleString('en-IN')} pending from ${pendingPeople.slice(0, 2).join(', ')}${pendingPeople.length > 2 ? ' +' + (pendingPeople.length - 2) + ' more' : ''} for ${billStore}.`,
          daysLeft: 1,
          refId: split._id,
        });
      }
    }

    // -------------------------------------------------------------
    // 7. EMI DUE SOON, OVERDUE & COMPLETED ALERTS
    // -------------------------------------------------------------
    const userEmis = await EMI.find({ userId });
    for (const rawEmi of userEmis) {
      const emi = enrichEMI(rawEmi);

      if (emi.isCompleted) {
        // Show celebratory alert if completed in last 7 days
        const daysSinceUpdate = (now.getTime() - new Date(emi.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceUpdate <= 7) {
          alerts.push({
            type: 'emi',
            title: 'EMI Paid Off 🎉',
            message: `Congratulations! Your ${emi.name} EMI is 100% paid off.`,
            daysLeft: 50,
            refId: emi._id,
          });
        }
      } else if (emi.daysUntilDue !== null) {
        if (emi.daysUntilDue < 0) {
          const overdueDays = Math.abs(emi.daysUntilDue);
          alerts.push({
            type: 'emi',
            title: 'EMI Overdue ⚠️',
            message: `Your ${emi.name} EMI is overdue by ${overdueDays} day${overdueDays === 1 ? '' : 's'} — ₹${emi.monthlyAmount.toLocaleString('en-IN')}`,
            daysLeft: emi.daysUntilDue,
            refId: emi._id,
          });
        } else if (emi.daysUntilDue === 0) {
          alerts.push({
            type: 'emi',
            title: 'EMI Due Today',
            message: `Your ${emi.name} EMI is due today — ₹${emi.monthlyAmount.toLocaleString('en-IN')}`,
            daysLeft: 0,
            refId: emi._id,
          });
        } else if (emi.daysUntilDue <= 3) {
          alerts.push({
            type: 'emi',
            title: 'Upcoming EMI Due',
            message: `Your ${emi.name} EMI is due in ${emi.daysUntilDue} day${emi.daysUntilDue === 1 ? '' : 's'} — ₹${emi.monthlyAmount.toLocaleString('en-IN')}`,
            daysLeft: emi.daysUntilDue,
            refId: emi._id,
          });
        }
      }
    }

    // Sort alerts: closest deadline first (ascending order of daysLeft)
    alerts.sort((a, b) => a.daysLeft - b.daysLeft);

    res.status(200).json(alerts);
  } catch (err) {
    next(err);
  }
};
