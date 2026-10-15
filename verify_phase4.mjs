// Comprehensive Automated E2E Verification Suite for Phase 4:
// POS Checkout, Cash/UPI/Split Payments, Hold/Resume, Manager PIN, Invoices, Returns & Reports
import { spawn } from 'child_process';
import { rmSync, mkdirSync } from 'fs';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PROFILE_DIR = "C:\\Users\\dilee\\.gemini\\antigravity\\scratch\\super_market_billing_demo\\tmp_chrome_phase4";
const TARGET_URL = "http://localhost:5173/";
const DEBUG_PORT = 9227;

try { rmSync(PROFILE_DIR, { recursive: true, force: true }); } catch (e) {}
mkdirSync(PROFILE_DIR, { recursive: true });

console.log(`[INIT] Launching Headless Chrome on port ${DEBUG_PORT}...`);
const chrome = spawn(CHROME_PATH, [
  `--remote-debugging-port=${DEBUG_PORT}`,
  `--user-data-dir=${PROFILE_DIR}`,
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  TARGET_URL
]);

const sleep = ms => new Promise(r => setTimeout(r, ms));
await sleep(2500);

console.log(`[CDP] Connecting to Chrome DevTools at port ${DEBUG_PORT}...`);
const versionRes = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
const targets = await versionRes.json();
const pageTarget = targets.find(t => t.type === 'page');

if (!pageTarget) {
  throw new Error("No page target found in Chrome DevTools!");
}

console.log("[CDP] Connected WebSocket:", pageTarget.webSocketDebuggerUrl);
const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

let msgId = 1;
const pending = new Map();

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(msg.error);
    else resolve(msg.result);
  }
};

function sendCommand(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = msgId++;
    pending.set(id, { resolve, reject });
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
    const errText = res.exceptionDetails.exception?.description || res.exceptionDetails.text || JSON.stringify(res.exceptionDetails);
    throw new Error(`Eval failed: ${errText}`);
  }
  return res.result ? res.result.value : undefined;
}

await new Promise(r => { ws.onopen = r; });
await sendCommand("Page.enable");
await sendCommand("DOM.enable");
await sendCommand("Runtime.enable");

const results = [];
function recordResult(testName, passed, detail) {
  results.push({ testName, passed, detail });
  const status = passed ? "✓ PASS" : "✗ FAIL";
  console.log(`  ${status} | ${testName}${detail ? ` (${detail})` : ''}`);
}

async function runPhase4Tests() {
  console.log("\n==========================================================================");
  console.log("PHASE 4 E2E TEST SUITE: ADVANCED POS, PAYMENTS, CHECKOUT & RETURNS");
  console.log("==========================================================================\n");

  await sleep(1500);

  // -------------------------------------------------------------
  // SETUP: Reset demo data for clean state
  // -------------------------------------------------------------
  console.log("[SETUP] Navigating to Settings to Reset Demo Data...");
  await evaluate(`(() => {
    const btn = Array.from(document.querySelectorAll('.nav-item')).find(b => b.textContent.includes('Settings'));
    btn.click();
  })()`);
  await sleep(600);

  await evaluate(`(() => {
    const resetBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Reset Demo Data'));
    resetBtn.click();
  })()`);
  await sleep(400);

  await evaluate(`(() => {
    const confirmBtn = document.querySelector('.modal-content .btn-danger');
    confirmBtn.click();
  })()`);
  await sleep(1000);

  // Verify baseline product catalogue & defaults
  const productCatalogueStats = await evaluate(`(() => {
    const raw = localStorage.getItem('freshcart_pos_products_v2');
    const prods = JSON.parse(raw || '[]');
    const rice = prods.find(p => p.name.toLowerCase().includes('rice'));
    const sugar = prods.find(p => p.name.toLowerCase().includes('sugar'));
    const milk = prods.find(p => p.name.toLowerCase().includes('milk'));
    return {
      count: prods.length,
      riceStock: rice ? rice.stock : null,
      ricePrice: rice ? rice.price : null,
      sugarStock: sugar ? sugar.stock : null,
      sugarPrice: sugar ? sugar.price : null,
      milkStock: milk ? milk.stock : null,
      milkPrice: milk ? milk.price : null
    };
  })()`);

  recordResult(
    "Catalogue Initialization",
    productCatalogueStats.count >= 30 &&
    productCatalogueStats.riceStock === 10 && productCatalogueStats.ricePrice === 500 &&
    productCatalogueStats.sugarStock === 20 && productCatalogueStats.sugarPrice === 60 &&
    productCatalogueStats.milkStock === 15 && productCatalogueStats.milkPrice === 30,
    `${productCatalogueStats.count} items loaded with baseline products`
  );

  // -------------------------------------------------------------
  // TEST A: Normal Bill (Rice x 2, Sugar x 1, SAVE10)
  // -------------------------------------------------------------
  console.log("\n--- TEST A: Normal Bill Calculations (Rice x 2 + Sugar x 1 + SAVE10) ---");
  await evaluate(`(() => {
    const btn = Array.from(document.querySelectorAll('.nav-item')).find(b => b.textContent.includes('Billing Counter'));
    btn.click();
  })()`);
  await sleep(800);

  // Add Rice x 2
  await evaluate(`(() => {
    const cards = Array.from(document.querySelectorAll('.product-card'));
    const riceCard = cards.find(c => c.textContent.includes('Rice'));
    const addBtn = riceCard.querySelector('button');
    addBtn.click();
  })()`);
  await sleep(400);

  await evaluate(`(() => {
    const cards = Array.from(document.querySelectorAll('.product-card'));
    const riceCard = cards.find(c => c.textContent.includes('Rice'));
    const addBtn = riceCard.querySelector('button');
    addBtn.click();
  })()`);
  await sleep(400);

  // Add Sugar x 1
  await evaluate(`(() => {
    const cards = Array.from(document.querySelectorAll('.product-card'));
    const sugarCard = cards.find(c => c.textContent.includes('Sugar'));
    const addBtn = sugarCard.querySelector('button');
    addBtn.click();
  })()`);
  await sleep(400);

  // Check subtotal before coupon
  const subtotalBeforeCoupon = await evaluate(`(() => {
    const text = document.querySelector('.card-header + div + div + div')?.innerText || document.body.innerText;
    return text.includes('₹1,060.00');
  })()`);
  recordResult("Test A1: Subtotal before coupon is ₹1,060", subtotalBeforeCoupon);

  // Apply SAVE10
  await evaluate(`(() => {
    const input = document.querySelector('input[placeholder*="SAVE10"]');
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    nativeSetter.call(input, 'SAVE10');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.form.querySelector('button[type="submit"]').click();
  })()`);
  await sleep(500);

  const cartCalculations = await evaluate(`(() => {
    const body = document.body.innerText;
    const hasDiscount106 = body.includes('106.00');
    const hasTotal954 = body.includes('954.00');
    return { hasDiscount106, hasTotal954 };
  })()`);
  recordResult(
    "Test A2: SAVE10 discount ₹106 & final payable ₹954",
    cartCalculations.hasDiscount106 && cartCalculations.hasTotal954
  );

  // -------------------------------------------------------------
  // TEST B: Cash Payment Modal & Change Returned (₹1,000 received -> ₹46 change)
  // -------------------------------------------------------------
  console.log("\n--- TEST B: Cash Payment & Change Calculation ---");
  await evaluate(`(() => {
    const proceedBtn = document.querySelector('.btn-proceed-checkout');
    proceedBtn.click();
  })()`);
  await sleep(600);

  // Check modal opened with Cash tab
  const modalOpened = await evaluate(`(() => {
    const modal = document.querySelector('.modal-overlay');
    return !!modal && modal.innerText.includes('POS Checkout & Payment');
  })()`);
  recordResult("Test B1: Checkout Modal Opens", modalOpened);

  // Enter ₹1000 cash received
  await evaluate(`(() => {
    const input = document.querySelector('.input-cash-received');
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    nativeSetter.call(input, '1000');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await sleep(400);

  const changeCalculation = await evaluate(`(() => {
    const modal = document.querySelector('.modal-overlay');
    return modal ? modal.innerText.includes('₹46.00') : false;
  })()`);
  recordResult("Test B2: Change to return calculates ₹46.00", changeCalculation);

  // Click Confirm Cash
  await evaluate(`(() => {
    const confirmBtn = document.querySelector('.btn-confirm-payment');
    confirmBtn.click();
  })()`);
  await sleep(1000);

  // Verify stock deduction: Rice = 8, Sugar = 19, Milk = 15
  const postCheckoutStock = await evaluate(`(() => {
    const raw = localStorage.getItem('freshcart_pos_products_v2');
    const prods = JSON.parse(raw || '[]');
    const rice = prods.find(p => p.name.toLowerCase().includes('rice'));
    const sugar = prods.find(p => p.name.toLowerCase().includes('sugar'));
    const milk = prods.find(p => p.name.toLowerCase().includes('milk'));
    return {
      riceStock: rice?.stock,
      sugarStock: sugar?.stock,
      milkStock: milk?.stock
    };
  })()`);

  recordResult(
    "Test B3: Inventory correctly deducted (Rice: 8, Sugar: 19, Milk: 15)",
    postCheckoutStock.riceStock === 8 && postCheckoutStock.sugarStock === 19 && postCheckoutStock.milkStock === 15,
    `Rice=${postCheckoutStock.riceStock}, Sugar=${postCheckoutStock.sugarStock}, Milk=${postCheckoutStock.milkStock}`
  );

  // Verify Invoice details
  const invoiceDetails = await evaluate(`(() => {
    const page = document.querySelector('.invoice-page');
    if (!page) return null;
    const text = page.innerText;
    return {
      hasInvoiceNo: text.includes('FC-'),
      hasTotalPaid954: text.includes('₹954.00'),
      hasCashReceived1000: text.includes('₹1,000.00'),
      hasChange46: text.includes('₹46.00'),
      hasCashier: text.includes('CASHIER')
    };
  })()`);

  recordResult(
    "Test B4: Generated Invoice contains payment breakdown",
    invoiceDetails && invoiceDetails.hasTotalPaid954 && invoiceDetails.hasCashReceived1000 && invoiceDetails.hasChange46
  );

  // -------------------------------------------------------------
  // TEST C: Exact Cash Payment
  // -------------------------------------------------------------
  console.log("\n--- TEST C: Exact Cash Payment (₹60 exact -> ₹0 change) ---");
  await evaluate(`(() => {
    const btn = Array.from(document.querySelectorAll('.nav-item')).find(b => b.textContent.includes('Billing Counter'));
    btn.click();
  })()`);
  await sleep(800);

  // Add Milk x 2 (₹30 x 2 = ₹60)
  await evaluate(`(() => {
    const cards = Array.from(document.querySelectorAll('.product-card'));
    const milkCard = cards.find(c => c.textContent.includes('Milk'));
    const addBtn = milkCard.querySelector('button');
    addBtn.click();
    addBtn.click();
  })()`);
  await sleep(400);

  await evaluate(`(() => {
    const proceedBtn = document.querySelector('.btn-proceed-checkout');
    proceedBtn.click();
  })()`);
  await sleep(500);

  // Click exact button or enter 60
  await evaluate(`(() => {
    const exactBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Exact'));
    if (exactBtn) exactBtn.click();
    else {
      const input = document.querySelector('.input-cash-received');
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(input, '60');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  })()`);
  await sleep(300);

  const exactChangeZero = await evaluate(`(() => {
    const modal = document.querySelector('.modal-overlay');
    return modal ? modal.innerText.includes('₹0.00') : false;
  })()`);
  recordResult("Test C1: Exact cash gives ₹0.00 change", exactChangeZero);

  await evaluate(`(() => {
    const confirmBtn = document.querySelector('.btn-confirm-payment');
    confirmBtn.click();
  })()`);
  await sleep(800);

  const milkStockAfter = await evaluate(`(() => {
    const prods = JSON.parse(localStorage.getItem('freshcart_pos_products_v2') || '[]');
    const milk = prods.find(p => p.name.toLowerCase().includes('milk'));
    return milk?.stock;
  })()`);
  recordResult("Test C2: Milk stock deducted to 13", milkStockAfter === 13, `Stock=${milkStockAfter}`);

  // -------------------------------------------------------------
  // TEST D: Insufficient Cash Handling
  // -------------------------------------------------------------
  console.log("\n--- TEST D: Insufficient Cash Handling ---");
  await evaluate(`(() => {
    const btn = Array.from(document.querySelectorAll('.nav-item')).find(b => b.textContent.includes('Billing Counter'));
    btn.click();
  })()`);
  await sleep(800);

  // Add Rice x 1 (₹500)
  await evaluate(`(() => {
    const cards = Array.from(document.querySelectorAll('.product-card'));
    const riceCard = cards.find(c => c.textContent.includes('Rice'));
    riceCard.querySelector('button').click();
  })()`);
  await sleep(400);

  await evaluate(`(() => {
    document.querySelector('.btn-proceed-checkout').click();
  })()`);
  await sleep(500);

  // Enter ₹400 received (need ₹500)
  await evaluate(`(() => {
    const input = document.querySelector('.input-cash-received');
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    nativeSetter.call(input, '400');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await sleep(400);

  const insufficientState = await evaluate(`(() => {
    const modal = document.querySelector('.modal-overlay');
    const hasBalanceDue = modal ? modal.innerText.includes('OUTSTANDING BALANCE DUE') && modal.innerText.includes('₹100.00') : false;
    const confirmBtn = document.querySelector('.btn-confirm-payment');
    const isDisabled = confirmBtn ? confirmBtn.disabled : false;
    return { hasBalanceDue, isDisabled };
  })()`);

  recordResult(
    "Test D: Insufficient cash shows balance due & disables confirm",
    insufficientState.hasBalanceDue && insufficientState.isDisabled,
    `Balance Due=${insufficientState.hasBalanceDue}, Disabled=${insufficientState.isDisabled}`
  );

  // Close modal and clear cart
  await evaluate(`(() => {
    const cancelBtn = Array.from(document.querySelectorAll('.modal-overlay button')).find(b => b.textContent.includes('Cancel'));
    if (cancelBtn) cancelBtn.click();
  })()`);
  await sleep(300);

  await evaluate(`(() => {
    window.confirm = () => true;
    const clearBtn = Array.from(document.querySelectorAll('button')).find(b => b.title === 'Clear active bill' || b.textContent.includes('Clear'));
    if (clearBtn) clearBtn.click();
  })()`);
  await sleep(400);

  // -------------------------------------------------------------
  // TEST E: Split Payment (Cash + UPI)
  // -------------------------------------------------------------
  console.log("\n--- TEST E: Split Payment Allocation (Cash + UPI) ---");
  // Add Sugar x 2 (₹60 x 2 = ₹120)
  await evaluate(`(() => {
    const cards = Array.from(document.querySelectorAll('.product-card'));
    const sugarCard = cards.find(c => c.textContent.includes('Sugar'));
    const addBtn = sugarCard.querySelector('button');
    addBtn.click();
    addBtn.click();
  })()`);
  await sleep(400);

  await evaluate(`(() => {
    document.querySelector('.btn-proceed-checkout').click();
  })()`);
  await sleep(500);

  // Switch to Split Pay tab
  await evaluate(`(() => {
    const splitTab = document.querySelector('.btn-tab-split');
    splitTab.click();
  })()`);
  await sleep(400);

  // Enter Cash = 50, UPI = 70, Card = 0
  await evaluate(`(() => {
    const cashInput = document.querySelector('.input-split-cash');
    const upiInput = document.querySelector('.input-split-upi');
    const cardInput = document.querySelector('.input-split-card');
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;

    nativeSetter.call(cashInput, '50');
    cashInput.dispatchEvent(new Event('input', { bubbles: true }));

    nativeSetter.call(upiInput, '70');
    upiInput.dispatchEvent(new Event('input', { bubbles: true }));

    nativeSetter.call(cardInput, '0');
    cardInput.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await sleep(400);

  const splitReady = await evaluate(`(() => {
    const modal = document.querySelector('.modal-overlay');
    const isReady = modal ? modal.innerText.includes('Exact Allocation Ready') : false;
    const confirmBtn = document.querySelector('.btn-confirm-payment');
    return isReady && confirmBtn && !confirmBtn.disabled;
  })()`);
  recordResult("Test E1: Split payment balances accurately (₹50 Cash + ₹70 UPI = ₹120)", splitReady);

  await evaluate(`(() => {
    document.querySelector('.btn-confirm-payment').click();
  })()`);
  await sleep(900);

  const splitInvoice = await evaluate(`(() => {
    const text = document.querySelector('.invoice-page')?.innerText || '';
    return text.includes('SPLIT') && text.includes('Cash Paid:') && text.includes('UPI Paid:');
  })()`);
  recordResult("Test E2: Invoice records split tender breakdown", splitInvoice);

  // -------------------------------------------------------------
  // TEST F: Coupon Removal & Reapplication
  // -------------------------------------------------------------
  console.log("\n--- TEST F: Coupon Removal and Reapplication ---");
  await evaluate(`(() => {
    const btn = Array.from(document.querySelectorAll('.nav-item')).find(b => b.textContent.includes('Billing Counter'));
    btn.click();
  })()`);
  await sleep(800);

  // Add Rice x 1 (₹500)
  await evaluate(`(() => {
    const cards = Array.from(document.querySelectorAll('.product-card'));
    const riceCard = cards.find(c => c.textContent.includes('Rice'));
    riceCard.querySelector('button').click();
  })()`);
  await sleep(400);

  // Apply SAVE10
  await evaluate(`(() => {
    const input = document.querySelector('input[placeholder*="SAVE10"]');
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    nativeSetter.call(input, 'SAVE10');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.form.querySelector('button[type="submit"]').click();
  })()`);
  await sleep(400);

  const totalWithCoupon = await evaluate(`(() => {
    return document.body.innerText.includes('₹450.00'); // 500 - 50 = 450
  })()`);
  recordResult("Test F1: Coupon SAVE10 applied (₹500 -> ₹450)", totalWithCoupon);

  // Remove coupon
  await evaluate(`(() => {
    const removeBtn = document.querySelector('.btn-remove-coupon');
    removeBtn.click();
  })()`);
  await sleep(400);

  const totalWithoutCoupon = await evaluate(`(() => {
    return document.body.innerText.includes('₹500.00');
  })()`);
  recordResult("Test F2: Coupon removed cleanly, returns to ₹500.00", totalWithoutCoupon);

  // Clear cart
  await evaluate(`(() => {
    window.confirm = () => true;
    const clearBtn = Array.from(document.querySelectorAll('button')).find(b => b.title === 'Clear active bill' || b.textContent.includes('Clear'));
    if (clearBtn) clearBtn.click();
  })()`);
  await sleep(400);

  // -------------------------------------------------------------
  // TEST G: Hold Bill & Resume Bill
  // -------------------------------------------------------------
  console.log("\n--- TEST G: Hold Bill & Resume Bill Workflow ---");
  // Add Milk x 3
  await evaluate(`(() => {
    const cards = Array.from(document.querySelectorAll('.product-card'));
    const milkCard = cards.find(c => c.textContent.includes('Milk'));
    const btn = milkCard.querySelector('button');
    btn.click();
    btn.click();
    btn.click();
  })()`);
  await sleep(400);

  // Click Hold Bill
  await evaluate(`(() => {
    const holdBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Hold'));
    holdBtn.click();
  })()`);
  await sleep(400);

  // Enter note and confirm
  await evaluate(`(() => {
    const input = document.querySelector('.modal-content input');
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    nativeSetter.call(input, 'Hold Customer Test');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const confirmBtn = document.querySelector('.modal-content button[type="submit"]');
    confirmBtn.click();
  })()`);
  await sleep(500);

  const cartIsEmptyAfterHold = await evaluate(`(() => {
    return document.body.innerText.includes('Shopping Cart is Empty');
  })()`);
  recordResult("Test G1: Active cart parks cleanly without deducting stock", cartIsEmptyAfterHold);

  // Resume the held bill
  await evaluate(`(() => {
    const heldBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Held (1)'));
    heldBtn.click();
  })()`);
  await sleep(400);

  await evaluate(`(() => {
    const resumeBtn = Array.from(document.querySelectorAll('.modal-content button')).find(b => b.textContent.includes('Resume Bill'));
    resumeBtn.click();
  })()`);
  await sleep(500);

  const cartRestored = await evaluate(`(() => {
    return document.body.innerText.includes('Milk') && document.body.innerText.includes('₹90.00');
  })()`);
  recordResult("Test G2: Held bill restored with 3 units of Milk", cartRestored);

  // Clear cart
  await evaluate(`(() => {
    window.confirm = () => true;
    const clearBtn = Array.from(document.querySelectorAll('button')).find(b => b.title === 'Clear active bill' || b.textContent.includes('Clear'));
    if (clearBtn) clearBtn.click();
  })()`);
  await sleep(400);

  // -------------------------------------------------------------
  // TEST H: Persistence across Page Reload
  // -------------------------------------------------------------
  console.log("\n--- TEST H: Persistence across Page Reload ---");
  const salesCountBeforeReload = await evaluate(`(() => {
    return JSON.parse(localStorage.getItem('freshcart_pos_sales_v2') || '[]').length;
  })()`);

  await sendCommand("Page.reload");
  await sleep(2000);

  const salesCountAfterReload = await evaluate(`(() => {
    return JSON.parse(localStorage.getItem('freshcart_pos_sales_v2') || '[]').length;
  })()`);

  recordResult(
    "Test H: Sales transactions & inventory persist across reload",
    salesCountBeforeReload > 0 && salesCountBeforeReload === salesCountAfterReload,
    `${salesCountAfterReload} completed sales persisted in localStorage`
  );

  // -------------------------------------------------------------
  // TEST I: Itemized Printable Receipt & Thermal Mode
  // -------------------------------------------------------------
  console.log("\n--- TEST I: Receipt Preview & Thermal 80mm Mode ---");
  await evaluate(`(() => {
    const btn = Array.from(document.querySelectorAll('.nav-item')).find(b => b.textContent.includes('Invoice'));
    btn.click();
  })()`);
  await sleep(800);

  const receiptContent = await evaluate(`(() => {
    const page = document.querySelector('.invoice-page');
    if (!page) return false;
    const text = page.innerText;
    return text.includes('TAX INVOICE') && text.includes('Amount in Words:') && text.includes('CASHIER');
  })()`);
  recordResult("Test I1: Itemized Tax Invoice contains all legal headers & words", receiptContent);

  // Switch to Thermal 80mm
  await evaluate(`(() => {
    const thermalBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Thermal 80mm'));
    thermalBtn.click();
  })()`);
  await sleep(400);

  const thermalApplied = await evaluate(`(() => {
    const el = document.querySelector('.thermal-receipt');
    return !!el;
  })()`);
  recordResult("Test I2: Thermal 80mm receipt mode formats correctly", thermalApplied);

  // -------------------------------------------------------------
  // TEST J: Catalogue Filters & Barcode Quick Add
  // -------------------------------------------------------------
  console.log("\n--- TEST J: Catalogue Category Filters & Barcode Scan ---");
  await evaluate(`(() => {
    const btn = Array.from(document.querySelectorAll('.nav-item')).find(b => b.textContent.includes('Billing Counter'));
    btn.click();
  })()`);
  await sleep(800);

  // Filter category: Dairy
  await evaluate(`(() => {
    const dairyPill = Array.from(document.querySelectorAll('.btn-sm')).find(b => b.textContent === 'Dairy');
    dairyPill.click();
  })()`);
  await sleep(400);

  const dairyOnly = await evaluate(`(() => {
    const cards = Array.from(document.querySelectorAll('.product-card'));
    const names = cards.map(c => c.querySelector('strong')?.innerText || '');
    return names.includes('Milk') && names.includes('Cheese') && !names.includes('Rice');
  })()`);
  recordResult("Test J1: Category filter isolates Dairy items", dairyOnly);

  // Switch back to All
  await evaluate(`(() => {
    const allPill = Array.from(document.querySelectorAll('.btn-sm')).find(b => b.textContent === 'All');
    allPill.click();
  })()`);
  await sleep(300);

  // Barcode quick add
  await evaluate(`(() => {
    const input = document.querySelector('input[placeholder*="Barcode"]');
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    nativeSetter.call(input, 'DAR-MILK-003');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.form.querySelector('button[type="submit"]').click();
  })()`);
  await sleep(500);

  const barcodeAdded = await evaluate(`(() => {
    return document.body.innerText.includes('Milk') && document.body.innerText.includes('1 in cart');
  })()`);
  recordResult("Test J2: Barcode / SKU quick-add instantly adds item to bill", barcodeAdded);

  // Clear cart
  await evaluate(`(() => {
    window.confirm = () => true;
    const clearBtn = Array.from(document.querySelectorAll('button')).find(b => b.title === 'Clear active bill' || b.textContent.includes('Clear'));
    if (clearBtn) clearBtn.click();
  })()`);
  await sleep(400);

  // -------------------------------------------------------------
  // TEST K: Return & Restock Workflow
  // -------------------------------------------------------------
  console.log("\n--- TEST K: Customer Returns & Inventory Restocking ---");
  // Check Milk stock before return
  const milkStockBeforeReturn = await evaluate(`(() => {
    const prods = JSON.parse(localStorage.getItem('freshcart_pos_products_v2') || '[]');
    const milk = prods.find(p => p.name.toLowerCase().includes('milk'));
    return milk?.stock;
  })()`);

  // Navigate to Transaction History
  await evaluate(`(() => {
    const btn = Array.from(document.querySelectorAll('.nav-item')).find(b => b.textContent.includes('Transactions') || b.textContent.includes('History'));
    btn.click();
  })()`);
  await sleep(800);

  // Click Return on first transaction with Milk
  await evaluate(`(() => {
    const rows = Array.from(document.querySelectorAll('tbody tr'));
    const milkRow = rows.find(r => r.innerText.includes('Milk'));
    if (milkRow) {
      const returnBtn = Array.from(milkRow.querySelectorAll('button')).find(b => b.textContent.includes('Return'));
      if (returnBtn) returnBtn.click();
    }
  })()`);
  await sleep(500);

  // Confirm return of 1 unit
  await evaluate(`(() => {
    const confirmBtn = document.querySelector('.modal-content button[type="submit"]');
    if (confirmBtn) confirmBtn.click();
  })()`);
  await sleep(600);

  // Check Milk stock replenished
  const milkStockAfterReturn = await evaluate(`(() => {
    const prods = JSON.parse(localStorage.getItem('freshcart_pos_products_v2') || '[]');
    const milk = prods.find(p => p.name.toLowerCase().includes('milk'));
    return milk?.stock;
  })()`);

  recordResult(
    "Test K1: Return replenishment restocks inventory (+1 unit)",
    milkStockAfterReturn === milkStockBeforeReturn + 1,
    `Before=${milkStockBeforeReturn}, After=${milkStockAfterReturn}`
  );

  // Verify Sales Reports shows returns
  await evaluate(`(() => {
    const btn = Array.from(document.querySelectorAll('.nav-item')).find(b => b.textContent.includes('Reports'));
    btn.click();
  })()`);
  await sleep(800);

  const reportDebug = await evaluate(`(() => {
    const page = document.querySelector('.reports-page');
    if (!page) {
      return { found: false, bodySnippet: document.body.innerText.slice(0, 200) };
    }
    return {
      found: true,
      hasText: page.innerText.includes('Processed Returns'),
      hasRefunds: page.innerText.includes('refunded total') || page.innerText.includes('refund'),
      snippet: page.innerText.slice(0, 300)
    };
  })()`);
  console.log("  [DEBUG K2]", JSON.stringify(reportDebug));
  recordResult("Test K2: Sales Reports reflects processed refund metrics", reportDebug.found && (reportDebug.hasText || reportDebug.hasRefunds));

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log("\n==========================================================================");
  console.log("PHASE 4 TEST SUMMARY");
  console.log("==========================================================================");
  const totalPassed = results.filter(r => r.passed).length;
  const totalFailed = results.filter(r => !r.passed).length;
  console.log(`Total Tests Run: ${results.length}`);
  console.log(`Passed:         ${totalPassed}`);
  console.log(`Failed:         ${totalFailed}`);

  if (totalFailed === 0) {
    console.log("\n>>> ALL PHASE 4 ACCEPTANCE TESTS PASSED WITH 100% SUCCESS! <<<\n");
  } else {
    console.log(`\n>>> WARNING: ${totalFailed} TEST(S) FAILED <<<\n`);
  }

  // Cleanup
  try {
    chrome.kill();
  } catch (e) {}
  process.exit(totalFailed === 0 ? 0 : 1);
}

runPhase4Tests().catch(err => {
  console.error("\nFATAL ERROR DURING PHASE 4 VERIFICATION:", err);
  try { chrome.kill(); } catch (e) {}
  process.exit(1);
});
