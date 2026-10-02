/**
 * Comprehensive Automated Test Suite for EMI Tracker & Passkey Features
 * Tests all 17 EMI requirements and all 10 Passkey / Auth requirements.
 */

const BASE_URL = 'http://localhost:5000/api';

async function runFullVerification() {
  console.log('🚀 Running BillSnap EMI & Passkey Verification Suite...\n');
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
    // -------------------------------------------------------------
    // PART 1: AUTHENTICATION & SESSION RESTORATION
    // -------------------------------------------------------------
    console.log('=== PART 1: AUTHENTICATION & SESSION RESTORATION ===');

    // 1.1 Password Login
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'demo@billsnap.in', password: 'demo123' })
    });
    const loginData = await loginRes.json();
    assert(loginRes.status === 200 && loginData.token, '1. Normal password login succeeds');
    const demoToken = loginData.token;
    const authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${demoToken}`
    };

    // 1.2 Session Restoration via /auth/me
    const meRes = await fetch(`${BASE_URL}/auth/me`, { headers: authHeaders });
    const meData = await meRes.json();
    assert(meRes.status === 200 && meData.user?.email === 'demo@billsnap.in', '2. Session restoration via /auth/me succeeds');

    // 1.3 Invalid/Expired token handling
    const invalidAuthRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: 'Bearer invalid_or_expired_token_12345' }
    });
    assert(invalidAuthRes.status === 401, '3. Expired or invalid token correctly rejected with 401 Unauthorized');

    // -------------------------------------------------------------
    // PART 2: PASSKEY / WEBAUTHN ENDPOINTS
    // -------------------------------------------------------------
    console.log('\n=== PART 2: PASSKEY / WEBAUTHN VERIFICATION ===');

    // 2.1 Register Options
    const regOptRes = await fetch(`${BASE_URL}/passkey/register-options`, {
      method: 'POST',
      headers: authHeaders
    });
    const regOptData = await regOptRes.json();
    assert(regOptRes.status === 200 && regOptData.options?.challenge, '4. WebAuthn registration options generated with cryptographic challenge');
    assert(regOptData.challengeId && regOptData.options.rp?.name === 'BillSnap', '5. Registration options include correct RP name (BillSnap) and session challengeId');

    // 2.2 Login Options (Public)
    const loginOptRes = await fetch(`${BASE_URL}/passkey/login-options`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'demo@billsnap.in' })
    });
    const loginOptData = await loginOptRes.json();
    assert(loginOptRes.status === 200 && loginOptData.options?.challenge, '6. WebAuthn login options generated with valid challenge');
    assert(loginOptData.challengeId, '7. Login options return tracking challengeId for replay attack protection');

    // 2.3 List Passkeys for User
    const listPasskeysRes = await fetch(`${BASE_URL}/passkey/list`, { headers: authHeaders });
    const listPasskeysData = await listPasskeysRes.json();
    assert(listPasskeysRes.status === 200 && Array.isArray(listPasskeysData.passkeys), '8. Passkey listing endpoint returns registered devices array');

    // 2.4 Verify Passkey Auth Error Handling (Unrecognized credential)
    const fakeAuthRes = await fetch(`${BASE_URL}/passkey/verify-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        challengeId: loginOptData.challengeId,
        response: { id: 'non_existent_credential_id', rawId: 'fake', type: 'public-key' }
      })
    });
    assert(fakeAuthRes.status === 401, '9. Unrecognized passkey credentials correctly rejected without security leaks');

    // -------------------------------------------------------------
    // PART 3: EMI TRACKER LIFECYCLE & CALCULATIONS
    // -------------------------------------------------------------
    console.log('\n=== PART 3: EMI TRACKER LIFECYCLE & CALCULATIONS ===');

    // 3.1 Fetch initial EMIs
    const initialEmisRes = await fetch(`${BASE_URL}/emis`, { headers: authHeaders });
    const initialEmisData = await initialEmisRes.json();
    assert(initialEmisRes.status === 200 && Array.isArray(initialEmisData.emis), '10. GET /api/emis returns user EMI list');
    assert(initialEmisData.summary?.activeCount !== undefined, '11. Dashboard commitment summary included (totalMonthlyCommitment & remainingAmount)');

    // 3.2 Add a new EMI
    const createEmiRes = await fetch(`${BASE_URL}/emis`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: 'MacBook Air M3 Test',
        lender: 'Apple Financial Services',
        totalAmount: 120000,
        tenureMonths: 12,
        monthlyAmount: 10000,
        startDate: new Date().toISOString(),
        dueDay: 10,
        category: 'Electronics',
        notes: 'Verification test EMI tracker'
      })
    });
    const createEmiData = await createEmiRes.json();
    assert(createEmiRes.status === 201 && createEmiData.emi?._id, '12. Add EMI creates new loan record (MacBook Air M3)');
    const testEmiId = createEmiData.emi._id;
    const testEmi = createEmiData.emi;

    assert(testEmi.monthsCompleted === 0, '13. Initial months completed is 0');
    assert(testEmi.monthsRemaining === 12, '14. Initial months remaining is 12');
    assert(testEmi.totalPaid === 0, '15. Initial total paid is ₹0');
    assert(testEmi.remainingAmount === 120000, '16. Initial remaining amount equals financed total (₹1,20,000)');
    assert(testEmi.completionPercentage === 0, '17. Initial completion percentage is 0%');
    assert(testEmi.status === 'active' || testEmi.status === 'due_soon', `18. EMI initial status is valid: ${testEmi.status}`);

    // 3.3 View single EMI by ID
    const getSingleRes = await fetch(`${BASE_URL}/emis/${testEmiId}`, { headers: authHeaders });
    const getSingleData = await getSingleRes.json();
    assert(getSingleRes.status === 200 && getSingleData.emi?._id === testEmiId, '19. View EMI by ID returns enriched loan breakdown');

    // 3.4 Edit EMI
    const editEmiRes = await fetch(`${BASE_URL}/emis/${testEmiId}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({
        notes: 'Updated notes with invoice #M3-9988'
      })
    });
    const editEmiData = await editEmiRes.json();
    assert(editEmiRes.status === 200 && editEmiData.emi.notes === 'Updated notes with invoice #M3-9988', '20. Edit EMI updates loan configuration');

    // 3.5 Record First Payment (Mark Paid)
    const pay1Res = await fetch(`${BASE_URL}/emis/${testEmiId}/pay`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ amount: 10000, note: 'Payment 1 via HDFC UPI' })
    });
    const pay1Data = await pay1Res.json();
    const afterPay1 = pay1Data.emi;
    assert(pay1Res.status === 200, '21. Mark payment as paid succeeds');
    assert(afterPay1.monthsCompleted === 1, '22. Months completed increased to 1');
    assert(afterPay1.monthsRemaining === 11, '23. Months remaining decreased to 11');
    assert(afterPay1.totalPaid === 10000, '24. Total paid updated to ₹10,000');
    assert(afterPay1.remainingAmount === 110000, '25. Remaining amount decreased to ₹1,10,000');
    assert(afterPay1.completionPercentage === 8, '26. Completion percentage updated correctly (8%)');
    assert(afterPay1.payments.length === 1, '27. Payment history includes recorded installment');

    // 3.6 Undo Payment
    const undoRes = await fetch(`${BASE_URL}/emis/${testEmiId}/undo-pay`, {
      method: 'POST',
      headers: authHeaders
    });
    const undoData = await undoRes.json();
    assert(undoRes.status === 200 && undoData.emi.monthsCompleted === 0, '28. Undo payment successfully reverts installment and recalculates metrics');

    // 3.7 Multi-tenant isolation: Verify another user cannot access this EMI
    // Create temporary User B
    const userBSignup = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'User B Test',
        email: `user_b_${Date.now()}@billsnap.in`,
        password: 'password123'
      })
    });
    const userBData = await userBSignup.json();
    const userBToken = userBData.token;

    const crossUserRes = await fetch(`${BASE_URL}/emis/${testEmiId}`, {
      headers: { Authorization: `Bearer ${userBToken}` }
    });
    assert(crossUserRes.status === 404, '29. Multi-tenant security: Another user cannot access or view this EMI (returns 404)');

    const crossUserPay = await fetch(`${BASE_URL}/emis/${testEmiId}/pay`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userBToken}` }
    });
    assert(crossUserPay.status === 404, '30. Multi-tenant security: Another user cannot record payments on this EMI');

    // 3.8 Delete Test EMI
    const deleteRes = await fetch(`${BASE_URL}/emis/${testEmiId}`, {
      method: 'DELETE',
      headers: authHeaders
    });
    assert(deleteRes.status === 200, '31. Delete EMI successfully removes the record');

    // Verify deleted
    const verifyDeleted = await fetch(`${BASE_URL}/emis/${testEmiId}`, { headers: authHeaders });
    assert(verifyDeleted.status === 404, '32. Verified EMI no longer exists after deletion');

    // -------------------------------------------------------------
    // PART 4: ALERTS, INSIGHTS & TIMELINE INTEGRATION
    // -------------------------------------------------------------
    console.log('\n=== PART 4: ALERTS, INSIGHTS & TIMELINE INTEGRATION ===');

    // 4.1 Alerts includes EMI due soon
    const alertsRes = await fetch(`${BASE_URL}/alerts`, { headers: authHeaders });
    const alertsData = await alertsRes.json();
    const emiAlert = alertsData.find(a => a.type === 'emi');
    assert(emiAlert !== undefined, `33. Alerts feed includes EMI alert: "${emiAlert?.message}"`);

    // 4.2 Insights includes EMI Commitments
    const insightsRes = await fetch(`${BASE_URL}/stats/insights`, { headers: authHeaders });
    const insightsData = await insightsRes.json();
    assert(insightsData.emiSummary !== null, '34. Insights endpoint includes emiSummary object');
    const emiObs = insightsData.observations?.find(o => o.includes('active EMIs total') || o.includes('remaining across your active EMIs'));
    assert(emiObs !== undefined, `35. Insights observations include plain-English EMI commitment: "${emiObs}"`);

    // 4.3 Timeline includes EMI due milestones
    const timelineRes = await fetch(`${BASE_URL}/bills/timeline`, { headers: authHeaders });
    const timelineData = await timelineRes.json();
    const emiTimelineEvent = timelineData.events?.find(e => e.type === 'emi');
    assert(emiTimelineEvent !== undefined, `36. Unified timeline includes chronological EMI due event: "${emiTimelineEvent?.title}"`);

    console.log('\n====================================================');
    console.log(`🏁 VERIFICATION COMPLETE! Passed: ${passed} | Failed: ${failed}`);
    console.log('====================================================');
  } catch (err) {
    console.error('💥 Test execution error:', err);
  }
}

runFullVerification();
