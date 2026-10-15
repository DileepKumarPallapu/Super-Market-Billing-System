import { spawn } from 'node:child_process';
import { existsSync, rmSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PROFILE_DIR = "C:\\Users\\dilee\\.gemini\\antigravity\\scratch\\chrome-test-profile";
const HTML_FILE = "C:\\Users\\dilee\\.gemini\\antigravity\\scratch\\super_market_billing_demo\\index.html";
const FILE_URL = "file:///" + HTML_FILE.replace(/\\/g, '/');

if (existsSync(PROFILE_DIR)) {
  try { rmSync(PROFILE_DIR, { recursive: true, force: true }); } catch (e) {}
}
mkdirSync(PROFILE_DIR, { recursive: true });

console.log("Starting Chrome Headless...");
const chrome = spawn(CHROME_PATH, [
  "--headless=new",
  "--remote-debugging-port=9222",
  `--user-data-dir=${PROFILE_DIR}`,
  FILE_URL
]);

chrome.on('error', (err) => {
  console.error("Chrome spawn error:", err);
  process.exit(1);
});

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

let ws = null;
let msgId = 1;
const callbacks = new Map();

function sendCommand(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = msgId++;
    callbacks.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const res = await sendCommand("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true
  });
  if (res.exceptionDetails) {
    throw new Error(`Eval failed: ${JSON.stringify(res.exceptionDetails)}`);
  }
  return res.result ? res.result.value : undefined;
}

async function runTests() {
  await sleep(2500);

  console.log("Connecting to Chrome DevTools...");
  const res = await fetch("http://127.0.0.1:9222/json");
  const pages = await res.json();
  const page = pages.find(p => p.type === 'page' && p.url.includes('super_market_billing_demo'));

  if (!page) {
    throw new Error("Target page not found in Chrome DevTools: " + JSON.stringify(pages));
  }

  console.log(`Connecting to WebSocket: ${page.webSocketDebuggerUrl}`);
  ws = new WebSocket(page.webSocketDebuggerUrl);

  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && callbacks.has(data.id)) {
      const { resolve, reject } = callbacks.get(data.id);
      callbacks.delete(data.id);
      if (data.error) reject(data.error);
      else resolve(data.result);
    }
  };

  console.log("\n==========================================");
  console.log("STARTING TEST SUITE FOR SUPER MARKET POS");
  console.log("==========================================\n");

  // TEST 1: Default Catalogue & Initial Dashboard
  console.log("--- TEST 1: Default Catalogue & Initial Dashboard ---");
  const initialData = await evaluate(`(() => {
    return {
      products: state.products.map(p => ({ id: p.id, name: p.name, price: p.price, stock: p.stock })),
      salesCount: state.sales.length,
      stats: Array.from(document.querySelectorAll('#stats .stat strong')).map(el => el.textContent.trim()),
      alertCount: document.getElementById('alertCount').textContent.trim()
    };
  })()`);

  console.log("Initial Products:", JSON.stringify(initialData.products));
  console.log("Initial Stats (Product count, Stock value, Revenue, Units):", initialData.stats);
  console.log("Initial Alerts:", initialData.alertCount);

  if (initialData.products.length !== 3) throw new Error("Expected 3 default products");
  const rice = initialData.products.find(p => p.name === 'Rice');
  const sugar = initialData.products.find(p => p.name === 'Sugar');
  const milk = initialData.products.find(p => p.name === 'Milk');

  if (!rice || rice.price !== 500 || rice.stock !== 10) throw new Error("Default Rice mismatch");
  if (!sugar || sugar.price !== 60 || sugar.stock !== 20) throw new Error("Default Sugar mismatch");
  if (!milk || milk.price !== 30 || milk.stock !== 15) throw new Error("Default Milk mismatch");
  if (initialData.stats[0] !== '3') throw new Error("Stat count mismatch");
  if (initialData.stats[1] !== '₹6,650.00') throw new Error("Initial stock value mismatch: " + initialData.stats[1]);
  if (initialData.stats[2] !== '₹0.00') throw new Error("Initial revenue mismatch: " + initialData.stats[2]);
  if (initialData.stats[3] !== '45') throw new Error("Initial units mismatch: " + initialData.stats[3]);
  console.log("✓ TEST 1 PASSED: Default products (Rice 500/10, Sugar 60/20, Milk 30/15) and dashboard metrics verified.\n");

  // TEST 2: Mandatory Acceptance Test
  // Add Rice × 2 and Sugar × 1. Subtotal must be ₹1,060. Apply SAVE10: discount ₹106 and final bill ₹954.
  // After checkout, Rice stock must be 8, Sugar stock 19, and Milk stock 15.
  console.log("--- TEST 2: Mandatory Acceptance Test (Rice x2, Sugar x1, SAVE10, Checkout) ---");

  // Step 2a: Go to billing
  await evaluate(`go('billing')`);

  // Step 2b: Add Rice x2 and Sugar x1
  await evaluate(`(() => {
    addToCart('rice');
    addToCart('rice');
    addToCart('sugar');
  })()`);

  const cartBeforeCoupon = await evaluate(`(() => {
    const t = totals();
    return {
      subtotal: t.subtotal,
      discount: t.discount,
      final: t.final,
      riceStockInState: state.products.find(p => p.id === 'rice').stock,
      sugarStockInState: state.products.find(p => p.id === 'sugar').stock,
      cartCountText: document.getElementById('cartCount').textContent.trim()
    };
  })()`);

  console.log("Cart before coupon:", cartBeforeCoupon);
  if (cartBeforeCoupon.subtotal !== 1060) throw new Error("Expected subtotal ₹1,060, got: " + cartBeforeCoupon.subtotal);
  if (cartBeforeCoupon.discount !== 0) throw new Error("Expected discount ₹0 before coupon, got: " + cartBeforeCoupon.discount);
  if (cartBeforeCoupon.final !== 1060) throw new Error("Expected final ₹1,060 before coupon, got: " + cartBeforeCoupon.final);
  // Verify inventory NOT deducted before checkout
  if (cartBeforeCoupon.riceStockInState !== 10 || cartBeforeCoupon.sugarStockInState !== 20) {
    throw new Error("Stock must NOT be deducted before checkout!");
  }
  console.log("✓ Cart subtotal is exactly ₹1,060.00. Inventory remains untouched before checkout.");

  // Step 2c: Apply SAVE10
  await evaluate(`(() => {
    document.getElementById('couponCode').value = 'SAVE10';
    applyCoupon();
  })()`);

  const cartAfterCoupon = await evaluate(`(() => {
    const t = totals();
    return {
      subtotal: t.subtotal,
      discount: t.discount,
      final: t.final,
      appliedCoupon: appliedCoupon,
      msg: document.getElementById('couponMessage').textContent.trim()
    };
  })()`);

  console.log("Cart after SAVE10 coupon:", cartAfterCoupon);
  if (cartAfterCoupon.discount !== 106) throw new Error("Expected discount ₹106, got: " + cartAfterCoupon.discount);
  if (cartAfterCoupon.final !== 954) throw new Error("Expected final bill ₹954, got: " + cartAfterCoupon.final);
  console.log("✓ SAVE10 applied: discount is exactly ₹106.00 and final bill is ₹954.00.");

  // Step 2d: Complete checkout
  await evaluate(`checkout()`);

  // Step 2e: Verify stocks after checkout
  const afterCheckout = await evaluate(`(() => {
    return {
      riceStock: state.products.find(p => p.id === 'rice').stock,
      sugarStock: state.products.find(p => p.id === 'sugar').stock,
      milkStock: state.products.find(p => p.id === 'milk').stock,
      salesCount: state.sales.length,
      latestSale: state.sales[0],
      activeSection: document.querySelector('.section.active').id,
      invoiceHtml: document.getElementById('invoiceContent').innerText
    };
  })()`);

  console.log("Stock after checkout:", {
    Rice: afterCheckout.riceStock,
    Sugar: afterCheckout.sugarStock,
    Milk: afterCheckout.milkStock
  });

  if (afterCheckout.riceStock !== 8) throw new Error("Expected Rice stock to be 8, got " + afterCheckout.riceStock);
  if (afterCheckout.sugarStock !== 19) throw new Error("Expected Sugar stock to be 19, got " + afterCheckout.sugarStock);
  if (afterCheckout.milkStock !== 15) throw new Error("Expected Milk stock to be 15, got " + afterCheckout.milkStock);
  if (afterCheckout.salesCount !== 1) throw new Error("Expected 1 sale in history");
  if (afterCheckout.activeSection !== 'invoice') throw new Error("Expected redirect to invoice view");

  console.log("Latest Invoice Summary:", {
    invoiceNo: afterCheckout.latestSale.invoiceNo,
    subtotal: afterCheckout.latestSale.subtotal,
    discount: afterCheckout.latestSale.discount,
    tax: afterCheckout.latestSale.tax,
    total: afterCheckout.latestSale.total,
    coupon: afterCheckout.latestSale.coupon
  });

  if (afterCheckout.latestSale.subtotal !== 1060 || afterCheckout.latestSale.discount !== 106 || afterCheckout.latestSale.total !== 954) {
    throw new Error("Invoice total figures mismatch!");
  }
  console.log("✓ TEST 2 PASSED: Rice stock = 8, Sugar stock = 19, Milk stock = 15. Mandatory Acceptance Test completely satisfied!\n");

  // TEST 3: Sales Reports & Best Sellers
  console.log("--- TEST 3: Sales Reports & Best Sellers ---");
  await evaluate(`go('reports')`);
  const reportsData = await evaluate(`(() => {
    return {
      reportStats: Array.from(document.querySelectorAll('#reportStats .report-stat')).map(el => ({
        label: el.querySelector('small').textContent.trim(),
        value: el.querySelector('b').textContent.trim()
      })),
      bestSellers: Array.from(document.querySelectorAll('#bestSellers .bar-row')).map(el => ({
        name: el.querySelector('span').textContent.trim(),
        sold: el.querySelector('b').textContent.trim()
      })),
      salesRows: Array.from(document.querySelectorAll('#salesTable tr')).map(tr => Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim()))
    };
  })()`);

  console.log("Reports stats:", reportsData.reportStats);
  console.log("Best sellers:", reportsData.bestSellers);
  console.log("Transaction history rows:", reportsData.salesRows);

  const gross = reportsData.reportStats.find(s => s.label === 'Gross revenue');
  const discountStat = reportsData.reportStats.find(s => s.label === 'Discounts given');
  const net = reportsData.reportStats.find(s => s.label === 'Net revenue');
  const salesCompleted = reportsData.reportStats.find(s => s.label === 'Completed sales');

  if (gross.value !== '₹1,060.00') throw new Error("Expected Gross revenue ₹1,060.00, got: " + gross.value);
  if (discountStat.value !== '₹106.00') throw new Error("Expected Discounts given ₹106.00, got: " + discountStat.value);
  if (net.value !== '₹954.00') throw new Error("Expected Net revenue ₹954.00, got: " + net.value);
  if (salesCompleted.value !== '1') throw new Error("Expected 1 completed sale, got: " + salesCompleted.value);
  console.log("✓ TEST 3 PASSED: Sales reports correctly display gross revenue, discounts, net revenue, and transaction history.\n");

  // TEST 4: Low-stock and Out-of-stock Alerts
  console.log("--- TEST 4: Low-stock (≤ 5) and Out-of-stock (0) Alerts ---");
  // Currently Rice = 8, Sugar = 19, Milk = 15 -> 0 alerts
  const alertCheck0 = await evaluate(`state.products.filter(p => p.stock <= 5).length`);
  if (alertCheck0 !== 0) throw new Error("Expected 0 alerts right now");

  // Let's buy 3 more Rice -> Rice becomes 5 (threshold ≤ 5)
  await evaluate(`(() => {
    go('billing');
    addToCart('rice');
    addToCart('rice');
    addToCart('rice');
    checkout();
  })()`);

  const riceStock5 = await evaluate(`state.products.find(p => p.id === 'rice').stock`);
  console.log("Rice stock after buying 3 more:", riceStock5);
  if (riceStock5 !== 5) throw new Error("Expected Rice stock to be 5, got " + riceStock5);

  await evaluate(`go('dashboard')`);
  const alertCheck1 = await evaluate(`(() => {
    return {
      alertCountText: document.getElementById('alertCount').textContent.trim(),
      alerts: Array.from(document.querySelectorAll('#alertList .alert')).map(el => el.innerText.trim())
    };
  })()`);
  console.log("Alerts at Rice stock = 5:", alertCheck1);
  if (!alertCheck1.alertCountText.includes('1 alert')) throw new Error("Expected 1 alert for low stock at 5");
  if (!alertCheck1.alerts[0].includes('Rice is running low')) throw new Error("Expected Rice is running low alert");

  // Now buy remaining 5 Rice -> Rice stock becomes 0
  await evaluate(`(() => {
    go('billing');
    for (let i = 0; i < 5; i++) addToCart('rice');
    checkout();
  })()`);

  const riceStock0 = await evaluate(`state.products.find(p => p.id === 'rice').stock`);
  console.log("Rice stock after buying remaining 5:", riceStock0);
  if (riceStock0 !== 0) throw new Error("Expected Rice stock to be 0, got " + riceStock0);

  await evaluate(`go('dashboard')`);
  const alertCheck2 = await evaluate(`(() => {
    return {
      alertCountText: document.getElementById('alertCount').textContent.trim(),
      alerts: Array.from(document.querySelectorAll('#alertList .alert')).map(el => el.innerText.trim())
    };
  })()`);
  console.log("Alerts at Rice stock = 0:", alertCheck2);
  if (!alertCheck2.alertCountText.includes('1 alert')) throw new Error("Expected 1 alert for stock 0");
  if (!alertCheck2.alerts[0].includes('Rice is out of stock')) throw new Error("Expected Rice is out of stock alert");
  console.log("✓ TEST 4 PASSED: Low stock alert verified at stock 5 and out-of-stock alert verified at stock 0.\n");

  // TEST 5: Browser localStorage Persistence across Reload
  console.log("--- TEST 5: Browser localStorage Persistence across Reload ---");
  const storedJson = await evaluate(`localStorage.getItem('freshcart-pos-state')`);
  if (!storedJson) throw new Error("Nothing found in localStorage 'freshcart-pos-state'");

  // Reload the page
  console.log("Reloading browser page to test persistence...");
  await evaluate(`location.reload()`);
  await sleep(1500);

  const reloadedData = await evaluate(`(() => {
    return {
      riceStock: state.products.find(p => p.id === 'rice').stock,
      salesCount: state.sales.length,
      revenueText: document.querySelectorAll('#stats .stat strong')[2].textContent.trim(),
      latestInvoiceNo: state.sales[0].invoiceNo
    };
  })()`);

  console.log("Data after page reload:", reloadedData);
  if (reloadedData.riceStock !== 0) throw new Error("Persistence failed: Rice stock was not restored as 0");
  if (reloadedData.salesCount !== 3) throw new Error("Persistence failed: Expected 3 sales in history");
  console.log("✓ TEST 5 PASSED: LocalStorage persistence verified across full browser page refresh.\n");

  // TEST 6: Invoice Printing CSS Exclusion
  console.log("--- TEST 6: Invoice Printing CSS & Clean View ---");
  await evaluate(`go('invoice')`);
  const printCheck = await evaluate(`(() => {
    const styleEl = document.querySelector('style');
    const css = styleEl ? styleEl.textContent : '';
    const hasPrintMedia = css.includes('@media print');
    const hidesSidebar = css.includes('.sidebar,.topbar,.no-print');
    const hasPrintBtn = !!document.querySelector('#invoice .panel.no-print button');
    return { hasPrintMedia, hidesSidebar, hasPrintBtn };
  })()`);

  console.log("Print CSS check:", printCheck);
  if (!printCheck.hasPrintMedia || !printCheck.hidesSidebar || !printCheck.hasPrintBtn) {
    throw new Error("Print CSS configuration check failed!");
  }
  console.log("✓ TEST 6 PASSED: Print CSS excludes sidebar, topbar, toast, and action controls.\n");

  // TEST 7: Product Management & Input Validation
  console.log("--- TEST 7: Product Management (Validation, Add, Edit, Delete, Search) ---");
  await evaluate(`go('products')`);

  // Validation tests:
  // Empty name
  const emptyNameTest = await evaluate(`(() => {
    $('pName').value = '';
    $('pPrice').value = '100';
    $('pStock').value = '10';
    $('productForm').dispatchEvent(new Event('submit'));
    return $('toast').textContent;
  })()`);
  console.log("Empty name validation toast:", emptyNameTest);
  if (!emptyNameTest.includes('Product name cannot be empty')) throw new Error("Empty name validation failed");

  // Negative price
  const negativePriceTest = await evaluate(`(() => {
    $('pName').value = 'Test Item';
    $('pPrice').value = '-10';
    $('pStock').value = '10';
    $('productForm').dispatchEvent(new Event('submit'));
    return $('toast').textContent;
  })()`);
  console.log("Negative price validation toast:", negativePriceTest);
  if (!negativePriceTest.includes('Price must be greater than zero')) throw new Error("Negative price validation failed");

  // Duplicate name
  const duplicateTest = await evaluate(`(() => {
    $('pName').value = 'Sugar';
    $('pPrice').value = '70';
    $('pStock').value = '10';
    $('productForm').dispatchEvent(new Event('submit'));
    return $('toast').textContent;
  })()`);
  console.log("Duplicate name validation toast:", duplicateTest);
  if (!duplicateTest.includes('already exists')) throw new Error("Duplicate name validation failed");

  // Valid add
  await evaluate(`(() => {
    $('pName').value = 'Wheat Bread';
    $('pPrice').value = '45';
    $('pStock').value = '12';
    $('productForm').dispatchEvent(new Event('submit'));
  })()`);
  const breadAdded = await evaluate(`!!state.products.find(p => p.name === 'Wheat Bread')`);
  if (!breadAdded) throw new Error("Adding product 'Wheat Bread' failed");
  console.log("✓ Added 'Wheat Bread' successfully.");

  // Edit product
  await evaluate(`(() => {
    const bread = state.products.find(p => p.name === 'Wheat Bread');
    editProduct(bread.id);
    $('pPrice').value = '50';
    $('productForm').dispatchEvent(new Event('submit'));
  })()`);
  const breadUpdated = await evaluate(`state.products.find(p => p.name === 'Wheat Bread').price`);
  if (breadUpdated !== 50) throw new Error("Editing product failed, expected price 50, got " + breadUpdated);
  console.log("✓ Updated 'Wheat Bread' price to ₹50.00.");

  // Search products
  const searchResult = await evaluate(`(() => {
    $('productSearch').value = 'Bread';
    renderProducts();
    const rows = Array.from(document.querySelectorAll('#productsTable tr')).map(tr => tr.innerText);
    $('productSearch').value = '';
    renderProducts();
    return rows;
  })()`);
  console.log("Search result for 'Bread':", searchResult);
  if (!searchResult.some(r => r.includes('Wheat Bread'))) throw new Error("Search failed for 'Bread'");
  console.log("✓ Product search works accurately.");

  // Delete product
  await evaluate(`(() => {
    const bread = state.products.find(p => p.name === 'Wheat Bread');
    // Simulate confirm dialog
    const origConfirm = window.confirm;
    window.confirm = () => true;
    removeProduct(bread.id);
    window.confirm = origConfirm;
  })()`);
  const breadDeleted = await evaluate(`!state.products.find(p => p.name === 'Wheat Bread')`);
  if (!breadDeleted) throw new Error("Delete product failed");
  console.log("✓ TEST 7 PASSED: Product management (validation, add, edit, search, remove) verified.\n");

  // TEST 8: Reset Demo Data
  console.log("--- TEST 8: Reset Demo Data to Default Sample Products ---");
  await evaluate(`(() => {
    const origConfirm = window.confirm;
    window.confirm = () => true;
    resetData();
    window.confirm = origConfirm;
  })()`);

  const afterReset = await evaluate(`(() => {
    return {
      products: state.products.map(p => ({ name: p.name, price: p.price, stock: p.stock })),
      salesCount: state.sales.length,
      revenueText: document.querySelectorAll('#stats .stat strong')[2].textContent.trim(),
      alertCount: document.getElementById('alertCount').textContent.trim()
    };
  })()`);

  console.log("State after Reset Demo Data:", afterReset);
  if (afterReset.products.length !== 3) throw new Error("Expected 3 products after reset");
  if (afterReset.products.find(p => p.name === 'Rice').stock !== 10) throw new Error("Rice stock should be 10 after reset");
  if (afterReset.salesCount !== 0) throw new Error("Sales should be 0 after reset");
  if (afterReset.revenueText !== '₹0.00') throw new Error("Revenue should be ₹0.00 after reset");
  console.log("✓ TEST 8 PASSED: Reset demo data restores defaults cleanly.\n");

  console.log("==========================================");
  console.log("ALL ACCEPTANCE & VERIFICATION TESTS PASSED!");
  console.log("==========================================\n");
}

try {
  await runTests();
  process.exitCode = 0;
} catch (e) {
  console.error("\n❌ TEST RUNNER FAILED:", e);
  process.exitCode = 1;
} finally {
  if (ws) ws.close();
  chrome.kill();
  try { rmSync(PROFILE_DIR, { recursive: true, force: true }); } catch (e) {}
}
