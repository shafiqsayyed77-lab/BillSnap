/**
 * Database Seed Script (seed.js)
 * --------------------------------
 * Seeds the database with realistic Indian bills, recurring subscriptions, and split data
 * for the demo user: demo@billsnap.in / demo123.
 * 
 * Beginner Concept:
 * Seeding populates a fresh database with realistic mock data so that developers and users
 * can test every feature immediately without having to manually input dozens of receipts.
 * 
 * Pre-conditions satisfied:
 * 1. Demo User: demo@billsnap.in / demo123 (Monthly budget: ₹25,000)
 * 2. 15+ realistic Indian bills spanning the last 12 months
 * 3. Warranty expiring within 30 days (Reliance Digital Headphones)
 * 4. Return window closing in 2 days (Zudio Jacket)
 * 5. Recurring subscription due within 3 days (Jio Recharge)
 * 6. This month's expenditure is ~81.3% of monthly budget (between 75% and 85%)
 * 7. Recurring subscriptions detected and populated
 * 8. Sample split created with paid and pending participants
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB } from '../src/config/db.js';
import User from '../src/models/User.js';
import Bill from '../src/models/Bill.js';
import Recurring from '../src/models/Recurring.js';
import Split from '../src/models/Split.js';
import EMI from '../src/models/EMI.js';
import { categorize } from '../src/utils/categorizer.js';
import { applyBillRules } from '../src/utils/billRules.js';
import { detectRecurring } from '../src/utils/recurringDetector.js';

// Helper to create dates relative to today
const daysAgo = (days) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
};

const monthsAgo = (months, extraDays = 0) => {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  d.setDate(d.getDate() - extraDays);
  return d;
};

export const seedDatabase = async () => {
  try {
    if (mongoose.connection.readyState !== 1) {
      console.log('🌱 [Seed] Connecting to database...');
      await connectDB();
    }

    console.log('🧹 [Seed] Cleaning up existing demo data...');
    const demoEmail = 'demo@billsnap.in';
    const existingDemoUser = await User.findOne({ email: demoEmail });

    if (existingDemoUser) {
      await Bill.deleteMany({ userId: existingDemoUser._id });
      await Recurring.deleteMany({ userId: existingDemoUser._id });
      await Split.deleteMany({ userId: existingDemoUser._id });
      await EMI.deleteMany({ userId: existingDemoUser._id });
      await User.deleteOne({ _id: existingDemoUser._id });
      console.log('✨ [Seed] Cleaned previous records for demo@billsnap.in');
    }

    // 1. Create Demo User
    console.log('👤 [Seed] Creating demo user...');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('demo123', salt);

    const demoUser = await User.create({
      name: 'Naba Demo',
      email: demoEmail,
      passwordHash,
      monthlyBudget: 25000,
    });
    console.log(`✅ [Seed] Demo user created: ${demoUser.email} (Budget: ₹${demoUser.monthlyBudget})`);

    // 2. Define realistic Indian bills
    // Note: Dates and amounts are tuned so that this month's total is 75%-85% of ₹25,000 (₹18,750 - ₹21,250)
    const rawBills = [
      // 1. House Rent (This month, 5 days ago) - ₹12,000
      {
        store: 'House Rent',
        date: daysAgo(5),
        total: 12000,
        items: [{ name: 'Monthly Apartment Rent', price: 12000 }],
        category: 'Bills',
        notes: 'Transferred via UPI to landlord',
      },

      // 2. Zudio Jacket (This month, 13 days ago) - ₹1,899
      // Rule: Shopping return window is 15 days => Return closes in 15 - 13 = 2 days!
      {
        store: 'Zudio Fashion',
        date: daysAgo(13),
        total: 1899,
        items: [
          { name: 'Casual Denim Jacket', price: 1499 },
          { name: 'Cotton T-Shirt', price: 400 },
        ],
        category: 'Shopping',
        notes: 'Size L, keep receipt for exchange/return',
      },

      // 3. Swiggy Order 1 (This month, 12 days ago) - ₹650
      {
        store: 'Swiggy',
        date: daysAgo(12),
        total: 650,
        items: [
          { name: 'Paneer Butter Masala', price: 350 },
          { name: 'Butter Naan (2 pcs)', price: 120 },
          { name: 'Jeera Rice', price: 180 },
        ],
        notes: 'Dinner with friends',
      },

      // 4. Swiggy Order 2 (This month, 4 days ago) - ₹820 (Used for Split test)
      {
        store: 'Swiggy',
        date: daysAgo(4),
        total: 820,
        items: [
          { name: 'Chicken Biryani Large', price: 450 },
          { name: 'Chicken Tikka Roll', price: 220 },
          { name: 'Gulab Jamun (2 pcs)', price: 150 },
        ],
        notes: 'Office lunch order with colleagues',
      },

      // 5. BigBasket Grocery (This month, 8 days ago) - ₹2,450
      {
        store: 'BigBasket',
        date: daysAgo(8),
        total: 2450,
        items: [
          { name: 'Aashirvaad Atta 5kg', price: 275 },
          { name: 'Fortune Sunflower Oil 2L', price: 340 },
          { name: 'Amul Butter 500g', price: 275 },
          { name: 'Assorted Fresh Vegetables', price: 680 },
          { name: 'Dry Fruits & Snacks', price: 880 },
        ],
        category: 'Groceries',
        notes: 'Monthly staples delivery',
      },

      // 6. Jio Fiber Recharge (This month, 27 days ago) - ₹749
      // Cycle: 30 days interval => Next due is in 3 days!
      {
        store: 'Jio Telecom',
        date: daysAgo(27),
        total: 749,
        items: [{ name: 'Fiber Silver 100Mbps Plan', price: 749 }],
        category: 'Bills',
        notes: 'Home broadband connection',
      },

      // 7. Netflix Premium (This month, 10 days ago) - ₹649
      {
        store: 'Netflix',
        date: daysAgo(10),
        total: 649,
        items: [{ name: 'Ultra HD 4K Multi-screen Plan', price: 649 }],
        category: 'Bills',
        notes: 'Monthly recurring card payment',
      },

      // 8. Apollo Pharmacy (This month, 3 days ago) - ₹1,120
      {
        store: 'Apollo Pharmacy',
        date: daysAgo(3),
        total: 1120,
        items: [
          { name: 'Multivitamin Supplements', price: 650 },
          { name: 'First Aid Kit & Bandages', price: 250 },
          { name: 'Paracetamol & Cough Syrup', price: 220 },
        ],
        category: 'Health',
        notes: 'Prescription medicines and vitamins',
      },

      // [Total for this month: 12000 + 1899 + 650 + 820 + 2450 + 749 + 649 + 1120 = ₹20,337 -> 81.3% of ₹25k]

      // 9. Reliance Digital Headphones (11 months ago) - ₹3,999
      // Rule: Electronics gets 12 months warranty => expires in ~20 days (< 30 days alert!)
      {
        store: 'Reliance Digital',
        date: monthsAgo(11, 10),
        total: 3999,
        items: [{ name: 'Sony Wireless ANC Headphones', price: 3999 }],
        category: 'Electronics',
        notes: '1-year brand warranty card stored inside box',
      },

      // 10. Swiggy Order 3 (2 months ago) - ₹540
      {
        store: 'Swiggy',
        date: monthsAgo(2, 5),
        total: 540,
        items: [
          { name: 'Margherita Pizza Regular', price: 320 },
          { name: 'Garlic Breadsticks', price: 140 },
          { name: 'Choco Lava Cake', price: 80 },
        ],
        notes: 'Weekend snacks',
      },

      // 11. Netflix (40 days ago) - ₹649
      {
        store: 'Netflix',
        date: daysAgo(40),
        total: 649,
        items: [{ name: 'Ultra HD 4K Multi-screen Plan', price: 649 }],
        category: 'Bills',
        notes: 'Auto-debit subscription',
      },

      // 12. Netflix (70 days ago) - ₹649
      {
        store: 'Netflix',
        date: daysAgo(70),
        total: 649,
        items: [{ name: 'Ultra HD 4K Multi-screen Plan', price: 649 }],
        category: 'Bills',
        notes: 'Auto-debit subscription',
      },

      // 13. Jio Fiber Recharge (57 days ago) - ₹749
      {
        store: 'Jio Telecom',
        date: daysAgo(57),
        total: 749,
        items: [{ name: 'Fiber Silver 100Mbps Plan', price: 749 }],
        category: 'Bills',
        notes: 'Previous month recharge',
      },

      // 14. Jio Fiber Recharge (87 days ago) - ₹749
      {
        store: 'Jio Telecom',
        date: daysAgo(87),
        total: 749,
        items: [{ name: 'Fiber Silver 100Mbps Plan', price: 749 }],
        category: 'Bills',
        notes: 'Recharge from 3 months ago',
      },

      // 15. Uber Cabs (3 months ago) - ₹420
      {
        store: 'Uber India',
        date: monthsAgo(3, 10),
        total: 420,
        items: [{ name: 'Airport Premier Ride', price: 420 }],
        category: 'Travel',
        notes: 'Travel to Kempegowda International Airport',
      },

      // 15b. BigBasket Grocery (45 days ago) - ₹1,425 (Enables Price History tracking)
      {
        store: 'BigBasket',
        date: daysAgo(45),
        total: 1425,
        items: [
          { name: 'Aashirvaad Atta 5kg', price: 295 }, // Previous price was ₹295 -> Current is ₹275 (Saved ₹20)
          { name: 'Fortune Sunflower Oil 2L', price: 370 }, // Previous was ₹370 -> Current is ₹340 (Saved ₹30)
          { name: 'Amul Butter 500g', price: 260 }, // Previous was ₹260 -> Current is ₹275 (Price rose ₹15)
          { name: 'Fresh Seasonal Fruits', price: 500 },
        ],
        category: 'Groceries',
        notes: 'Grocery restocking from previous month',
      },

      // 16. Croma Electronics Charger (5 months ago) - ₹1,299
      {
        store: 'Croma',
        date: monthsAgo(5, 12),
        total: 1299,
        items: [{ name: 'Anker 65W GaN Fast Charger', price: 1299 }],
        category: 'Electronics',
        notes: 'Fast charger for MacBook and phone',
      },

      // 17. Myntra Running Shoes (6 months ago) - ₹2,899
      // Fits "How much did I spend on shoes this year?"
      {
        store: 'Myntra',
        date: monthsAgo(6, 2),
        total: 2899,
        items: [{ name: 'Nike Revolution Running Shoes', price: 2899 }],
        category: 'Shopping',
        notes: 'Black running shoes size UK 9',
      },

      // 18. Amazon India Order from Last Year (14 months ago) - ₹4,500
      // Fits YoY comparison queries
      {
        store: 'Amazon India',
        date: monthsAgo(14, 5),
        total: 4500,
        items: [
          { name: 'Ergonomic Desk Chair Cushion', price: 1800 },
          { name: 'Aluminum Laptop Stand', price: 1200 },
          { name: 'Mechanical Keyboard Switch Set', price: 1500 },
        ],
        category: 'Shopping',
        notes: 'Work from home setup purchase from last year',
      },
    ];

    console.log(`🧾 [Seed] Inserting ${rawBills.length} realistic bills...`);
    const insertedBills = [];

    for (const b of rawBills) {
      // Run the same category auto-detector if category missing or other
      const category = b.category || categorize(b.store, b.items);

      const billDoc = {
        userId: demoUser._id,
        store: b.store,
        date: b.date,
        total: b.total,
        items: b.items || [],
        category,
        notes: b.notes || '',
        warrantyExpiry: b.warrantyExpiry || null,
        returnUntil: b.returnUntil || null,
      };

      // Apply the same business rules (Electronics 12m warranty, Shopping 15d return)
      applyBillRules(billDoc);

      const saved = await Bill.create(billDoc);
      insertedBills.push(saved);
    }
    console.log(`✅ [Seed] Successfully created ${insertedBills.length} bills.`);

    // 3. Run Recurring Subscription Detection
    console.log('🔄 [Seed] Running recurring subscription detector...');
    const detected = await detectRecurring(demoUser._id);
    console.log(`✅ [Seed] Recurring detector found ${detected.length} recurring subscriptions (Jio, Netflix).`);

    // 4. Create Sample Split Bill
    console.log('👥 [Seed] Creating sample split bill...');
    // Find the Swiggy order worth ₹820
    const swiggyBill = insertedBills.find((b) => b.store === 'Swiggy' && b.total === 820);

    if (swiggyBill) {
      await Split.create({
        userId: demoUser._id,
        billId: swiggyBill._id,
        people: [
          { name: 'Rohan Sharma', share: 274, status: 'paid' },
          { name: 'Priya Patel', share: 273, status: 'pending' },
          { name: 'Amit Verma', share: 273, status: 'pending' },
        ],
        outstanding: 546,
      });
      console.log('✅ [Seed] Created sample 3-person split for Swiggy ₹820 (Outstanding: ₹546).');
    }

    // 5. Seed Realistic EMI Trackers
    console.log('💳 [Seed] Creating sample EMI trackers...');
    // Target due day 2 days from now for iPhone EMI alert
    const inTwoDays = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const emiDueDay = inTwoDays.getDate();

    const iphoneStartDate = monthsAgo(5);
    const iphonePayments = [];
    for (let i = 1; i <= 5; i++) {
      iphonePayments.push({
        installmentNumber: i,
        paidAt: monthsAgo(5 - i + 1),
        amount: 5000,
        note: `Installment ${i} of 12 (Paid via UPI auto-debit)`,
      });
    }

    const emi1 = await EMI.create({
      userId: demoUser._id,
      name: 'iPhone 17 Pro',
      lender: 'HDFC Bank EasyEMI',
      totalAmount: 60000,
      monthlyAmount: 5000,
      tenureMonths: 12,
      startDate: iphoneStartDate,
      dueDay: emiDueDay,
      category: 'Electronics',
      notes: 'No-cost EMI 12 months on HDFC credit card at Croma',
      payments: iphonePayments,
    });

    const sonyStartDate = monthsAgo(7);
    const sonyPayments = [];
    for (let i = 1; i <= 7; i++) {
      sonyPayments.push({
        installmentNumber: i,
        paidAt: monthsAgo(7 - i + 1),
        amount: 7500,
        note: `Installment ${i} of 12 (Net banking mandate)`,
      });
    }

    const emi2 = await EMI.create({
      userId: demoUser._id,
      name: "Sony Bravia 55' 4K OLED",
      lender: 'Bajaj Finserv',
      totalAmount: 90000,
      monthlyAmount: 7500,
      tenureMonths: 12,
      startDate: sonyStartDate,
      dueDay: 15,
      category: 'Appliances',
      notes: 'Living room TV on zero interest consumer finance',
      payments: sonyPayments,
    });

    console.log(`✅ [Seed] Created 2 sample EMIs (${emi1.name} ₹5,000/mo, ${emi2.name} ₹7,500/mo). Total monthly: ₹12,500.`);

    console.log('====================================================');
    console.log('🎉 [Seed] Seeding completed successfully!');
    console.log(`👤 Demo Account: ${demoEmail} / demo123`);
    console.log(`💳 Budget: ₹25,000 / month`);
    console.log(`📊 Total Bills: ${insertedBills.length}`);
    console.log('====================================================');
  } catch (err) {
    console.error('❌ [Seed] Error seeding database:', err.message);
    throw err;
  }
};

// If executed directly from CLI (npm run seed)
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seedDatabase()
    .then(async () => {
      const { disconnectDB } = await import('../src/config/db.js');
      await disconnectDB();
      console.log('🚀 Seed process exiting with 0.');
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
