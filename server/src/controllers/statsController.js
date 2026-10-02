/**
 * Statistics and Financial Analytics Controller (statsController.js)
 * ------------------------------------------------------------------
 * Computes monthly totals, budget burn-rate, category breakdowns, 6-month historical trends,
 * and AI-like plain-English financial insights.
 * 
 * Beginner Concept:
 * Visual analytics empower users to make smarter spending decisions.
 * Here we aggregate bills by month and category using MongoDB and JavaScript math.
 */

import Bill from '../models/Bill.js';
import User from '../models/User.js';
import EMI from '../models/EMI.js';
import { enrichEMI } from '../utils/emiCalculator.js';

/**
 * Format a Date to 'YYYY-MM'
 */
const formatYearMonth = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

/**
 * Format a Date to short label 'Oct 2026'
 */
const formatMonthLabel = (date) => {
  return date.toLocaleString('en-IN', { month: 'short', year: 'numeric' });
};

/**
 * @route   GET /api/stats/monthly?month=YYYY-MM
 * @desc    Get monthly spend, budget utilization, category breakdown, and 6-month trend
 * @access  Private (Scoped to req.user)
 */
export const getMonthlyStats = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    const budget = user?.monthlyBudget || 20000;

    // Determine target month (default to current month)
    const now = new Date();
    let targetYear = now.getFullYear();
    let targetMonth = now.getMonth(); // 0-indexed

    if (req.query.month && /^\d{4}-\d{2}$/.test(req.query.month)) {
      const [y, m] = req.query.month.split('-').map(Number);
      targetYear = y;
      targetMonth = m - 1;
    }

    const startOfMonth = new Date(targetYear, targetMonth, 1);
    const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

    // 1. Fetch bills for the selected month
    const monthlyBills = await Bill.find({
      userId,
      date: { $gte: startOfMonth, $lte: endOfMonth },
    });

    const total = monthlyBills.reduce((sum, b) => sum + b.total, 0);
    const roundedTotal = Math.round(total * 100) / 100;
    const percentUsed = budget > 0 ? Math.round((roundedTotal / budget) * 1000) / 10 : 0;

    // 2. Category Breakdown
    const categories = ['Food', 'Shopping', 'Electronics', 'Groceries', 'Bills', 'Travel', 'Health', 'Other'];
    const categoryTotals = {};
    categories.forEach((cat) => { categoryTotals[cat] = 0; });

    monthlyBills.forEach((b) => {
      const cat = b.category || 'Other';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + b.total;
    });

    const categoryBreakdown = Object.entries(categoryTotals).map(([cat, amount]) => ({
      category: cat,
      total: Math.round(amount * 100) / 100,
      percentage: roundedTotal > 0 ? Math.round((amount / roundedTotal) * 1000) / 10 : 0,
    })).filter(c => c.total > 0 || categories.includes(c.category));

    // 3. 6-Month Historical Trend
    // Generate previous 6 months ending with targetMonth
    const trend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(targetYear, targetMonth - i, 1);
      const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

      const mBills = await Bill.find({
        userId,
        date: { $gte: mStart, $lte: mEnd },
      });

      const mTotal = mBills.reduce((sum, b) => sum + b.total, 0);

      trend.push({
        month: formatYearMonth(mStart),
        label: formatMonthLabel(mStart),
        total: Math.round(mTotal * 100) / 100,
      });
    }

    res.status(200).json({
      month: formatYearMonth(startOfMonth),
      total: roundedTotal,
      budget,
      percentUsed,
      categoryBreakdown,
      trend,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/stats/insights
 * @desc    Get top category, change vs last month per category, biggest bill, and English insight
 * @access  Private (Scoped to req.user)
 */
export const getInsights = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    const budget = user?.monthlyBudget || 20000;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Current month bounds
    const thisMonthStart = new Date(currentYear, currentMonth, 1);
    const thisMonthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);

    // Prior month bounds
    const lastMonthStart = new Date(currentYear, currentMonth - 1, 1);
    const lastMonthEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);

    const [thisMonthBills, lastMonthBills] = await Promise.all([
      Bill.find({ userId, date: { $gte: thisMonthStart, $lte: thisMonthEnd } }),
      Bill.find({ userId, date: { $gte: lastMonthStart, $lte: lastMonthEnd } }),
    ]);

    const thisMonthTotal = thisMonthBills.reduce((sum, b) => sum + b.total, 0);
    const lastMonthTotal = lastMonthBills.reduce((sum, b) => sum + b.total, 0);

    // Compute category totals for this month and last month
    const thisCatTotals = {};
    const lastCatTotals = {};

    thisMonthBills.forEach((b) => {
      thisCatTotals[b.category] = (thisCatTotals[b.category] || 0) + b.total;
    });
    lastMonthBills.forEach((b) => {
      lastCatTotals[b.category] = (lastCatTotals[b.category] || 0) + b.total;
    });

    // 1. Identify Top Category
    let topCategory = null;
    let maxSpend = 0;
    for (const [cat, amt] of Object.entries(thisCatTotals)) {
      if (amt > maxSpend) {
        maxSpend = amt;
        topCategory = { category: cat, amount: Math.round(amt * 100) / 100 };
      }
    }

    // 2. Change vs last month per category
    const allCategories = ['Food', 'Shopping', 'Electronics', 'Groceries', 'Bills', 'Travel', 'Health', 'Other'];
    const changeVsLastMonthPerCategory = {};

    allCategories.forEach((cat) => {
      const thisVal = thisCatTotals[cat] || 0;
      const lastVal = lastCatTotals[cat] || 0;
      const diff = Math.round((thisVal - lastVal) * 100) / 100;
      let pct = 0;
      if (lastVal > 0) {
        pct = Math.round(((thisVal - lastVal) / lastVal) * 1000) / 10;
      } else if (thisVal > 0) {
        pct = 100;
      }
      changeVsLastMonthPerCategory[cat] = {
        thisMonth: Math.round(thisVal * 100) / 100,
        lastMonth: Math.round(lastVal * 100) / 100,
        diff,
        percentChange: pct,
      };
    });

    // 3. Biggest Bill
    let biggestBill = null;
    if (thisMonthBills.length > 0) {
      const sorted = [...thisMonthBills].sort((a, b) => b.total - a.total);
      biggestBill = {
        id: sorted[0]._id,
        store: sorted[0].store,
        total: sorted[0].total,
        date: sorted[0].date,
        category: sorted[0].category,
      };
    } else {
      // Fallback to highest bill overall if this month has none
      const highestEver = await Bill.findOne({ userId }).sort({ total: -1 });
      if (highestEver) {
        biggestBill = {
          id: highestEver._id,
          store: highestEver.store,
          total: highestEver.total,
          date: highestEver.date,
          category: highestEver.category,
        };
      }
    }

    // 4. Generate Plain-English Insight String & Smart Observations
    const percentUsed = budget > 0 ? Math.round((thisMonthTotal / budget) * 100) : 0;
    const remaining = Math.max(0, budget - thisMonthTotal);

    // List of dynamic plain-English observations
    const observations = [];

    // Observation: Budget
    if (budget > 0) {
      if (remaining > 0) {
        observations.push(`You have ₹${remaining.toLocaleString('en-IN')} remaining from your monthly budget.`);
      } else {
        observations.push(`You have exceeded your monthly budget of ₹${budget.toLocaleString('en-IN')}.`);
      }
    }

    // Observation: Category changes vs last month
    for (const [catName, catData] of Object.entries(changeVsLastMonthPerCategory)) {
      if (catData.diff > 200) {
        observations.push(`You spent ₹${Math.round(catData.diff).toLocaleString('en-IN')} more on ${catName} this month.`);
      } else if (catData.diff < -200) {
        observations.push(`Your ${catName} spending decreased compared with last month.`);
      }
    }

    // Observation: Biggest purchase
    if (biggestBill && biggestBill.total > 0) {
      observations.push(`Your biggest purchase this month was ₹${biggestBill.total.toLocaleString('en-IN')} at ${biggestBill.store}.`);
    }

    // 4b. Observations: EMI Commitments
    let emiSummary = null;
    const rawEmis = await EMI.find({ userId });
    if (rawEmis && rawEmis.length > 0) {
      const enrichedEmis = rawEmis.map((e) => enrichEMI(e));
      const activeEmis = enrichedEmis.filter((e) => !e.isCompleted);

      if (activeEmis.length > 0) {
        const totalMonthlyEmi = activeEmis.reduce((sum, e) => sum + e.monthlyAmount, 0);
        const totalRemainingEmi = activeEmis.reduce((sum, e) => sum + e.remainingAmount, 0);

        observations.push(`Your active EMIs total ₹${Math.round(totalMonthlyEmi).toLocaleString('en-IN')} per month.`);
        observations.push(`You have ₹${Math.round(totalRemainingEmi).toLocaleString('en-IN')} remaining across your active EMIs.`);

        // Sort by completion percentage descending
        const sortedByProgress = [...activeEmis].sort((a, b) => b.completionPercentage - a.completionPercentage);
        const topEmi = sortedByProgress[0];
        if (topEmi) {
          observations.push(`Your ${topEmi.name} EMI is ${topEmi.completionPercentage}% complete.`);
        }

        emiSummary = {
          activeCount: activeEmis.length,
          totalMonthlyCommitment: Math.round(totalMonthlyEmi * 100) / 100,
          totalRemainingAmount: Math.round(totalRemainingEmi * 100) / 100,
          topEmi: {
            name: topEmi.name,
            completionPercentage: topEmi.completionPercentage,
            monthsRemaining: topEmi.monthsRemaining,
          },
        };
      }
    }

    let insight = '';
    if (topCategory && topCategory.amount > 0) {
      const topCatChange = changeVsLastMonthPerCategory[topCategory.category]?.percentChange || 0;
      const changeWord = topCatChange >= 0 ? `${topCatChange}% more` : `${Math.abs(topCatChange)}% less`;
      insight = `Your biggest spending category this month is ${topCategory.category} (₹${topCategory.amount.toLocaleString('en-IN')}), which is ${changeWord} than last month. You have utilized ${percentUsed}% of your ₹${budget.toLocaleString('en-IN')} monthly budget.`;
    } else if (thisMonthTotal > 0) {
      insight = `You have spent ₹${Math.round(thisMonthTotal).toLocaleString('en-IN')} this month (${percentUsed}% of your ₹${budget.toLocaleString('en-IN')} budget).`;
    } else {
      insight = `No spending recorded yet this month. You have your full ₹${budget.toLocaleString('en-IN')} budget intact!`;
    }

    // 5. Monthly Financial Story
    const spendingChangePct = lastMonthTotal > 0
      ? Math.round(((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100)
      : (thisMonthTotal > 0 ? 100 : 0);

    const financialStory = {
      totalSpent: Math.round(thisMonthTotal * 100) / 100,
      totalSpentText: `This month you spent ₹${Math.round(thisMonthTotal).toLocaleString('en-IN')}.`,
      biggestCategoryText: topCategory ? `Your biggest category was ${topCategory.category}.` : 'No category expenses recorded.',
      biggestPurchaseText: biggestBill ? `Your biggest purchase was ₹${biggestBill.total.toLocaleString('en-IN')} at ${biggestBill.store}.` : 'No purchases recorded.',
      budgetUsedText: `You used ${percentUsed}% of your monthly budget.`,
      spendingChangeText: `Your spending changed by ${spendingChangePct >= 0 ? '+' : ''}${spendingChangePct}% compared with last month.`,
      remainingText: `You have ₹${remaining.toLocaleString('en-IN')} remaining from your monthly budget.`,
      topCategoryName: topCategory?.category || 'None',
      biggestStoreName: biggestBill?.store || 'None',
      biggestAmount: biggestBill?.total || 0,
      budget,
      percentUsed,
    };

    res.status(200).json({
      topCategory,
      changeVsLastMonthPerCategory,
      biggestBill,
      insight,
      observations,
      financialStory,
      emiSummary,
    });
  } catch (err) {
    next(err);
  }
};
