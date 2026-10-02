/**
 * Recurring Bill Detector Utility (recurringDetector.js)
 * -----------------------------------------------------
 * Automatically scans historical bills for a user to identify recurring charges,
 * such as broadband bills, monthly OTT subscriptions (Netflix, Spotify), mobile recharges,
 * gym memberships, or rent.
 * 
 * Beginner Concept:
 * How it works:
 * 1. Fetch all bills for the given userId and group them by normalized store name.
 * 2. Filter groups that have at least 2 bills.
 * 3. Sort bills chronologically and check if the amounts are within 10% of each other.
 * 4. Calculate the average gap (in days) between consecutive bills:
 *    - ~7 days (weekly)
 *    - ~28 to 31 days (monthly)
 *    - ~365 days (yearly)
 * 5. If criteria are met, upsert (create or update) a Recurring document with:
 *    - name, latest amount, detected interval, nextDue = last purchase date + interval,
 *    - sourceBillIds.
 */

import Bill from '../models/Bill.js';
import Recurring from '../models/Recurring.js';

/**
 * Normalizes store name by trimming, lowercasing, and removing punctuation.
 * e.g., "Netflix.com" -> "netflix"
 */
const normalizeStore = (name = '') => {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
};

/**
 * Checks if all numbers in an array are within a 10% tolerance band.
 */
const areAmountsConsistent = (amounts) => {
  if (amounts.length < 2) return false;
  const min = Math.min(...amounts);
  const max = Math.max(...amounts);
  const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  // If difference is within 10% of the average amount
  return (max - min) <= avg * 0.10;
};

/**
 * Detects recurring interval (in days) from the average gap between bill dates.
 * Returns 7 for weekly, 30 for monthly, 365 for annual, or null if no pattern.
 */
const detectInterval = (sortedDates) => {
  if (sortedDates.length < 2) return null;

  const gapsInDays = [];
  for (let i = 1; i < sortedDates.length; i++) {
    const diffMs = sortedDates[i].getTime() - sortedDates[i - 1].getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    gapsInDays.push(diffDays);
  }

  const avgGap = gapsInDays.reduce((a, b) => a + b, 0) / gapsInDays.length;

  // Weekly: 5 to 9 days -> interval 7
  if (avgGap >= 5 && avgGap <= 9) {
    return 7;
  }
  // Monthly: 25 to 35 days -> interval 30
  if (avgGap >= 25 && avgGap <= 35) {
    return 30;
  }
  // Annual: 350 to 380 days -> interval 365
  if (avgGap >= 350 && avgGap <= 380) {
    return 365;
  }

  return null;
};

/**
 * Scans bills for the user, detects recurring subscriptions, and persists them.
 * 
 * @param {string|mongoose.Types.ObjectId} userId - The user to analyze
 * @returns {Promise<Array>} List of detected or updated Recurring documents
 */
export const detectRecurring = async (userId) => {
  // Fetch all bills for this user
  const bills = await Bill.find({ userId }).sort({ date: 1 });

  // Group bills by normalized store name
  const groups = {};
  for (const bill of bills) {
    const key = normalizeStore(bill.store);
    if (!key) continue;
    if (!groups[key]) {
      groups[key] = {
        storeDisplayName: bill.store,
        bills: [],
      };
    }
    groups[key].bills.push(bill);
  }

  const detectedResults = [];

  for (const groupKey of Object.keys(groups)) {
    const group = groups[groupKey];
    // Need at least 2 bills to identify a recurring pattern
    if (group.bills.length < 2) continue;

    // Check amount consistency (within 10% tolerance)
    const amounts = group.bills.map((b) => b.total);
    if (!areAmountsConsistent(amounts)) continue;

    // Check interval consistency
    const dates = group.bills.map((b) => new Date(b.date));
    const intervalDays = detectInterval(dates);
    if (!intervalDays) continue;

    // Valid recurring pattern detected!
    const latestBill = group.bills[group.bills.length - 1];
    const lastDate = new Date(latestBill.date);

    // Calculate next due date = last purchase date + interval days
    const nextDue = new Date(lastDate);
    nextDue.setDate(nextDue.getDate() + intervalDays);

    const sourceBillIds = group.bills.map((b) => b._id);

    // Look for an existing recurring record with similar name to avoid duplicates
    let recurringRecord = await Recurring.findOne({
      userId,
      name: { $regex: new RegExp(`^${group.storeDisplayName}$`, 'i') },
    });

    if (recurringRecord) {
      // Update existing record
      recurringRecord.amount = latestBill.total;
      recurringRecord.interval = intervalDays;
      recurringRecord.nextDue = nextDue;
      recurringRecord.sourceBillIds = sourceBillIds;
      await recurringRecord.save();
    } else {
      // Create new recurring record
      recurringRecord = await Recurring.create({
        userId,
        name: group.storeDisplayName,
        amount: latestBill.total,
        interval: intervalDays,
        nextDue,
        sourceBillIds,
      });
    }

    detectedResults.push(recurringRecord);
  }

  return detectedResults;
};
