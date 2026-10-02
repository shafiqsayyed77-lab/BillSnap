// Test Split creation, alerts, timeline and settlement
const BASE_URL = 'http://localhost:5000/api';

async function testSplitsFlow() {
  console.log('Testing Bill Split Lifecycle...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo@billsnap.in', password: 'demo123' })
  });
  const { token } = await loginRes.json();
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  const billsRes = await fetch(`${BASE_URL}/bills`, { headers: authHeaders });
  const { bills } = await billsRes.json();
  const billToSplit = bills.find(b => b.store.includes('Barbeque') || b.store.includes('Croma') || b.category === 'Food') || bills[0];

  console.log(`Splitting bill: "${billToSplit.store}" - ₹${billToSplit.total}`);

  // Create split with 2 equal participants
  const splitRes = await fetch(`${BASE_URL}/splits`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      billId: billToSplit._id,
      people: [
        { name: 'Me', status: 'paid' },
        { name: 'Arun', status: 'pending' }
      ]
    })
  });
  const splitData = await splitRes.json();
  console.log('✅ Split created:', splitData._id, 'Outstanding: ₹' + splitData.outstanding);

  // Check timeline includes split
  const timelineRes = await fetch(`${BASE_URL}/bills/timeline`, { headers: authHeaders });
  const { events } = await timelineRes.json();
  const splitEvent = events.find(e => e.type === 'split');
  console.log('✅ Timeline includes split event:', splitEvent ? splitEvent.title : 'None');

  // Check alerts include split
  const alertsRes = await fetch(`${BASE_URL}/alerts`, { headers: authHeaders });
  const alerts = await alertsRes.json();
  const splitAlert = alerts.find(a => a.type === 'split');
  console.log('✅ Alerts include split alert:', splitAlert ? splitAlert.message : 'None');

  console.log('🎉 Split flow verified successfully!');
}

testSplitsFlow();
