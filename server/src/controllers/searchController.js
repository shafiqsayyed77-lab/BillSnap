/**
 * Smart Search Controller (searchController.js)
 * ---------------------------------------------
 * Translates natural language queries into MongoDB filters and performs YoY (Year-over-Year)
 * expenditure comparison.
 * 
 * Beginner Concept:
 * When you search "How much did I spend on shoes this year?", BillSnap:
 * 1. Uses queryParser to extract filters: { category: "Shopping", keyword: "shoes", dateFrom, dateTo }.
 * 2. Queries this year's bills and sums the total.
 * 3. Shifts the date range back by 1 year (same window in the prior year).
 * 4. Compares the two totals to show difference and percentage growth (e.g., +15.4% or -8.2%).
 */

import Bill from '../models/Bill.js';
import Recurring from '../models/Recurring.js';
import User from '../models/User.js';
import { parse } from '../services/queryParser.js';

/**
 * Builds a MongoDB query object from parsed filter criteria.
 */
const buildMongoFilter = (userId, filters) => {
  const query = { userId };

  if (filters.category) {
    query.category = filters.category;
  }

  if (filters.minAmount || filters.maxAmount) {
    query.total = {};
    if (filters.minAmount !== null && filters.minAmount !== undefined) {
      query.total.$gte = Number(filters.minAmount);
    }
    if (filters.maxAmount !== null && filters.maxAmount !== undefined) {
      query.total.$lte = Number(filters.maxAmount);
    }
  }

  if (filters.dateFrom || filters.dateTo) {
    query.date = {};
    if (filters.dateFrom) {
      query.date.$gte = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      query.date.$lte = new Date(filters.dateTo);
    }
  }

  if (filters.keyword) {
    const regex = new RegExp(filters.keyword.trim(), 'i');
    query.$or = [
      { store: regex },
      { 'items.name': regex },
      { notes: regex },
      { category: regex },
    ];
  }

  return query;
};

/**
 * Shifts date bounds back by exactly 1 year.
 */
const shiftDateRangeBackOneYear = (dateFrom, dateTo) => {
  const now = new Date();
  let from = dateFrom ? new Date(dateFrom) : new Date(now.getFullYear(), 0, 1);
  let to = dateTo ? new Date(dateTo) : new Date(now);

  const prevYearFrom = new Date(from);
  prevYearFrom.setFullYear(prevYearFrom.getFullYear() - 1);

  const prevYearTo = new Date(to);
  prevYearTo.setFullYear(prevYearTo.getFullYear() - 1);

  return { prevYearFrom, prevYearTo };
};

/**
 * Format Indian currency helper
 */
const formatInr = (num) => `₹${Math.round(num || 0).toLocaleString('en-IN')}`;

/**
 * @route   POST /api/search
 * @desc    Execute smart natural language search / Ask BillSnap with Year-over-Year comparison
 * @access  Private (Scoped to req.user)
 */
export const searchBills = async (req, res, next) => {
  try {
    const userQueryText = req.body?.query || req.query?.q || req.query?.query;
    const userId = req.user._id;

    if (!userQueryText || !userQueryText.trim()) {
      return res.status(400).json({ message: 'Search query text is required.' });
    }

    // Step 1: Parse natural language into structured criteria & intent
    const filters = await parse(userQueryText);
    const now = new Date();

    // -------------------------------------------------------------
    // INTENT: BIGGEST PURCHASE
    // -------------------------------------------------------------
    if (filters.intent === 'biggest_purchase') {
      const dateQuery = { userId };
      if (filters.dateFrom || filters.dateTo) {
        dateQuery.date = {};
        if (filters.dateFrom) dateQuery.date.$gte = new Date(filters.dateFrom);
        if (filters.dateTo) dateQuery.date.$lte = new Date(filters.dateTo);
      }

      const biggestBills = await Bill.find(dateQuery).sort({ total: -1 }).limit(5);

      if (biggestBills.length === 0) {
        return res.status(200).json({
          filters,
          total: 0,
          count: 0,
          bills: [],
          answer: 'No purchases found for this time period.',
          comparison: null,
        });
      }

      const topBill = biggestBills[0];
      const dateStr = new Date(topBill.date).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

      const answer = `Your biggest purchase was ${formatInr(topBill.total)} at ${topBill.store} on ${dateStr} (${topBill.category}).`;

      return res.status(200).json({
        filters,
        total: topBill.total,
        count: 1,
        bills: biggestBills,
        answer,
        comparison: null,
      });
    }

    // -------------------------------------------------------------
    // INTENT: HIGHEST / TOP SPENDING CATEGORY
    // -------------------------------------------------------------
    if (filters.intent === 'highest_category') {
      const matchStage = { userId };
      if (filters.dateFrom || filters.dateTo) {
        matchStage.date = {};
        if (filters.dateFrom) matchStage.date.$gte = new Date(filters.dateFrom);
        if (filters.dateTo) matchStage.date.$lte = new Date(filters.dateTo);
      }

      const categoryAggregation = await Bill.aggregate([
        { $match: matchStage },
        { $group: { _id: '$category', total: { $sum: '$total' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ]);

      if (categoryAggregation.length === 0) {
        return res.status(200).json({
          filters,
          total: 0,
          count: 0,
          bills: [],
          answer: 'No category expenses found for the specified period.',
          comparison: null,
        });
      }

      const topCat = categoryAggregation[0];
      const matchingBills = await Bill.find({ ...matchStage, category: topCat._id }).sort({ date: -1 });

      const runnerUp = categoryAggregation[1];
      let answer = `Your highest spending category is ${topCat._id} with ${formatInr(topCat.total)} spent across ${topCat.count} bill${topCat.count === 1 ? '' : 's'}.`;
      if (runnerUp) {
        answer += ` Followed by ${runnerUp._id} (${formatInr(runnerUp.total)}).`;
      }

      return res.status(200).json({
        filters: { ...filters, category: topCat._id },
        total: Math.round(topCat.total * 100) / 100,
        count: topCat.count,
        bills: matchingBills,
        answer,
        comparison: null,
      });
    }

    // -------------------------------------------------------------
    // INTENT: WHAT BILLS ARE DUE SOON
    // -------------------------------------------------------------
    if (filters.intent === 'due_soon') {
      const thirtyDays = new Date(now);
      thirtyDays.setDate(thirtyDays.getDate() + 30);

      // 1. Upcoming Recurring Subscriptions
      const upcomingRecurring = await Recurring.find({
        userId,
        nextDue: { $gte: now, $lte: thirtyDays },
      }).sort({ nextDue: 1 });

      // 2. Returns closing soon (< 7 days)
      const sevenDays = new Date(now);
      sevenDays.setDate(sevenDays.getDate() + 7);
      const upcomingReturns = await Bill.find({
        userId,
        returnUntil: { $gte: now, $lte: sevenDays },
      }).sort({ returnUntil: 1 });

      // 3. Warranties expiring soon (< 30 days)
      const upcomingWarranties = await Bill.find({
        userId,
        warrantyExpiry: { $gte: now, $lte: thirtyDays },
      }).sort({ warrantyExpiry: 1 });

      const dueItems = [];
      let totalDue = 0;

      upcomingRecurring.forEach((r) => {
        const diffDays = Math.ceil((new Date(r.nextDue) - now) / (1000 * 60 * 60 * 24));
        totalDue += r.amount;
        dueItems.push({
          type: 'recurring',
          title: r.name,
          amount: r.amount,
          date: r.nextDue,
          daysLeft: diffDays,
        });
      });

      const recurringBills = await Bill.find({
        userId,
        store: { $in: upcomingRecurring.map((r) => new RegExp(r.name, 'i')) },
      }).sort({ date: -1 });

      let answer = '';
      if (dueItems.length === 0 && upcomingReturns.length === 0 && upcomingWarranties.length === 0) {
        answer = 'You have no bills or subscriptions due in the next 30 days. Everything is settled!';
      } else {
        const parts = [];
        if (dueItems.length > 0) {
          const recDesc = dueItems
            .map((d) => `${d.title} (${formatInr(d.amount)} due in ${d.daysLeft === 0 ? 'today' : d.daysLeft + 'd'})`)
            .join(', ');
          parts.push(`${dueItems.length} subscription${dueItems.length === 1 ? '' : 's'} (${recDesc})`);
        }
        if (upcomingReturns.length > 0) {
          const retDesc = upcomingReturns
            .map((b) => {
              const d = Math.ceil((new Date(b.returnUntil) - now) / (1000 * 60 * 60 * 24));
              return `${b.store} return window closes in ${d === 0 ? 'today' : d + 'd'}`;
            })
            .join(', ');
          parts.push(retDesc);
        }
        answer = `Upcoming deadlines: ${parts.join('. ')}.`;
      }

      return res.status(200).json({
        filters,
        total: Math.round(totalDue * 100) / 100,
        count: dueItems.length + upcomingReturns.length,
        bills: [...upcomingReturns, ...recurringBills],
        answer,
        comparison: null,
      });
    }

    // -------------------------------------------------------------
    // INTENT: BUDGET STATUS
    // -------------------------------------------------------------
    if (filters.intent === 'budget_status') {
      const user = await User.findById(userId);
      const budget = user?.monthlyBudget || 25000;
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      const thisMonthBills = await Bill.find({
        userId,
        date: { $gte: startOfMonth, $lte: endOfMonth },
      });

      const totalSpent = thisMonthBills.reduce((sum, b) => sum + b.total, 0);
      const remaining = Math.max(0, budget - totalSpent);
      const percentUsed = Math.round((totalSpent / budget) * 100);

      const answer = `You have ${formatInr(remaining)} remaining from your ${formatInr(budget)} monthly budget (${percentUsed}% used, ${formatInr(totalSpent)} spent).`;

      return res.status(200).json({
        filters,
        total: totalSpent,
        count: thisMonthBills.length,
        bills: thisMonthBills,
        answer,
        comparison: {
          budget,
          remaining,
          percentUsed,
        },
      });
    }

    // -------------------------------------------------------------
    // DEFAULT SPEND QUERY (Store, Category, or Keyword Search)
    // -------------------------------------------------------------
    const currentMongoQuery = buildMongoFilter(userId, filters);
    const bills = await Bill.find(currentMongoQuery).sort({ date: -1 });

    const total = bills.reduce((sum, b) => sum + b.total, 0);
    const count = bills.length;

    // Year-over-Year comparison
    const { prevYearFrom, prevYearTo } = shiftDateRangeBackOneYear(filters.dateFrom, filters.dateTo);
    const comparisonFilters = {
      ...filters,
      dateFrom: prevYearFrom,
      dateTo: prevYearTo,
    };

    const prevYearMongoQuery = buildMongoFilter(userId, comparisonFilters);
    const prevYearBills = await Bill.find(prevYearMongoQuery);
    const lastYearTotal = prevYearBills.reduce((sum, b) => sum + b.total, 0);

    const difference = Math.round((total - lastYearTotal) * 100) / 100;
    let percentChange = 0;
    if (lastYearTotal > 0) {
      percentChange = Math.round(((total - lastYearTotal) / lastYearTotal) * 1000) / 10;
    } else if (total > 0) {
      percentChange = 100;
    }

    // Construct conversational answer
    let subject = '';
    if (filters.keyword && filters.category) {
      subject = `${filters.keyword} (${filters.category})`;
    } else if (filters.keyword) {
      subject = filters.keyword;
    } else if (filters.category) {
      subject = filters.category;
    } else {
      subject = 'all expenses';
    }

    let timeDesc = '';
    if (filters.dateFrom && filters.dateTo) {
      timeDesc = ' for this period';
    }

    let answer = `You spent ${formatInr(total)} on ${subject}${timeDesc} across ${count} bill${count === 1 ? '' : 's'}.`;
    if (lastYearTotal > 0) {
      const compWord = difference >= 0 ? `${formatInr(difference)} more` : `${formatInr(Math.abs(difference))} less`;
      answer += ` That's ${compWord} (${percentChange > 0 ? '+' : ''}${percentChange}%) compared with the same period last year.`;
    }

    res.status(200).json({
      filters,
      total: Math.round(total * 100) / 100,
      count,
      bills,
      answer,
      comparison: {
        lastYearTotal: Math.round(lastYearTotal * 100) / 100,
        difference,
        percentChange,
      },
    });
  } catch (err) {
    next(err);
  }
};

