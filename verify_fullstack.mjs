// verify_fullstack.mjs - Comprehensive Full-Stack Verification Suite
const BASE_URL = 'http://localhost:5001';

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  passedTests++;
  console.log(`✅ PASS: ${message}`);
}

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(url, { ...options, headers });
  const data = await res.json();
  return { status: res.status, data };
}

async function runSuite() {
  console.log('================================================================');
  console.log('🧪 RUNNING ORBIT MARKET ENTERPRISE VERIFICATION SUITE');
  console.log('================================================================\n');

  // 1. Health check
  console.log('--- Test 1: API Server Health ---');
  const health = await request('/api/health');
  assert(health.status === 200, 'Health check returns 200 OK');
  assert(health.data.status === 'ok', 'Health status is "ok"');
  assert(health.data.version === '2.0.0-fullstack', 'Backend version is 2.0.0-fullstack');

  // 2. Demo accounts
  console.log('\n--- Test 2: Role Accounts Discovery ---');
  const demoAccounts = await request('/api/auth/demo-accounts');
  assert(demoAccounts.status === 200, 'Demo accounts endpoint returns 200');
  assert(demoAccounts.data.data.length === 5, 'All 5 RBAC roles are present');

  // 3. Authenticate as Cashier
  console.log('\n--- Test 3: Cashier Authentication & JWT ---');
  const cashierLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'cashier@orbitmarket.com', password: 'Cashier@123' })
  });
  assert(cashierLogin.status === 200, 'Cashier login succeeded');
  assert(Boolean(cashierLogin.data.token), 'JWT token returned');
  assert(cashierLogin.data.user.role === 'CASHIER', 'Role verified as CASHIER');
  const cashierToken = cashierLogin.data.token;

  // Authenticate as Super Admin
  console.log('\n--- Test 4: Super Admin Authentication ---');
  const adminLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@orbitmarket.com', password: 'Admin@123' })
  });
  assert(adminLogin.status === 200, 'Admin login succeeded');
  assert(adminLogin.data.user.role === 'SUPER_ADMIN', 'Role verified as SUPER_ADMIN');
  const adminToken = adminLogin.data.token;

  // 4. Products catalogue verification
  console.log('\n--- Test 5: Catalogue Baseline Pricing Integrity ---');
  const prodRes = await request('/api/products?limit=200');
  assert(prodRes.status === 200, 'Products endpoint returns 200');
  assert(prodRes.data.data.length >= 150, `At least 150 enterprise supermarket products loaded (found ${prodRes.data.data.length})`);

  const rice = prodRes.data.data.find(p => p.name === 'Rice');
  const sugar = prodRes.data.data.find(p => p.name === 'Sugar');
  const milk = prodRes.data.data.find(p => p.name === 'Milk');
  const bread = prodRes.data.data.find(p => p.name === 'Bread');

  assert(rice && rice.sellingPrice === 500, 'Rice baseline price is ₹500');
  assert(sugar && sugar.sellingPrice === 60, 'Sugar baseline price is ₹60');
  assert(milk && milk.sellingPrice === 30, 'Milk baseline price is ₹30');
  assert(bread && bread.sellingPrice === 40, 'Bread baseline price is ₹40');

  // 5. Coupon validation
  console.log('\n--- Test 6: Coupon Validation Engine ---');
  const couponCheck = await request('/api/coupons/validate', {
    method: 'POST',
    body: JSON.stringify({ code: 'SAVE10', subtotal: 1060 })
  });
  assert(couponCheck.status === 200, 'Coupon validate returned 200');
  assert(couponCheck.data.valid === true, 'SAVE10 coupon is valid');
  assert(couponCheck.data.data.discountAmount === 106, 'SAVE10 discount is exactly ₹106 on ₹1,060');

  // 6. Mandatory Acceptance Test: Checkout Rice x 2 + Sugar x 1 with SAVE10
  console.log('\n--- Test 7: Mandatory Acceptance Test (Rice x 2 + Sugar x 1 + SAVE10) ---');
  const riceStockBefore = rice.stock;
  const sugarStockBefore = sugar.stock;

  const checkoutPayload = {
    items: [
      { productId: rice.id, quantity: 2 },
      { productId: sugar.id, quantity: 1 }
    ],
    couponCode: 'SAVE10',
    paymentMethod: 'CASH',
    amountReceived: 1000,
    customer: { name: 'Pallapu Dileep Kumar', phone: '9876543210' }
  };

  const checkoutRes = await request('/api/sales/checkout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${cashierToken}` },
    body: JSON.stringify(checkoutPayload)
  });

  assert(checkoutRes.status === 201, 'Checkout processed with status 201 Created');
  const sale = checkoutRes.data.data;
  assert(sale.subtotal === 1060, 'Subtotal is exactly ₹1,060 (500*2 + 60*1)');
  assert(sale.discount === 106, 'Discount is exactly ₹106 (10% of 1060)');
  assert(sale.finalTotal === 954, 'Final Total is exactly ₹954 (1060 - 106)');
  assert(sale.amountReceived === 1000, 'Amount received is ₹1,000');
  assert(sale.changeReturned === 46, 'Change returned is exactly ₹46 (1000 - 954)');
  assert(sale.paymentStatus === 'COMPLETED', 'Payment status is COMPLETED');

  // Verify stock deduction in SQLite
  const riceAfter = (await request(`/api/products/lookup/${rice.id}`)).data.data;
  const sugarAfter = (await request(`/api/products/lookup/${sugar.id}`)).data.data;
  assert(riceAfter.stock === riceStockBefore - 2, `Rice stock deducted by 2: ${riceStockBefore} -> ${riceAfter.stock}`);
  assert(sugarAfter.stock === sugarStockBefore - 1, `Sugar stock deducted by 1: ${sugarStockBefore} -> ${sugarAfter.stock}`);

  // 7. Inventory movement verification
  console.log('\n--- Test 8: Inventory Stock Movement Ledger ---');
  const movements = await request(`/api/inventory/movements?productId=${rice.id}&limit=5`);
  assert(movements.status === 200, 'Movements returned 200');
  const latestMovement = movements.data.data[0];
  assert(latestMovement.type === 'SALE', 'Latest movement type is SALE');
  assert(latestMovement.quantity === -2, 'Movement quantity is -2');

  // 8. Purchase Order & Receiving (replenishment)
  console.log('\n--- Test 9: Supplier Purchase Order & Stock Replenishment ---');
  const suppliers = (await request('/api/suppliers')).data.data;
  assert(suppliers.length > 0, 'Suppliers available');

  const poRes = await request('/api/purchase-orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      supplierId: suppliers[0].id,
      items: [{ productId: rice.id, quantityOrdered: 10, unitCost: 350 }],
      notes: 'Automated test replenishment'
    })
  });
  assert(poRes.status === 201, 'Purchase order created');
  const createdPO = poRes.data.data;

  // Receive goods
  const receiveRes = await request(`/api/purchase-orders/${createdPO.id}/receive`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(receiveRes.status === 200, 'Purchase order received');
  const riceAfterPO = (await request(`/api/products/lookup/${rice.id}`)).data.data;
  assert(riceAfterPO.stock === riceAfter.stock + 10, `Rice stock replenished by +10: ${riceAfter.stock} -> ${riceAfterPO.stock}`);

  // 9. Return / Refund test
  console.log('\n--- Test 10: Refund & Return Restocking ---');
  const returnRes = await request('/api/returns', {
    method: 'POST',
    headers: { Authorization: `Bearer ${cashierToken}` },
    body: JSON.stringify({
      saleId: sale.id,
      items: [{ productId: sugar.id, quantity: 1, condition: 'RESTOCKABLE' }],
      reason: 'Customer return test',
      paymentMethod: 'CASH'
    })
  });
  assert(returnRes.status === 201, 'Return processed');
  const sugarAfterReturn = (await request(`/api/products/lookup/${sugar.id}`)).data.data;
  assert(sugarAfterReturn.stock === sugarAfter.stock + 1, `Sugar restocked by +1: ${sugarAfter.stock} -> ${sugarAfterReturn.stock}`);

  // 10. Cashier shift opening and closing
  console.log('\n--- Test 11: Cashier Shift Register & Drawer Reconciliation ---');
  const openShiftRes = await request('/api/shifts/open', {
    method: 'POST',
    headers: { Authorization: `Bearer ${cashierToken}` },
    body: JSON.stringify({ openingCash: 1000, notes: 'Automated shift test' })
  });
  assert(openShiftRes.status === 201 || openShiftRes.status === 400, 'Shift open responded');

  const curShiftRes = await request('/api/shifts/current', {
    headers: { Authorization: `Bearer ${cashierToken}` }
  });
  const shift = curShiftRes.data.data;
  if (shift) {
    const closeRes = await request(`/api/shifts/${shift.id}/close`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cashierToken}` },
      body: JSON.stringify({ closingCash: 1954, notes: 'Reconciled cash' })
    });
    assert(closeRes.status === 200, 'Shift closed and reconciled');
    assert(closeRes.data.data.discrepancy !== undefined, 'Discrepancy calculated');
  }

  // 11. Reports & Analytics
  console.log('\n--- Test 12: Real Analytics & KPIs ---');
  const summaryRes = await request('/api/reports/summary');
  assert(summaryRes.status === 200, 'Reports summary returned 200');
  assert(summaryRes.data.data.totalRevenue > 0, 'Total revenue computed from database');
  assert(summaryRes.data.data.grossProfit !== undefined, 'Gross profit computed');

  // 12. Audit Logs
  console.log('\n--- Test 13: System Audit Trail ---');
  const auditRes = await request('/api/audit-logs', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(auditRes.status === 200, 'Audit logs returned 200');
  assert(auditRes.data.data.length > 0, 'Audit trail contains logged actions');

  console.log('\n================================================================');
  console.log(`🎉 ALL TESTS PASSED! (${passedTests}/${totalTests} assertions passed)`);
  console.log('================================================================');
}

runSuite().catch(err => {
  console.error('\n💥 SUITE EXECUTION FAILED:', err);
  process.exit(1);
});
