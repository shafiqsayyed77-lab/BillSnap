/**
 * Bill Controller (billController.js)
 * -----------------------------------
 * Manages CRUD operations, filtering, pagination, and automated categorization for bills.
 * 
 * Beginner Concept:
 * Security & Scoping: Every single database query strictly includes 'userId: req.user._id'.
 * This prevents data leakage and ensures that User A can never view, edit, or delete User B's bills.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Bill from '../models/Bill.js';
import Recurring from '../models/Recurring.js';
import Split from '../models/Split.js';
import EMI from '../models/EMI.js';
import { enrichEMI } from '../utils/emiCalculator.js';
import { categorize } from '../utils/categorizer.js';
import { applyBillRules } from '../utils/billRules.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * @route   POST /api/bills
 * @desc    Create a new bill (supports both JSON body & multipart form with image)
 * @access  Private (Scoped to req.user)
 */
export const createBill = async (req, res, next) => {
  try {
    let { store, date, total, items, category, warrantyExpiry, returnUntil, notes } = req.body;

    // Validate required fields
    if (!store || !store.trim()) {
      return res.status(400).json({ message: 'Store name is required.' });
    }
    if (total === undefined || total === null || isNaN(Number(total))) {
      return res.status(400).json({ message: 'A valid total bill amount is required.' });
    }

    const numTotal = Number(total);

    // If items were passed as a JSON string (e.g. from multipart form-data)
    let parsedItems = [];
    if (typeof items === 'string') {
      try {
        parsedItems = JSON.parse(items);
      } catch (e) {
        parsedItems = [];
      }
    } else if (Array.isArray(items)) {
      parsedItems = items;
    }

    // Step 1: Auto-categorize if user didn't specify or selected 'Other'
    let finalCategory = category;
    if (!finalCategory || finalCategory === 'Other') {
      finalCategory = categorize(store, parsedItems);
    }

    // Step 2: Handle uploaded receipt image if present
    let imageUrl = null;
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    } else if (req.body.imageUrl) {
      imageUrl = req.body.imageUrl;
    }

    // Step 3: Construct bill payload
    const billData = {
      userId: req.user._id,
      store: store.trim(),
      date: date ? new Date(date) : new Date(),
      total: numTotal,
      items: parsedItems,
      category: finalCategory,
      imageUrl,
      warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : null,
      returnUntil: returnUntil ? new Date(returnUntil) : null,
      notes: notes || '',
    };

    // Step 4: Apply smart defaults (e.g. Electronics 12 mo warranty, Shopping 15 days return)
    applyBillRules(billData);

    // Step 5: Save to MongoDB
    const bill = await Bill.create(billData);

    res.status(201).json(bill);
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/bills
 * @desc    Get user bills with filters (search, category, amount, month) and pagination
 * @access  Private (Scoped to req.user)
 */
export const getBills = async (req, res, next) => {
  try {
    const {
      search,
      category,
      minAmount,
      maxAmount,
      month, // Format: YYYY-MM
      sort = '-date',
      page = 1,
      limit = 20,
    } = req.query;

    // Base query scoped to the authenticated user
    const query = { userId: req.user._id };

    // Filter by category
    if (category && category !== 'All') {
      query.category = category;
    }

    // Filter by amount range
    if (minAmount || maxAmount) {
      query.total = {};
      if (minAmount) query.total.$gte = Number(minAmount);
      if (maxAmount) query.total.$lte = Number(maxAmount);
    }

    // Filter by specific month (YYYY-MM)
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [year, m] = month.split('-').map(Number);
      const startOfMonth = new Date(year, m - 1, 1);
      const endOfMonth = new Date(year, m, 0, 23, 59, 59, 999);
      query.date = { $gte: startOfMonth, $lte: endOfMonth };
    }

    // Text / Keyword Search across store and line item names (case-insensitive)
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { store: searchRegex },
        { 'items.name': searchRegex },
        { notes: searchRegex },
      ];
    }

    // Parse pagination parameters
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    // Sorting format helper
    let sortOptions = { date: -1 };
    if (sort === 'date_asc') sortOptions = { date: 1 };
    else if (sort === 'date_desc' || sort === '-date') sortOptions = { date: -1 };
    else if (sort === 'total_asc') sortOptions = { total: 1 };
    else if (sort === 'total_desc') sortOptions = { total: -1 };
    else if (sort === 'store_asc') sortOptions = { store: 1 };

    // Execute queries
    const [bills, total] = await Promise.all([
      Bill.find(query).sort(sortOptions).skip(skip).limit(limitNum),
      Bill.countDocuments(query),
    ]);

    const pages = Math.ceil(total / limitNum) || 1;

    res.status(200).json({
      bills,
      total,
      page: pageNum,
      pages,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/bills/:id
 * @desc    Get single bill by ID
 * @access  Private (Scoped to req.user)
 */
export const getBillById = async (req, res, next) => {
  try {
    const bill = await Bill.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!bill) {
      return res.status(404).json({ message: 'Bill not found.' });
    }

    res.status(200).json(bill);
  } catch (err) {
    next(err);
  }
};

/**
 * @route   PATCH /api/bills/:id
 * @desc    Update an existing bill
 * @access  Private (Scoped to req.user)
 */
export const updateBill = async (req, res, next) => {
  try {
    const bill = await Bill.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!bill) {
      return res.status(404).json({ message: 'Bill not found.' });
    }

    const {
      store,
      date,
      total,
      items,
      category,
      warrantyExpiry,
      returnUntil,
      notes,
    } = req.body;

    if (store !== undefined) bill.store = store.trim();
    if (date !== undefined) bill.date = new Date(date);
    if (total !== undefined) bill.total = Number(total);
    if (items !== undefined) bill.items = Array.isArray(items) ? items : JSON.parse(items);
    if (category !== undefined) bill.category = category;
    if (warrantyExpiry !== undefined) bill.warrantyExpiry = warrantyExpiry ? new Date(warrantyExpiry) : null;
    if (returnUntil !== undefined) bill.returnUntil = returnUntil ? new Date(returnUntil) : null;
    if (notes !== undefined) bill.notes = notes;

    // Handle new uploaded image if sent
    if (req.file) {
      bill.imageUrl = `/uploads/${req.file.filename}`;
    }

    await bill.save();

    res.status(200).json(bill);
  } catch (err) {
    next(err);
  }
};

/**
 * @route   DELETE /api/bills/:id
 * @desc    Delete a bill and remove its image file from disk
 * @access  Private (Scoped to req.user)
 */
export const deleteBill = async (req, res, next) => {
  try {
    const bill = await Bill.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!bill) {
      return res.status(404).json({ message: 'Bill not found.' });
    }

    // If an image was associated, remove the file from the uploads directory
    if (bill.imageUrl) {
      const filename = path.basename(bill.imageUrl);
      const filePath = path.resolve(__dirname, '../../uploads', filename);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (unlinkErr) {
          console.warn('⚠️ Could not delete image file:', unlinkErr.message);
        }
      }
    }

    await Bill.deleteOne({ _id: bill._id });

    res.status(200).json({ message: 'Bill deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   POST /api/bills/check-duplicate
 * @desc    Check if a similar bill already exists for the authenticated user
 * @access  Private (Scoped to req.user)
 */
export const checkDuplicateBill = async (req, res, next) => {
  try {
    const { store, date, billDate, total, excludeId } = req.body;
    const dateVal = date || billDate;
    if (!store || total === undefined) {
      return res.status(400).json({ message: 'Store and total are required for duplicate check.' });
    }

    const userId = req.user._id;
    const numTotal = Number(total);
    const targetDate = dateVal ? new Date(dateVal) : new Date();

    // Bounds: +/- 2 calendar days
    const twoDaysBefore = new Date(targetDate);
    twoDaysBefore.setDate(twoDaysBefore.getDate() - 2);
    twoDaysBefore.setHours(0, 0, 0, 0);

    const twoDaysAfter = new Date(targetDate);
    twoDaysAfter.setDate(twoDaysAfter.getDate() + 2);
    twoDaysAfter.setHours(23, 59, 59, 999);

    const query = {
      userId,
      date: { $gte: twoDaysBefore, $lte: twoDaysAfter },
      total: { $gte: numTotal - 1, $lte: numTotal + 1 },
    };

    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    // Escape regex characters in store
    const cleanStore = store.trim();
    const escapedStore = cleanStore.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.store = new RegExp(`^${escapedStore}$`, 'i');

    let duplicate = await Bill.findOne(query);

    // If no exact match, try broader store match on first significant word
    if (!duplicate) {
      const firstWord = cleanStore.split(/\s+/)[0];
      if (firstWord.length >= 3) {
        query.store = new RegExp(firstWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        duplicate = await Bill.findOne(query);
      }
    }

    if (duplicate) {
      const dupInfo = {
        _id: duplicate._id,
        store: duplicate.store,
        date: duplicate.date,
        total: duplicate.total,
        category: duplicate.category,
      };
      return res.status(200).json({
        isDuplicate: true,
        duplicateBill: dupInfo,
        duplicateBills: [dupInfo],
      });
    }

    res.status(200).json({ isDuplicate: false, duplicateBill: null, duplicateBills: [] });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/bills/price-history
 * @desc    Aggregate repeat purchases to display price differences, history and savings
 * @access  Private (Scoped to req.user)
 */
export const getPriceHistory = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const bills = await Bill.find({ userId }).sort({ date: 1 });

    const itemMap = new Map();

    for (const bill of bills) {
      // 1. Process explicit items
      if (bill.items && bill.items.length > 0) {
        for (const item of bill.items) {
          if (!item.name || item.price === undefined) continue;
          const key = item.name.toLowerCase().trim();
          if (!itemMap.has(key)) {
            itemMap.set(key, {
              name: item.name.trim(),
              occurrences: [],
            });
          }
          itemMap.get(key).occurrences.push({
            price: Number(item.price),
            date: bill.date,
            store: bill.store,
            billId: bill._id,
          });
        }
      } else {
        // Single purchase bill
        const key = bill.store.toLowerCase().trim();
        if (!itemMap.has(key)) {
          itemMap.set(key, {
            name: bill.store.trim(),
            occurrences: [],
          });
        }
        itemMap.get(key).occurrences.push({
          price: Number(bill.total),
          date: bill.date,
          store: bill.store,
          billId: bill._id,
        });
      }
    }

    const priceHistory = [];

    for (const [, data] of itemMap) {
      data.occurrences.sort((a, b) => new Date(a.date) - new Date(b.date));

      if (data.occurrences.length >= 2) {
        const history = data.occurrences;
        const latest = history[history.length - 1];
        const previous = history[history.length - 2];

        const difference = Math.round((latest.price - previous.price) * 100) / 100;
        const savings = Math.round((previous.price - latest.price) * 100) / 100;
        let percentChange = 0;
        if (previous.price > 0) {
          percentChange = Math.round(((latest.price - previous.price) / previous.price) * 1000) / 10;
        }

        priceHistory.push({
          name: data.name,
          store: latest.store,
          currentPrice: latest.price,
          previousPrice: previous.price,
          difference,
          savings,
          percentChange,
          latestDate: latest.date,
          previousDate: previous.date,
          totalPurchases: history.length,
          history,
          billId: latest.billId,
        });
      }
    }

    // Sort by latest purchase date
    priceHistory.sort((a, b) => new Date(b.latestDate) - new Date(a.latestDate));

    res.status(200).json({ priceHistory });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/bills/timeline
 * @desc    Unified chronological event stream of purchases, warranties, returns, recurring and splits
 * @access  Private (Scoped to req.user)
 */
export const getTimeline = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const [bills, recurringList, splits, rawEmis] = await Promise.all([
      Bill.find({ userId }).sort({ date: -1 }),
      Recurring.find({ userId }),
      Split.find({ userId }).populate('billId', 'store total date'),
      EMI.find({ userId }),
    ]);

    const now = new Date();
    const events = [];

    const calcDays = (d) => Math.ceil((new Date(d) - now) / (1000 * 60 * 60 * 24));

    // 1. Bill Purchases
    bills.forEach((b) => {
      events.push({
        id: `purchase-${b._id}`,
        type: 'purchase',
        title: `Bought at ${b.store}`,
        date: b.date,
        amount: b.total,
        category: b.category,
        billId: b._id,
        store: b.store,
        itemCount: b.items?.length || 0,
        itemsSummary: b.items?.map((i) => i.name).slice(0, 3).join(', ') || '',
        notes: b.notes,
        imageUrl: b.imageUrl,
        warrantyExpiry: b.warrantyExpiry,
        returnUntil: b.returnUntil,
      });

      // 2. Return Deadline (if set)
      if (b.returnUntil) {
        const days = calcDays(b.returnUntil);
        events.push({
          id: `return-${b._id}`,
          type: 'return',
          title: `Return window for ${b.store}`,
          date: b.returnUntil,
          amount: b.total,
          category: b.category,
          billId: b._id,
          store: b.store,
          daysRemaining: days,
          status: days < 0 ? 'Closed' : days === 0 ? 'Closes today' : `${days}d left`,
        });
      }

      // 3. Warranty Expiry (if set)
      if (b.warrantyExpiry) {
        const days = calcDays(b.warrantyExpiry);
        events.push({
          id: `warranty-${b._id}`,
          type: 'warranty',
          title: `Warranty for ${b.store} (${b.items?.[0]?.name || 'Appliance'})`,
          date: b.warrantyExpiry,
          amount: b.total,
          category: b.category,
          billId: b._id,
          store: b.store,
          daysRemaining: days,
          status: days < 0 ? 'Expired' : days === 0 ? 'Expires today' : `${days}d left`,
        });
      }
    });

    // 4. Recurring Due Dates
    recurringList.forEach((r) => {
      const days = calcDays(r.nextDue);
      events.push({
        id: `recurring-${r._id}`,
        type: 'recurring',
        title: `${r.name} Subscription Due`,
        date: r.nextDue,
        amount: r.amount,
        category: 'Bills',
        daysRemaining: days,
        status: days < 0 ? 'Overdue' : days === 0 ? 'Due today' : `Due in ${days}d`,
      });
    });

    // 5. Split payment milestones
    splits.forEach((s) => {
      const billStore = s.billId?.store || 'Shared Bill';
      events.push({
        id: `split-${s._id}`,
        type: 'split',
        title: `Split payment: ${billStore}`,
        date: s.createdAt,
        amount: s.outstanding,
        billId: s.billId?._id,
        status: s.outstanding > 0 ? `₹${s.outstanding} pending` : 'Fully settled',
        peopleCount: s.people?.length || 0,
      });
    });

    // 6. EMI milestones
    rawEmis.forEach((rawEmi) => {
      const emi = enrichEMI(rawEmi);
      if (emi.nextDueDate && !emi.isCompleted) {
        events.push({
          id: `emi-${emi._id}`,
          type: 'emi',
          title: `${emi.name} EMI Due (${emi.lender})`,
          date: emi.nextDueDate,
          amount: emi.monthlyAmount,
          category: emi.category || 'Electronics',
          daysRemaining: emi.daysUntilDue,
          status: emi.daysUntilDue < 0
            ? 'Overdue'
            : emi.daysUntilDue === 0
            ? 'Due today'
            : `Due in ${emi.daysUntilDue}d`,
          progress: `${emi.monthsCompleted}/${emi.totalTenure} installments`,
        });
      }
    });

    // Sort events by date descending
    events.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.status(200).json({ events });
  } catch (err) {
    next(err);
  }
};

