/**
 * Phase 1 Backend Verification Test Suite (test_phase1.js)
 * --------------------------------------------------------
 * Comprehensive automated HTTP tests verifying every Phase 1 backend endpoint:
 * 1. Healthcheck
 * 2. User Signup (with validation)
 * 3. User Login (obtaining JWT)
 * 4. GET /api/auth/me (protected route)
 * 5. POST /api/bills (auto-categorization, auto-warranty 12m for Electronics, auto-return 15d for Shopping)
 * 6. GET /api/bills with each filter:
 *    - search (keyword)
 *    - category
 *    - minAmount & maxAmount
 *    - month (YYYY-MM)
 *    - sort (date_asc, total_desc)
 * 7. GET /api/recurring (automated subscription detection & daysUntilDue & monthlyTotal)
 * 8. POST /api/splits & PATCH /api/splits/:id/people/:personId (creation, exact paise split, and status update)
 * 9. POST /api/search with "How much did I spend on shoes this year?" (YoY comparison)
 * 10. GET /api/stats/monthly (budget, percentUsed, category breakdown, 6-month trend)
 * 11. GET /api/stats/insights (top category, MoM change, plain-English insight)
 * 12. GET /api/alerts (warranties <30d, returns <2d, recurring <3d, budget ≥80%)
 */

const BASE_URL = 'http://localhost:5000';

const runTests = async () => {
  console.log('================================================================');
  console.log('🧪 Starting Phase 1 Backend Comprehensive Verification Tests');
  console.log('================================================================\n');

  let passedCount = 0;
  let failedCount = 0;

  const assert = (condition, title, details = '') => {
    if (condition) {
      passedCount++;
      console.log(`✅ [PASS] ${title}`);
      if (details) console.log(`   ${details}`);
    } else {
      failedCount++;
      console.error(`❌ [FAIL] ${title}`);
      if (details) console.error(`   ${details}`);
    }
  };

  try {
    // -------------------------------------------------------------
    // TEST 1: Healthcheck
    // -------------------------------------------------------------
    console.log('\n--- 1. Healthcheck ---');
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    const healthData = await healthRes.json();
    assert(healthRes.status === 200 && healthData.status === 'ok', 'GET /api/health returned 200 OK', JSON.stringify(healthData));

    // -------------------------------------------------------------
    // TEST 2: Signup
    // -------------------------------------------------------------
    console.log('\n--- 2. Signup ---');
    const testEmail = `test_${Date.now()}@billsnap.in`;
    const signupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Explorer',
        email: testEmail,
        password: 'password123',
        monthlyBudget: 30000,
      }),
    });
    const signupData = await signupRes.json();
    assert(signupRes.status === 201 && signupData.token, 'POST /api/auth/signup created new user and returned token', `User ID: ${signupData.user?.id}, Email: ${signupData.user?.email}`);

    // -------------------------------------------------------------
    // TEST 3: Login (with Demo User)
    // -------------------------------------------------------------
    console.log('\n--- 3. Login (Demo User: demo@billsnap.in / demo123) ---');
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'demo@billsnap.in',
        password: 'demo123',
      }),
    });
    const loginData = await loginRes.json();
    const token = loginData.token;
    assert(loginRes.status === 200 && token, 'POST /api/auth/login returned JWT token', `Token length: ${token?.length} chars, Budget: ₹${loginData.user?.monthlyBudget}`);

    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    // -------------------------------------------------------------
    // TEST 4: GET /api/auth/me (Protected Route)
    // -------------------------------------------------------------
    console.log('\n--- 4. Protected /me Endpoint ---');
    const meRes = await fetch(`${BASE_URL}/api/auth/me`, { headers: authHeaders });
    const meData = await meRes.json();
    assert(meRes.status === 200 && meData.user?.email === 'demo@billsnap.in', 'GET /api/auth/me retrieved authenticated user profile', `Name: ${meData.user?.name}, Email: ${meData.user?.email}`);

    // -------------------------------------------------------------
    // TEST 5: Bill Create with Auto-Categorization & Smart Rules
    // -------------------------------------------------------------
    console.log('\n--- 5. Bill Create (Auto-Categorization & Rules) ---');

    // 5a. Electronics bill (no category specified -> auto categorizes to Electronics; auto 12m warranty)
    const elecBillRes = await fetch(`${BASE_URL}/api/bills`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        store: 'Croma Electronics',
        date: new Date().toISOString(),
        total: 4999,
        items: [{ name: 'Wireless Bluetooth Earbuds', price: 4999 }],
        // category omitted!
      }),
    });
    const elecBill = await elecBillRes.json();
    assert(
      elecBillRes.status === 201 &&
      elecBill.category === 'Electronics' &&
      elecBill.warrantyExpiry !== null,
      'Auto-categorized "Croma Electronics" as Electronics and applied 12-month warranty',
      `Category: ${elecBill.category}, Warranty: ${elecBill.warrantyExpiry}`
    );

    // 5b. Shopping bill (auto categorizes to Shopping; auto 15-day return window)
    const shopBillRes = await fetch(`${BASE_URL}/api/bills`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        store: 'Zudio Westside',
        date: new Date().toISOString(),
        total: 1299,
        items: [{ name: 'Casual Denim Jeans', price: 1299 }],
        // category omitted!
      }),
    });
    const shopBill = await shopBillRes.json();
    assert(
      shopBillRes.status === 201 &&
      shopBill.category === 'Shopping' &&
      shopBill.returnUntil !== null,
      'Auto-categorized "Zudio Westside" as Shopping and applied 15-day return window',
      `Category: ${shopBill.category}, Return Until: ${shopBill.returnUntil}`
    );

    // -------------------------------------------------------------
    // TEST 6: Bill Filters (search, category, amount, month, sort)
    // -------------------------------------------------------------
    console.log('\n--- 6. Bill Filters ---');

    // 6a. Search filter
    const searchRes = await fetch(`${BASE_URL}/api/bills?search=Swiggy`, { headers: authHeaders });
    const searchData = await searchRes.json();
    assert(searchRes.status === 200 && searchData.bills.length >= 3, 'GET /api/bills?search=Swiggy found matching bills', `Count found: ${searchData.bills.length}`);

    // 6b. Category filter
    const catRes = await fetch(`${BASE_URL}/api/bills?category=Groceries`, { headers: authHeaders });
    const catData = await catRes.json();
    assert(catRes.status === 200 && catData.bills.every((b) => b.category === 'Groceries'), 'GET /api/bills?category=Groceries matched only Groceries', `Count: ${catData.bills.length}`);

    // 6c. Min/Max amount filter
    const amtRes = await fetch(`${BASE_URL}/api/bills?minAmount=1000&maxAmount=5000`, { headers: authHeaders });
    const amtData = await amtRes.json();
    assert(
      amtRes.status === 200 &&
      amtData.bills.every((b) => b.total >= 1000 && b.total <= 5000),
      'GET /api/bills?minAmount=1000&maxAmount=5000 returned bills within range',
      `Count: ${amtData.bills.length}`
    );

    // 6d. Month filter
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthRes = await fetch(`${BASE_URL}/api/bills?month=${currentMonthStr}`, { headers: authHeaders });
    const monthData = await monthRes.json();
    assert(monthRes.status === 200 && monthData.bills.length > 0, `GET /api/bills?month=${currentMonthStr} filtered current month bills`, `Count: ${monthData.bills.length}`);

    // 6e. Sort filter
    const sortRes = await fetch(`${BASE_URL}/api/bills?sort=total_desc&limit=5`, { headers: authHeaders });
    const sortData = await sortRes.json();
    const isSorted = sortData.bills[0].total >= sortData.bills[1].total;
    assert(sortRes.status === 200 && isSorted, 'GET /api/bills?sort=total_desc correctly ordered highest bill first', `Top bill: ${sortData.bills[0].store} - ₹${sortData.bills[0].total}`);

    // -------------------------------------------------------------
    // TEST 7: Recurring Detection & Subscription Management
    // -------------------------------------------------------------
    console.log('\n--- 7. Recurring Subscriptions ---');
    const recRes = await fetch(`${BASE_URL}/api/recurring`, { headers: authHeaders });
    const recData = await recRes.json();
    assert(
      recRes.status === 200 &&
      recData.recurring.length >= 2 &&
      recData.monthlyTotal > 0,
      'GET /api/recurring detected recurring bills with daysUntilDue and monthlyTotal',
      `Detected subscriptions: ${recData.recurring.map((r) => `${r.name} (due in ${r.daysUntilDue}d)`).join(', ')} | Monthly Total: ₹${recData.monthlyTotal}`
    );

    // -------------------------------------------------------------
    // TEST 8: Split Bill Create and Update
    // -------------------------------------------------------------
    console.log('\n--- 8. Split Bill Management ---');

    // Create a new split on the electronic bill (₹4,999) among 3 people
    const splitCreateRes = await fetch(`${BASE_URL}/api/splits`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        billId: elecBill._id,
        people: [
          { name: 'Self' },
          { name: 'Sameer' },
          { name: 'Kavita' },
        ],
      }),
    });
    const splitData = await splitCreateRes.json();
    const sumShares = splitData.people.reduce((s, p) => s + p.share, 0);
    assert(
      splitCreateRes.status === 201 &&
      Math.abs(sumShares - elecBill.total) < 0.01,
      'POST /api/splits created 3-way equal split with exact paise balancing',
      `Shares: ${splitData.people.map((p) => `${p.name}: ₹${p.share}`).join(', ')} (Sum: ₹${sumShares} = Total ₹${elecBill.total})`
    );

    // Update a participant's status to 'paid'
    const participantToUpdate = splitData.people[1]; // Sameer
    const splitUpdateRes = await fetch(`${BASE_URL}/api/splits/${splitData._id}/people/${participantToUpdate._id}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ status: 'paid' }),
    });
    const updatedSplit = await splitUpdateRes.json();
    const updatedPerson = updatedSplit.people.find((p) => p._id === participantToUpdate._id);
    assert(
      splitUpdateRes.status === 200 &&
      updatedPerson.status === 'paid',
      'PATCH /api/splits/:id/people/:personId updated participant status to "paid" and recomputed outstanding',
      `New Outstanding: ₹${updatedSplit.outstanding}`
    );

    // -------------------------------------------------------------
    // TEST 9: Smart Search - "How much did I spend on shoes this year?"
    // -------------------------------------------------------------
    console.log('\n--- 9. Smart Search & YoY Comparison ---');
    const queryText = 'How much did I spend on shoes this year?';
    const searchNLRes = await fetch(`${BASE_URL}/api/search`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ query: queryText }),
    });
    const searchNLData = await searchNLRes.json();
    assert(
      searchNLRes.status === 200 &&
      searchNLData.total > 0 &&
      searchNLData.comparison !== undefined,
      `POST /api/search for "${queryText}"`,
      `Extracted: [Keyword: "${searchNLData.filters.keyword}", Category: ${searchNLData.filters.category}] | Total: ₹${searchNLData.total} across ${searchNLData.count} bills | Comparison: Last Year ₹${searchNLData.comparison.lastYearTotal} (Change: ${searchNLData.comparison.percentChange}%)`
    );

    // -------------------------------------------------------------
    // TEST 10: Monthly Statistics
    // -------------------------------------------------------------
    console.log('\n--- 10. Monthly Financial Statistics ---');
    const statsRes = await fetch(`${BASE_URL}/api/stats/monthly?month=${currentMonthStr}`, { headers: authHeaders });
    const statsData = await statsRes.json();
    assert(
      statsRes.status === 200 &&
      statsData.total > 0 &&
      statsData.trend?.length === 6,
      'GET /api/stats/monthly returned total, budget percent used, and 6-month historical trend',
      `This Month: ₹${statsData.total} / ₹${statsData.budget} (${statsData.percentUsed}% used) | 6-Mo Trend: [${statsData.trend.map((t) => `${t.label}: ₹${t.total}`).join(', ')}]`
    );

    // -------------------------------------------------------------
    // TEST 11: Financial Insights
    // -------------------------------------------------------------
    console.log('\n--- 11. Financial Insights ---');
    const insightsRes = await fetch(`${BASE_URL}/api/stats/insights`, { headers: authHeaders });
    const insightsData = await insightsRes.json();
    assert(
      insightsRes.status === 200 &&
      insightsData.insight &&
      insightsData.topCategory,
      'GET /api/stats/insights generated top category, biggest bill, and plain-English summary',
      `Insight: "${insightsData.insight}"`
    );

    // -------------------------------------------------------------
    // TEST 12: Alerts Feed
    // -------------------------------------------------------------
    console.log('\n--- 12. Alerts and Deadlines Feed ---');
    const alertsRes = await fetch(`${BASE_URL}/api/alerts`, { headers: authHeaders });
    const alertsData = await alertsRes.json();
    const alertTypes = alertsData.map((a) => a.type);
    assert(
      alertsRes.status === 200 &&
      alertsData.length > 0,
      'GET /api/alerts retrieved sorted list of deadlines and warnings',
      `Alerts found (${alertsData.length}):\n${alertsData.map((a) => `   - [${a.type.toUpperCase()}] ${a.title}: ${a.message} (Days left: ${a.daysLeft})`).join('\n')}`
    );

    // Summary
    console.log('\n================================================================');
    console.log(`🏁 Phase 1 Test Results: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log('================================================================\n');

    if (failedCount > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('💥 Test execution error:', err);
    process.exit(1);
  }
};

runTests();
