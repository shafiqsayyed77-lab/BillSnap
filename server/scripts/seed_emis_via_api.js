// Script to seed EMIs via authenticated API calls
const BASE_URL = 'http://localhost:5000/api';

async function seedEmis() {
  console.log('🌱 Seeding sample EMIs via API...');

  // 1. Login
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo@billsnap.in', password: 'demo123' })
  });
  const loginData = await loginRes.json();
  if (!loginData.token) {
    console.error('Login failed:', loginData);
    return;
  }

  const token = loginData.token;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // 2. Check existing EMIs
  const existingRes = await fetch(`${BASE_URL}/emis`, { headers });
  const existingData = await existingRes.json();

  if (existingData.emis && existingData.emis.length > 0) {
    console.log(`ℹ️ User already has ${existingData.emis.length} EMIs:`);
    existingData.emis.forEach(e => console.log(`  - ${e.name} (${e.lender}) - ₹${e.monthlyAmount}/mo`));
    return;
  }

  // Target due day 2 days from now
  const inTwoDays = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  const emiDueDay = inTwoDays.getDate();

  // Create iPhone 17 Pro EMI
  const fiveMonthsAgo = new Date();
  fiveMonthsAgo.setMonth(fiveMonthsAgo.getMonth() - 5);

  const emi1Res = await fetch(`${BASE_URL}/emis`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: 'iPhone 17 Pro',
      lender: 'HDFC Bank EasyEMI',
      totalAmount: 60000,
      monthlyAmount: 5000,
      tenureMonths: 12,
      startDate: fiveMonthsAgo.toISOString(),
      dueDay: emiDueDay,
      category: 'Electronics',
      notes: 'No-cost EMI 12 months on HDFC credit card at Croma'
    })
  });
  const emi1Data = await emi1Res.json();
  console.log('✅ Created EMI 1:', emi1Data.emi?.name, 'ID:', emi1Data.emi?._id);

  // Mark 5 installments paid for EMI 1
  for (let i = 1; i <= 5; i++) {
    const payDate = new Date();
    payDate.setMonth(payDate.getMonth() - (5 - i + 1));
    await fetch(`${BASE_URL}/emis/${emi1Data.emi._id}/pay`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        amount: 5000,
        paidAt: payDate.toISOString(),
        note: `Installment ${i} of 12 (Paid via UPI auto-debit)`
      })
    });
  }
  console.log('  -> Recorded 5 paid installments for iPhone 17 Pro (₹25,000 paid, ₹35,000 remaining).');

  // Create Sony Bravia EMI
  const sevenMonthsAgo = new Date();
  sevenMonthsAgo.setMonth(sevenMonthsAgo.getMonth() - 7);

  const emi2Res = await fetch(`${BASE_URL}/emis`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: "Sony Bravia 55' 4K OLED",
      lender: 'Bajaj Finserv',
      totalAmount: 90000,
      monthlyAmount: 7500,
      tenureMonths: 12,
      startDate: sevenMonthsAgo.toISOString(),
      dueDay: 15,
      category: 'Appliances',
      notes: 'Living room TV on zero interest consumer finance'
    })
  });
  const emi2Data = await emi2Res.json();
  console.log('✅ Created EMI 2:', emi2Data.emi?.name, 'ID:', emi2Data.emi?._id);

  // Mark 7 installments paid for EMI 2
  for (let i = 1; i <= 7; i++) {
    const payDate = new Date();
    payDate.setMonth(payDate.getMonth() - (7 - i + 1));
    await fetch(`${BASE_URL}/emis/${emi2Data.emi._id}/pay`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        amount: 7500,
        paidAt: payDate.toISOString(),
        note: `Installment ${i} of 12 (Net banking mandate)`
      })
    });
  }
  console.log('  -> Recorded 7 paid installments for Sony Bravia (₹52,500 paid, ₹37,500 remaining).');

  // Fetch final summary
  const finalRes = await fetch(`${BASE_URL}/emis`, { headers });
  const finalData = await finalRes.json();
  console.log('\n📊 Final EMI Summary:');
  console.log(`  Active EMIs: ${finalData.summary?.activeCount}`);
  console.log(`  Monthly Commitment: ₹${finalData.summary?.totalMonthlyCommitment}`);
  console.log(`  Remaining Balance: ₹${finalData.summary?.totalRemainingAmount}`);
  console.log(`  Due Soon Count: ${finalData.summary?.dueSoonCount}`);
}

seedEmis();
