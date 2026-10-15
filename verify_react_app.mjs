import { spawn } from 'node:child_process';
import { existsSync, rmSync, mkdirSync } from 'node:fs';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PROFILE_DIR = "C:\\Users\\dilee\\.gemini\\antigravity\\scratch\\chrome-react-test-profile";
const APP_URL = "http://localhost:5173/";

if (existsSync(PROFILE_DIR)) {
  try { rmSync(PROFILE_DIR, { recursive: true, force: true }); } catch (e) {}
}
mkdirSync(PROFILE_DIR, { recursive: true });

console.log("Launching Headless Chrome on http://localhost:5173/ ...");
const chrome = spawn(CHROME_PATH, [
  "--headless=new",
  "--remote-debugging-port=9223",
  `--user-data-dir=${PROFILE_DIR}`,
  APP_URL
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

  console.log("Connecting to Chrome DevTools at port 9223...");
  const res = await fetch("http://127.0.0.1:9223/json");
  const pages = await res.json();
  const page = pages.find(p => p.type === 'page' && p.url.includes('5173'));

  if (!page) {
    throw new Error("Target Vite page not found: " + JSON.stringify(pages));
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

  // Wait for React to render
  await sleep(1500);

  console.log("\n=======================================================");
  console.log("STARTING TEST SUITE FOR VITE + REACT SUPER MARKET POS");
  console.log("=======================================================\n");

  // TEST 1: Default Catalogue & Initial Dashboard
  console.log("--- TEST 1: Initial Dashboard & Default Products ---");
  const initialData = await evaluate(`(() => {
    const title = document.querySelector('.header-left h2')?.textContent.trim();
    const metricCards = Array.from(document.querySelectorAll('.metric-card')).map(c => ({
      title: c.querySelector('.metric-title')?.textContent.trim(),
      val: c.querySelector('.metric-val')?.textContent.trim()
    }));
    const productsInStorage = JSON.parse(localStorage.getItem('freshcart_pos_products_v2') || '[]');
    return { title, metricCards, productsInStorage };
  })()`);

  console.log("Page Title:", initialData.title);
  console.log("Metric Cards:", initialData.metricCards);
  console.log("Stored Products:", initialData.productsInStorage.map(p => `${p.name} (₹${p.price}, stock: ${p.stock})`));

  if (initialData.productsInStorage.length !== 3) {
    throw new Error("Expected 3 default products in storage");
  }
  const riceP = initialData.productsInStorage.find(p => p.name === 'Rice');
  const sugarP = initialData.productsInStorage.find(p => p.name === 'Sugar');
  const milkP = initialData.productsInStorage.find(p => p.name === 'Milk');

  if (!riceP || riceP.price !== 500 || riceP.stock !== 10) throw new Error("Rice default mismatch");
  if (!sugarP || sugarP.price !== 60 || sugarP.stock !== 20) throw new Error("Sugar default mismatch");
  if (!milkP || milkP.price !== 30 || milkP.stock !== 15) throw new Error("Milk default mismatch");

  const totalProdMetric = initialData.metricCards.find(m => m.title?.toLowerCase() === 'total products');
  const stockValMetric = initialData.metricCards.find(m => m.title?.toLowerCase() === 'inventory value');
  const revenueMetric = initialData.metricCards.find(m => m.title?.toLowerCase() === 'lifetime revenue');
  const stockOnHandMetric = initialData.metricCards.find(m => m.title?.toLowerCase() === 'stock on hand');

  if (totalProdMetric.val !== '3') throw new Error("Total products mismatch: " + totalProdMetric?.val);
  if (stockValMetric.val !== '₹6,650.00') throw new Error("Inventory valuation mismatch: " + stockValMetric?.val);
  if (revenueMetric.val !== '₹0.00') throw new Error("Initial revenue mismatch: " + revenueMetric?.val);
  if (stockOnHandMetric.val !== '45') throw new Error("Initial units mismatch: " + stockOnHandMetric?.val);
  console.log("✓ TEST 1 PASSED: Initial dashboard metrics and sample products (Rice 500/10, Sugar 60/20, Milk 30/15) verified.\n");

  // TEST 2: Mandatory Acceptance Test
  // Add Rice × 2 and Sugar × 1. Subtotal must be ₹1,060. Apply SAVE10: discount ₹106 and final bill ₹954.
  // After checkout, Rice stock must be 8, Sugar stock 19, and Milk stock 15.
  console.log("--- TEST 2: Mandatory Acceptance Test (Rice x2, Sugar x1, SAVE10, Checkout) ---");

  // Step 2a: Navigate to Billing Counter
  await evaluate(`(() => {
    const billingBtn = Array.from(document.querySelectorAll('.nav-item')).find(b => b.textContent.includes('Billing Counter'));
    billingBtn.click();
  })()`);
  await sleep(600);

  // Step 2b: Click Rice twice and Sugar once
  await evaluate(`(() => {
    const cards = Array.from(document.querySelectorAll('.billing-counter-page button.card'));
    const riceCard = cards.find(c => c.textContent.includes('Rice'));
    const sugarCard = cards.find(c => c.textContent.includes('Sugar'));
    
    // Add Rice twice
    riceCard.click();
    riceCard.click();
    // Add Sugar once
    sugarCard.click();
  })()`);
  await sleep(600);

  // Step 2c: Verify cart subtotal before coupon
  const cartBefore = await evaluate(`(() => {
    const storedProducts = JSON.parse(localStorage.getItem('freshcart_pos_products_v2') || '[]');
    const body = document.querySelector('.billing-counter-page').innerText;
    return {
      riceStockBeforeCheckout: storedProducts.find(p => p.name === 'Rice').stock,
      sugarStockBeforeCheckout: storedProducts.find(p => p.name === 'Sugar').stock,
      body
    };
  })()`);

  if (!cartBefore.body.includes('₹1,060.00')) {
    throw new Error("Subtotal ₹1,060.00 not found in cart");
  }
  // Inventory must NOT be deducted yet!
  if (cartBefore.riceStockBeforeCheckout !== 10 || cartBefore.sugarStockBeforeCheckout !== 20) {
    throw new Error("Inventory must NOT be deducted before checkout!");
  }
  console.log("✓ Subtotal is exactly ₹1,060.00. Inventory remains untouched prior to checkout.");

  // Step 2d: Apply SAVE10 coupon
  await evaluate(`(() => {
    const input = document.querySelector('input[placeholder*="SAVE10"]');
    const form = input.closest('form');
    // Set input value using native setter
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    nativeInputValueSetter.call(input, 'SAVE10');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  })()`);
  await sleep(600);

  // Step 2e: Verify discount ₹106 and final bill ₹954
  const cartAfterCoupon = await evaluate(`(() => {
    const body = document.querySelector('.billing-counter-page').innerText;
    return {
      hasDiscount106: body.includes('106.00'),
      hasFinal954: body.includes('954.00'),
      hasCouponApplied: body.includes('SAVE10 applied')
    };
  })()`);

  console.log("Cart After Coupon Check:", cartAfterCoupon);

  if (!cartAfterCoupon.hasDiscount106 || !cartAfterCoupon.hasFinal954) {
    throw new Error("Coupon calculations failed! Expected discount ₹106.00 and final bill ₹954.00");
  }
  console.log("✓ SAVE10 discount = ₹106.00, Tax = ₹0.00, Final amount = ₹954.00 verified.");

  // Step 2f: Complete checkout
  await evaluate(`(() => {
    const checkoutBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Complete Sale'));
    checkoutBtn.click();
  })()`);
  await sleep(800);

  // Step 2g: Verify Invoice page opened and stocks updated
  const checkoutResult = await evaluate(`(() => {
    const storedProducts = JSON.parse(localStorage.getItem('freshcart_pos_products_v2') || '[]');
    const storedSales = JSON.parse(localStorage.getItem('freshcart_pos_sales_v2') || '[]');
    const invoiceEl = document.querySelector('.invoice-container');
    const invoiceText = invoiceEl ? invoiceEl.innerText : '';
    return {
      riceStock: storedProducts.find(p => p.name === 'Rice')?.stock,
      sugarStock: storedProducts.find(p => p.name === 'Sugar')?.stock,
      milkStock: storedProducts.find(p => p.name === 'Milk')?.stock,
      salesCount: storedSales.length,
      latestSale: storedSales[0],
      invoiceText
    };
  })()`);

  console.log("Stock levels after checkout:", {
    Rice: checkoutResult.riceStock,
    Sugar: checkoutResult.sugarStock,
    Milk: checkoutResult.milkStock
  });

  if (checkoutResult.riceStock !== 8) throw new Error("Expected Rice stock = 8, got " + checkoutResult.riceStock);
  if (checkoutResult.sugarStock !== 19) throw new Error("Expected Sugar stock = 19, got " + checkoutResult.sugarStock);
  if (checkoutResult.milkStock !== 15) throw new Error("Expected Milk stock = 15, got " + checkoutResult.milkStock);

  if (checkoutResult.salesCount !== 1) throw new Error("Expected 1 completed sale record");
  if (checkoutResult.latestSale.subtotal !== 1060 || checkoutResult.latestSale.discount !== 106 || checkoutResult.latestSale.finalTotal !== 954) {
    throw new Error("Recorded invoice values mismatch");
  }
  console.log("✓ TEST 2 PASSED: Rice stock = 8, Sugar stock = 19, Milk stock = 15. Invoice generated with exact required values!\n");

  // TEST 3: Sales Reports & Best Sellers
  console.log("--- TEST 3: Sales Reports & Analytics ---");
  await evaluate(`(() => {
    const reportsBtn = Array.from(document.querySelectorAll('.nav-item')).find(b => b.textContent.includes('Sales Reports'));
    reportsBtn.click();
  })()`);
  await sleep(600);

  const reportsData = await evaluate(`(() => {
    const cards = Array.from(document.querySelectorAll('.metric-card')).map(c => ({
      title: c.querySelector('.metric-title')?.textContent.trim(),
      val: c.querySelector('.metric-val')?.textContent.trim()
    }));
    return { cards };
  })()`);

  console.log("Reports Metrics:", reportsData.cards);
  const grossCard = reportsData.cards.find(c => c.title?.toLowerCase() === 'gross sales');
  const discountCard = reportsData.cards.find(c => c.title?.toLowerCase() === 'discounts given');
  const netCard = reportsData.cards.find(c => c.title?.toLowerCase() === 'net revenue');
  const completedCard = reportsData.cards.find(c => c.title?.toLowerCase() === 'completed transactions');

  if (grossCard.val !== '₹1,060.00') throw new Error("Gross sales mismatch: " + grossCard?.val);
  if (discountCard.val !== '₹106.00') throw new Error("Discounts mismatch: " + discountCard?.val);
  if (netCard.val !== '₹954.00') throw new Error("Net sales mismatch: " + netCard?.val);
  if (completedCard.val !== '1') throw new Error("Completed sales mismatch: " + completedCard?.val);
  console.log("✓ TEST 3 PASSED: Sales reports correctly compute gross, discount, and net revenue.\n");

  // TEST 4: Low-Stock Alerts
  console.log("--- TEST 4: Low-Stock Alerts (Threshold ≤ 5) ---");
  // Let's buy 3 more Rice -> Rice stock becomes 5 (threshold ≤ 5)
  await evaluate(`(() => {
    const billingBtn = Array.from(document.querySelectorAll('.nav-item')).find(b => b.textContent.includes('Billing Counter'));
    billingBtn.click();
  })()`);
  await sleep(500);

  // Add Rice 3 times with wait between clicks
  for (let i = 0; i < 3; i++) {
    await evaluate(`(() => {
      const cards = Array.from(document.querySelectorAll('.billing-counter-page button.card'));
      const riceCard = cards.find(c => c.textContent.includes('Rice'));
      if (riceCard) riceCard.click();
    })()`);
    await sleep(250);
  }
  await sleep(500);

  // Now click checkout
  await evaluate(`(() => {
    const checkoutBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Complete Sale'));
    if (checkoutBtn) checkoutBtn.click();
  })()`);
  await sleep(800);

  // Navigate to Dashboard
  await evaluate(`(() => {
    const dashBtn = Array.from(document.querySelectorAll('.nav-item')).find(b => b.textContent.includes('Dashboard'));
    dashBtn.click();
  })()`);
  await sleep(600);

  const alertCheck = await evaluate(`(() => {
    const storedProducts = JSON.parse(localStorage.getItem('freshcart_pos_products_v2') || '[]');
    const riceStock = storedProducts.find(p => p.name === 'Rice')?.stock;
    const alertText = document.querySelector('.dashboard-page')?.innerText || '';
    return { riceStock, hasLowAlert: alertText.includes('Rice is Running Low') };
  })()`);

  console.log("Rice stock after buying 3 more:", alertCheck.riceStock);
  console.log("Low stock alert detected:", alertCheck.hasLowAlert);
  if (alertCheck.riceStock !== 5 || !alertCheck.hasLowAlert) {
    throw new Error("Expected Rice stock 5 with low-stock alert triggered");
  }
  console.log("✓ TEST 4 PASSED: Low stock alert triggered at stock 5.\n");

  // TEST 5: Browser Reload Persistence
  console.log("--- TEST 5: Browser Refresh & LocalStorage Persistence ---");
  await evaluate(`location.reload()`);
  await sleep(1800);

  const reloadedData = await evaluate(`(() => {
    const storedProducts = JSON.parse(localStorage.getItem('freshcart_pos_products_v2') || '[]');
    const storedSales = JSON.parse(localStorage.getItem('freshcart_pos_sales_v2') || '[]');
    return {
      riceStock: storedProducts.find(p => p.name === 'Rice')?.stock,
      sugarStock: storedProducts.find(p => p.name === 'Sugar')?.stock,
      milkStock: storedProducts.find(p => p.name === 'Milk')?.stock,
      salesCount: storedSales.length
    };
  })()`);

  console.log("Data after page reload:", reloadedData);
  if (reloadedData.riceStock !== 5 || reloadedData.sugarStock !== 19 || reloadedData.milkStock !== 15) {
    throw new Error("State persistence failed after reload");
  }
  if (reloadedData.salesCount !== 2) {
    throw new Error("Sales records failed to persist");
  }
  console.log("✓ TEST 5 PASSED: Persistence verified across full page reload.\n");

  // TEST 6: Transaction History & Reopen Invoice
  console.log("--- TEST 6: Transaction History & Reopen Historical Invoice ---");
  await evaluate(`(() => {
    const histBtn = Array.from(document.querySelectorAll('.nav-item')).find(b => b.textContent.includes('Transactions'));
    histBtn.click();
  })()`);
  await sleep(600);

  const historyCheck = await evaluate(`(() => {
    const rows = Array.from(document.querySelectorAll('.history-page tbody tr'));
    const viewBtn = rows[0]?.querySelector('button');
    if (viewBtn) viewBtn.click();
    return { rowCount: rows.length };
  })()`);
  await sleep(600);

  const reopenedInvoice = await evaluate(`(() => {
    return {
      isInvoicePage: !!document.querySelector('.invoice-container'),
      invoiceNo: document.querySelector('.invoice-container')?.innerText.includes('FC-')
    };
  })()`);

  console.log("Reopened invoice result:", reopenedInvoice);
  if (!reopenedInvoice.isInvoicePage || !reopenedInvoice.invoiceNo) {
    throw new Error("Failed to reopen historical invoice from transaction history");
  }
  console.log("✓ TEST 6 PASSED: Historical invoice successfully viewed and reopened.\n");

  // TEST 7: Settings & Reset Demo Data
  console.log("--- TEST 7: Settings & Reset Demo Data ---");
  await evaluate(`(() => {
    const settingsBtn = Array.from(document.querySelectorAll('.nav-item')).find(b => b.textContent.includes('Settings'));
    settingsBtn.click();
  })()`);
  await sleep(600);

  // Trigger reset demo data
  await evaluate(`(() => {
    const resetBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Reset Demo Data'));
    resetBtn.click();
  })()`);
  await sleep(400);

  // Confirm in modal
  await evaluate(`(() => {
    const confirmBtn = Array.from(document.querySelectorAll('.modal-content button')).find(b => b.textContent.includes('Reset to Initial State'));
    confirmBtn.click();
  })()`);
  await sleep(800);

  const afterResetData = await evaluate(`(() => {
    const storedProducts = JSON.parse(localStorage.getItem('freshcart_pos_products_v2') || '[]');
    const storedSales = JSON.parse(localStorage.getItem('freshcart_pos_sales_v2') || '[]');
    return {
      products: storedProducts.map(p => ({ name: p.name, price: p.price, stock: p.stock })),
      salesCount: storedSales.length
    };
  })()`);

  console.log("State after Reset Demo Data:", afterResetData);
  if (afterResetData.products.length !== 3) throw new Error("Expected 3 products after reset");
  if (afterResetData.products.find(p => p.name === 'Rice').stock !== 10) throw new Error("Rice stock should be 10 after reset");
  if (afterResetData.salesCount !== 0) throw new Error("Sales should be 0 after reset");
  console.log("✓ TEST 7 PASSED: Reset demo data restored initial sample products and cleared transactions.\n");

  console.log("=======================================================");
  console.log("ALL ACCEPTANCE & VERIFICATION TESTS PASSED SUCCESSFULLY!");
  console.log("=======================================================\n");
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
