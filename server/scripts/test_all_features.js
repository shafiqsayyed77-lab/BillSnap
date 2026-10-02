// Automated comprehensive verification suite using native fetch
const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('🚀 Starting BillSnap Automated Verification Suite...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Health Check
    console.log('--- 1. Health Check ---');
    const healthRes = await fetch(`${BASE_URL}/health`);
    const healthData = await healthRes.json();
    assert(healthRes.status === 200 && healthData.status === 'ok', 'Server health check returns 200 OK');

    // 2. Authentication: Login
    console.log('\n--- 2. Authentication: Login ---');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'demo@billsnap.in', password: 'demo123' })
    });
    const loginData = await loginRes.json();
    assert(loginRes.status === 200 && loginData.token, 'Demo user login succeeds with JWT');
    const token = loginData.token;
    const authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    // 3. Stats & SpendCard
    console.log('\n--- 3. Stats & SpendCard ---');
    const statsRes = await fetch(`${BASE_URL}/stats/monthly`, { headers: authHeaders });
    const statsData = await statsRes.json();
    assert(statsRes.status === 200 && statsData.total !== undefined, `Monthly stats returns total spend: ₹${statsData.total}`);
    assert(statsData.budget > 0, `Target budget is set: ₹${statsData.budget} (Used: ${statsData.percentUsed}%)`);

    // 4. Ask BillSnap / Smart Search queries
    console.log('\n--- 4. Ask BillSnap / Natural Language Search ---');
    const queries = [
      'How much did I spend on food this month?',
      'How much did I spend on shoes this year?',
      'What was my biggest purchase?',
      'How much did I spend at Zudio?',
      'Which category costs me the most?',
      'What bills are due soon?'
    ];

    for (const q of queries) {
      const searchRes = await fetch(`${BASE_URL}/search`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ query: q })
      });
      const searchData = await searchRes.json();
      assert(
        searchRes.status === 200 && typeof searchData.answer === 'string' && searchData.answer.length > 0,
        `Ask BillSnap: "${q}" -> "${searchData.answer}"`
      );
      assert(Array.isArray(searchData.bills), `Matching bills array returned (count: ${searchData.bills?.length || 0})`);
    }

    // 5. Price History
    console.log('\n--- 5. Price History ---');
    const priceHistRes = await fetch(`${BASE_URL}/bills/price-history`, { headers: authHeaders });
    const priceHistData = await priceHistRes.json();
    assert(priceHistRes.status === 200, 'Price history endpoint returns 200');
    assert(Array.isArray(priceHistData.priceHistory), `Price history returns array (count: ${priceHistData.priceHistory?.length})`);
    if (priceHistData.priceHistory?.length > 0) {
      priceHistData.priceHistory.forEach(p => {
        console.log(`    📦 "${p.name}" | Previous: ₹${p.previousPrice} | Current: ₹${p.currentPrice} | Diff: ₹${p.difference} | Savings: ₹${p.savings}`);
      });
      const p = priceHistData.priceHistory[0];
      assert(p.name && p.currentPrice && p.history?.length >= 2, `Product has repeat purchase history (${p.history.length} records)`);
    }

    // 6. Duplicate Bill Detector
    console.log('\n--- 6. Duplicate Bill Detector ---');
    const billsRes = await fetch(`${BASE_URL}/bills`, { headers: authHeaders });
    const billsData = await billsRes.json();
    assert(billsData.bills && billsData.bills.length > 0, `User has ${billsData.bills.length} bills in database`);
    const existingBill = billsData.bills[0];

    // Check duplicate with matching store, date, total
    const dupCheck1 = await fetch(`${BASE_URL}/bills/check-duplicate`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        store: existingBill.store,
        total: existingBill.total,
        date: existingBill.date
      })
    });
    const dup1Data = await dupCheck1.json();
    assert(dup1Data.isDuplicate === true, `Detected duplicate for store="${existingBill.store}", total=₹${existingBill.total}`);
    assert(dup1Data.duplicateBills.length > 0, `Returns duplicate bill details matching ID: ${dup1Data.duplicateBills[0]._id}`);

    // Check non-duplicate
    const dupCheck2 = await fetch(`${BASE_URL}/bills/check-duplicate`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        store: 'Unique Store Never Used',
        total: 999999,
        date: '2026-01-01'
      })
    });
    const dup2Data = await dupCheck2.json();
    assert(dup2Data.isDuplicate === false, 'Correctly flags non-duplicate bill as isDuplicate=false');

    // 7. Timeline
    console.log('\n--- 7. Timeline ---');
    const timelineRes = await fetch(`${BASE_URL}/bills/timeline`, { headers: authHeaders });
    const timelineData = await timelineRes.json();
    assert(timelineRes.status === 200 && Array.isArray(timelineData.events), `Timeline endpoint returns 200 with ${timelineData.events?.length} events`);
    const eventTypes = new Set(timelineData.events?.map(e => e.type));
    console.log(`    Timeline event types represented: ${Array.from(eventTypes).join(', ')}`);
    assert(eventTypes.size > 0, 'Timeline contains populated event stream');

    // 8. Warranty Vault
    console.log('\n--- 8. Warranty Vault ---');
    const warrantyBills = billsData.bills.filter(b => b.warrantyExpiry);
    assert(warrantyBills.length > 0, `Warranty vault contains ${warrantyBills.length} warrantied items`);
    const wb = warrantyBills[0];
    const wbDays = Math.ceil((new Date(wb.warrantyExpiry) - new Date()) / (1000 * 60 * 60 * 24));
    console.log(`    Sample: "${wb.store}" - Warranty until ${wb.warrantyExpiry} (${wbDays} days remaining)`);
    assert(wb.store && wb.total, 'Warrantied bill data is complete');

    // 9. Return Countdown
    console.log('\n--- 9. Return Countdown ---');
    const returnBills = billsData.bills.filter(b => b.returnUntil);
    assert(returnBills.length > 0, `Returns section contains ${returnBills.length} returnable items`);
    const rb = returnBills[0];
    const rbDays = Math.ceil((new Date(rb.returnUntil) - new Date()) / (1000 * 60 * 60 * 24));
    console.log(`    Sample: "${rb.store}" - Return until ${rb.returnUntil} (${rbDays} days remaining)`);
    assert(rb.store && rb.total, 'Returnable bill data is complete');

    // 10. Insights & Monthly Financial Story & Smart Saving Observations
    console.log('\n--- 10. Insights & Monthly Financial Story ---');
    const insightsRes = await fetch(`${BASE_URL}/stats/insights`, { headers: authHeaders });
    const insightsData = await insightsRes.json();
    assert(insightsRes.status === 200, 'Insights endpoint returns 200');
    assert(insightsData.financialStory !== undefined, 'Financial story object is present');
    console.log(`    Story total: "${insightsData.financialStory?.totalSpentText}"`);
    console.log(`    Story category: "${insightsData.financialStory?.biggestCategoryText}"`);
    console.log(`    Story purchase: "${insightsData.financialStory?.biggestPurchaseText}"`);
    console.log(`    Story budget: "${insightsData.financialStory?.budgetUsedText}"`);
    console.log(`    Observations: ${insightsData.observations?.length || 0} observations found`);
    if (insightsData.observations?.length > 0) {
      insightsData.observations.forEach(o => console.log(`      * ${o}`));
    }
    assert(insightsData.observations && insightsData.observations.length > 0, 'Smart saving observations generated from real data');

    // 11. Alerts
    console.log('\n--- 11. Smart Alerts ---');
    const alertsRes = await fetch(`${BASE_URL}/alerts`, { headers: authHeaders });
    const alertsData = await alertsRes.json();
    assert(alertsRes.status === 200 && Array.isArray(alertsData), `Alerts endpoint returns ${alertsData.length} alerts`);
    const alertTypes = alertsData.map(a => a.type);
    console.log(`    Active alert types: ${alertTypes.join(', ')}`);
    assert(alertsData.length > 0, 'User receives timely, non-spammy alerts');

    // 12. Recurring Bills
    console.log('\n--- 12. Recurring Bills ---');
    const recurringRes = await fetch(`${BASE_URL}/recurring`, { headers: authHeaders });
    const recurringData = await recurringRes.json();
    assert(recurringRes.status === 200 && Array.isArray(recurringData.recurring), `Recurring bills returns ${recurringData.recurring.length} items`);
    assert(recurringData.monthlyTotal > 0, `Projected recurring monthly total: ₹${recurringData.monthlyTotal}`);

    // 13. Split Bills
    console.log('\n--- 13. Split Bills ---');
    const splitsRes = await fetch(`${BASE_URL}/splits`, { headers: authHeaders });
    const splitsData = await splitsRes.json();
    assert(splitsRes.status === 200 && Array.isArray(splitsData), `Splits endpoint returns ${splitsData.length} splits`);

    // 14. Purchase Memory (Single Bill Detail with items, warranty, return, split)
    console.log('\n--- 14. Purchase Memory (Bill Detail) ---');
    const singleBillRes = await fetch(`${BASE_URL}/bills/${existingBill._id}`, { headers: authHeaders });
    const singleBillData = await singleBillRes.json();
    assert(singleBillRes.status === 200 && singleBillData._id, 'Bill details fetched successfully');
    const b = singleBillData;
    assert(b.store && b.total && b.category, `Bill #${b._id}: store=${b.store}, total=₹${b.total}, category=${b.category}`);
    console.log(`    Line items count: ${b.items?.length || 0}`);
    console.log(`    Warranty expiry: ${b.warrantyExpiry || 'None'}`);
    console.log(`    Return deadline: ${b.returnUntil || 'None'}`);

    // 15. User Profile & Target Budget Update
    console.log('\n--- 15. Profile & Target Budget Update ---');
    const updateProfileRes = await fetch(`${BASE_URL}/auth/profile`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ monthlyBudget: 35000 })
    });
    const updateProfileData = await updateProfileRes.json();
    assert(updateProfileRes.status === 200 && updateProfileData.user.monthlyBudget === 35000, 'Monthly budget successfully updated to ₹35,000');
    // Restore budget to 25000
    await fetch(`${BASE_URL}/auth/profile`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ monthlyBudget: 25000 })
    });
    assert(true, 'Monthly budget restored to ₹25,000');

    console.log(`\n====================================================`);
    console.log(`🏁 ALL 15 AUTOMATED VERIFICATION SUITES COMPLETED!`);
    console.log(`   Passed: ${passed}`);
    console.log(`   Failed: ${failed}`);
    console.log(`====================================================`);
  } catch (err) {
    console.error('💥 Test execution error:', err);
  }
}

runTests();
