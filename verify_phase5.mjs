// Comprehensive Automated E2E Verification Suite for Phase 5:
// Ultimate Supermarket POS UI/UX Transformation, Thumbnails Everywhere,
// Catalogue, Billing, Checkout, Invoices, Reports, and Rich 4-Column Footer
import { spawn } from 'child_process';
import { rmSync, mkdirSync } from 'fs';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PROFILE_DIR = "C:\\Users\\dilee\\.gemini\\antigravity\\scratch\\super_market_billing_demo\\tmp_chrome_phase5";
const TARGET_URL = "http://localhost:5173/";
const DEBUG_PORT = 9234;

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
await sleep(3000);

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

async function waitForSelector(selector, timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const exists = await evaluate(`!!document.querySelector("${selector}")`);
    if (exists) return true;
    await sleep(200);
  }
  throw new Error(`Timeout waiting for selector: ${selector}`);
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

async function runPhase5Tests() {
  console.log("\n==========================================================================");
  console.log("PHASE 5 E2E TEST SUITE: ULTIMATE SUPERMARKET POS UI/UX & VERIFICATION");
  console.log("==========================================================================\n");

  await waitForSelector('.nav-item');
  await sleep(1000);

  // -------------------------------------------------------------
  // TEST 1: Settings Reset Demo Data for Pristine Benchmark State
  // -------------------------------------------------------------
  console.log("[TEST 1] Resetting demo data in Settings...");
  await evaluate(`(() => {
    const btn = Array.from(document.querySelectorAll('.nav-item')).find(b => b.textContent.includes('Settings'));
    if (btn) btn.click();
  })()`);
  await sleep(800);

  await evaluate(`(() => {
    const resetBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Reset Demo Data'));
    if (resetBtn) resetBtn.click();
  })()`);
  await sleep(500);

  await evaluate(`(() => {
    const confirmBtn = document.querySelector('.modal-content .btn-danger');
    if (confirmBtn) confirmBtn.click();
  })()`);
  await sleep(1000);

  // Verify baseline product catalogue & defaults
  const catalogueStats = await evaluate(`(() => {
    const raw = localStorage.getItem('freshcart_pos_products_v2');
    const prods = JSON.parse(raw || '[]');
    const rice = prods.find(p => p.name.toLowerCase().includes('rice'));
    const sugar = prods.find(p => p.name.toLowerCase().includes('sugar'));
    const milk = prods.find(p => p.name.toLowerCase().includes('milk'));
    const withImages = prods.filter(p => p.image && p.image.length > 5);

    return {
      count: prods.length,
      riceStock: rice ? rice.stock : null,
      ricePrice: rice ? rice.price : null,
      sugarStock: sugar ? sugar.stock : null,
      sugarPrice: sugar ? sugar.price : null,
      milkStock: milk ? milk.stock : null,
      milkPrice: milk ? milk.price : null,
      withImagesCount: withImages.length
    };
  })()`);

  recordResult(
    "Reset Demo Data & 30 Supermarket Products Loaded",
    catalogueStats.count === 30,
    `Total Products: ${catalogueStats.count}`
  );

  recordResult(
    "All 30 Products Possess High-Quality Image References",
    catalogueStats.withImagesCount === 30,
    `Products with images: ${catalogueStats.withImagesCount}/30`
  );

  recordResult(
    "Baseline Products Integrity (Rice ₹500/stock 10, Sugar ₹60/stock 20, Milk ₹30/stock 15)",
    catalogueStats.ricePrice === 500 && catalogueStats.riceStock === 10 &&
    catalogueStats.sugarPrice === 60 && catalogueStats.sugarStock === 20 &&
    catalogueStats.milkPrice === 30 && catalogueStats.milkStock === 15,
    `Rice: ₹${catalogueStats.ricePrice}(${catalogueStats.riceStock}), Sugar: ₹${catalogueStats.sugarPrice}(${catalogueStats.sugarStock}), Milk: ₹${catalogueStats.milkPrice}(${catalogueStats.milkStock})`
  );

  // -------------------------------------------------------------
  // TEST 2: Rich 4-Column Footer & Student Metadata
  // -------------------------------------------------------------
  console.log("\n[TEST 2] Verifying Rich 4-Column Footer & Project Metadata...");
  const footerData = await evaluate(`(() => {
    const footer = document.querySelector('.app-footer');
    if (!footer) return null;

    const brand = footer.querySelector('.footer-brand-title')?.textContent || '';
    const student = footer.querySelector('.meta-dev')?.textContent || '';
    const dept = footer.querySelector('.meta-dept')?.textContent || '';
    const inst = footer.querySelector('.meta-inst')?.textContent || '';
    const year = footer.querySelector('.meta-year')?.textContent || '';
    const techTags = Array.from(footer.querySelectorAll('.tech-tag')).map(t => t.textContent.trim());
    const backToTop = footer.querySelector('.btn-back-to-top');

    return {
      exists: true,
      brand,
      student,
      dept,
      inst,
      year,
      techCount: techTags.length,
      techSample: techTags.slice(0, 4).join(', '),
      hasBackToTop: !!backToTop
    };
  })()`);

  recordResult(
    "Rich 4-Column Footer Component Rendered",
    footerData && footerData.exists,
    `Brand: "${footerData?.brand}"`
  );

  recordResult(
    "Verified Developer & Institution Metadata (Pallapu Dileep Kumar / Vel Tech)",
    footerData?.student.includes('Pallapu Dileep Kumar') &&
    footerData?.dept.includes('Computer Science and Engineering') &&
    footerData?.inst.includes('Vel Tech Rangarajan') &&
    footerData?.year.includes('2026'),
    `Student: "${footerData?.student}", Inst: "${footerData?.inst}"`
  );

  recordResult(
    "Tech Stack Badges Rendered (React 18, Vite, etc.)",
    footerData?.techCount >= 6,
    `Total tags: ${footerData?.techCount} (${footerData?.techSample})`
  );

  // -------------------------------------------------------------
  // TEST 3: Footer Quick Navigation Links
  // -------------------------------------------------------------
  console.log("\n[TEST 3] Testing Footer Quick Navigation Links...");
  // Click 'Products' in footer
  await evaluate(`(() => {
    const link = Array.from(document.querySelectorAll('.footer-col-nav button')).find(b => b.textContent.includes('Products'));
    if (link) link.click();
  })()`);
  await sleep(500);

  const activeTabProducts = await evaluate(`(() => {
    const activeNav = document.querySelector('.nav-item.active');
    return activeNav ? activeNav.textContent.trim() : '';
  })()`);

  recordResult(
    "Footer Quick Nav -> Products Tab Transition",
    activeTabProducts.includes('Products'),
    `Active tab: "${activeTabProducts}"`
  );

  // Verify Products table renders ProductImage thumbnails
  const productsTableThumbnails = await evaluate(`(() => {
    const rows = Array.from(document.querySelectorAll('.products-table tbody tr'));
    const thumbs = Array.from(document.querySelectorAll('.products-table .product-thumb'));
    return {
      rowCount: rows.length,
      thumbCount: thumbs.length
    };
  })()`);

  recordResult(
    "Product Management Table Renders ProductImage Thumbnails for All Items",
    productsTableThumbnails.rowCount > 0 && productsTableThumbnails.thumbCount >= productsTableThumbnails.rowCount,
    `Rows: ${productsTableThumbnails.rowCount}, Thumbnails: ${productsTableThumbnails.thumbCount}`
  );

  // -------------------------------------------------------------
  // TEST 4: Billing Counter — Product Cards, Search, Sorting & Thumbnails
  // -------------------------------------------------------------
  console.log("\n[TEST 4] Testing Billing Counter, Product Picker & Sorting...");
  // Navigate to Billing Counter via footer link
  await evaluate(`(() => {
    const link = Array.from(document.querySelectorAll('.footer-col-nav button')).find(b => b.textContent.includes('Billing Counter'));
    if (link) link.click();
  })()`);
  await sleep(600);

  const billingCards = await evaluate(`(() => {
    const cards = Array.from(document.querySelectorAll('.product-picker-card'));
    const thumbs = Array.from(document.querySelectorAll('.product-picker-card .product-thumb'));
    const sortSelect = document.querySelector('.sort-select');

    return {
      cardCount: cards.length,
      thumbCount: thumbs.length,
      hasSortSelect: !!sortSelect
    };
  })()`);

  recordResult(
    "Billing Counter Product Picker Displays Thumbnail Cards (64px)",
    billingCards.cardCount === 30 && billingCards.thumbCount === 30,
    `Cards: ${billingCards.cardCount}, Thumbnails: ${billingCards.thumbCount}`
  );

  recordResult(
    "Sorting Dropdown Available (Default, Name, Price Low/High, Popularity)",
    billingCards.hasSortSelect,
    "Found .sort-select control"
  );

  // Test Sorting by Price Low to High
  const priceSortTest = await evaluate(`(() => {
    const sel = document.querySelector('.sort-select');
    sel.value = 'price_asc';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`);
  await sleep(400);

  const firstCardAfterPriceSort = await evaluate(`(() => {
    const firstCard = document.querySelector('.product-picker-card');
    const name = firstCard ? firstCard.querySelector('.picker-card-title')?.textContent.trim() : '';
    const price = firstCard ? firstCard.querySelector('.picker-card-price')?.textContent.trim() : '';
    return { name, price };
  })()`);

  recordResult(
    "Sort by Price Ascending Works Correctly",
    firstCardAfterPriceSort.price.includes('15') || firstCardAfterPriceSort.price.includes('20'),
    `Cheapest item at top: ${firstCardAfterPriceSort.name} (${firstCardAfterPriceSort.price})`
  );

  // Reset sorting to default
  await evaluate(`(() => {
    const sel = document.querySelector('.sort-select');
    sel.value = 'default';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  await sleep(300);

  // -------------------------------------------------------------
  // TEST 5: Mandatory Acceptance Test
  // Add Rice × 2 (₹1,000) + Sugar × 1 (₹60) = Subtotal ₹1,060
  // Apply SAVE10 -> Discount ₹106, Final Bill ₹954
  // -------------------------------------------------------------
  console.log("\n[TEST 5] Running Mandatory Acceptance Test (Rice × 2 + Sugar × 1 + SAVE10)...");

  // Add Rice × 2 via direct card button clicks
  await evaluate(`(() => {
    const cards = Array.from(document.querySelectorAll('.product-picker-card'));
    const riceCard = cards.find(c => c.querySelector('.picker-card-title')?.textContent.trim() === 'Rice');
    if (!riceCard) throw new Error("Rice card not found!");
    const btn = riceCard.querySelector('.btn-add-to-cart');
    btn.click();
  })()`);
  await sleep(400);

  await evaluate(`(() => {
    const cards = Array.from(document.querySelectorAll('.product-picker-card'));
    const riceCard = cards.find(c => c.querySelector('.picker-card-title')?.textContent.trim() === 'Rice');
    const btn = riceCard.querySelector('.btn-add-to-cart');
    btn.click();
  })()`);
  await sleep(400);

  // Add Sugar × 1 via direct card button click
  await evaluate(`(() => {
    const cards = Array.from(document.querySelectorAll('.product-picker-card'));
    const sugarCard = cards.find(c => c.querySelector('.picker-card-title')?.textContent.trim() === 'Sugar');
    if (!sugarCard) throw new Error("Sugar card not found!");
    const btn = sugarCard.querySelector('.btn-add-to-cart');
    btn.click();
  })()`);
  await sleep(600);

  // Verify Cart items and thumbnails
  const cartInfoBeforeDiscount = await evaluate(`(() => {
    const cartItems = Array.from(document.querySelectorAll('.cart-item'));
    const thumbs = Array.from(document.querySelectorAll('.cart-item .product-thumb'));
    const subtotalText = document.querySelector('.summary-subtotal')?.textContent || '';

    return {
      itemCount: cartItems.length,
      thumbCount: thumbs.length,
      subtotalText
    };
  })()`);

  recordResult(
    "Cart Items Render ProductImage Thumbnails (40px)",
    cartInfoBeforeDiscount.itemCount === 2 && cartInfoBeforeDiscount.thumbCount === 2,
    `Cart items: ${cartInfoBeforeDiscount.itemCount}, Cart thumbnails: ${cartInfoBeforeDiscount.thumbCount}`
  );

  recordResult(
    "Subtotal Before Discount = ₹1,060.00",
    cartInfoBeforeDiscount.subtotalText.includes('1,060') || cartInfoBeforeDiscount.subtotalText.includes('1060'),
    `Cart Subtotal: ${cartInfoBeforeDiscount.subtotalText}`
  );

  // Apply SAVE10 coupon using React-safe prototype setter
  console.log("[TEST 5] Applying coupon 'SAVE10'...");
  await evaluate(`(() => {
    const couponInput = document.querySelector('.coupon-input');
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    nativeSetter.call(couponInput, 'SAVE10');
    couponInput.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await sleep(300);

  await evaluate(`(() => {
    const applyBtn = document.querySelector('.btn-apply-coupon');
    if (applyBtn) applyBtn.click();
  })()`);
  await sleep(600);

  const cartCalculations = await evaluate(`(() => {
    const subtotal = document.querySelector('.summary-subtotal')?.textContent || '';
    const discount = document.querySelector('.summary-discount')?.textContent || '';
    const grandTotal = document.querySelector('.grand-total-amount')?.textContent || '';

    return { subtotal, discount, grandTotal };
  })()`);

  const subtotalValid = cartCalculations.subtotal.includes('1,060') || cartCalculations.subtotal.includes('1060');
  const discountValid = cartCalculations.discount.includes('106');
  const totalValid = cartCalculations.grandTotal.includes('954');

  recordResult(
    "Acceptance Test: Rice × 2 + Sugar × 1 = Subtotal ₹1,060",
    subtotalValid,
    `Subtotal: ${cartCalculations.subtotal}`
  );

  recordResult(
    "Acceptance Test: SAVE10 Applied = Discount exactly ₹106",
    discountValid,
    `Discount: ${cartCalculations.discount}`
  );

  recordResult(
    "Acceptance Test: Final Bill Payable = exactly ₹954",
    totalValid,
    `Final Total: ${cartCalculations.grandTotal}`
  );

  // -------------------------------------------------------------
  // TEST 6: Checkout Modal with Order Items Preview Chips & Cash Tender
  // -------------------------------------------------------------
  console.log("\n[TEST 6] Opening Checkout Modal & Verifying Item Chips & Cash Payment...");
  await evaluate(`(() => {
    const checkoutBtn = document.querySelector('.btn-checkout');
    checkoutBtn.click();
  })()`);
  await sleep(600);

  const checkoutModalInfo = await evaluate(`(() => {
    const modal = document.querySelector('.modal-content');
    if (!modal) return null;

    const chips = Array.from(modal.querySelectorAll('.product-thumb'));
    const payableText = modal.querySelector('div[style*="font-size: 26px"]')?.textContent || '';
    const cashInput = modal.querySelector('.input-cash-received');

    return {
      isOpen: true,
      chipCount: chips.length,
      payableText,
      initialCash: cashInput ? cashInput.value : ''
    };
  })()`);

  recordResult(
    "Checkout Modal Opens with Order Items Preview Chips & Product Thumbnails",
    checkoutModalInfo && checkoutModalInfo.chipCount >= 2,
    `Thumbnail chips in checkout: ${checkoutModalInfo?.chipCount}`
  );

  recordResult(
    "Checkout Total Amount Payable Matches Exactly ₹954.00",
    checkoutModalInfo?.payableText.includes('954'),
    `Payable: ${checkoutModalInfo?.payableText}`
  );

  // Test Cash tender: enter ₹1,000 using React prototype setter -> calculate change ₹46.00
  await evaluate(`(() => {
    const cashInput = document.querySelector('.input-cash-received');
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    nativeSetter.call(cashInput, '1000');
    cashInput.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await sleep(400);

  const changeCalculation = await evaluate(`(() => {
    const text = document.querySelector('.modal-content')?.textContent || '';
    const matchesChange = text.includes('46.00') || text.includes('₹46');
    return { matchesChange, fullText: text };
  })()`);

  recordResult(
    "Cash Payment: ₹1,000 received -> ₹46.00 change calculated",
    changeCalculation.matchesChange,
    "Change ₹46.00 verified"
  );

  // Finalize payment
  console.log("[TEST 6] Finalizing Payment & Generating Invoice...");
  await evaluate(`(() => {
    const finalizeBtn = document.querySelector('.btn-finalize-pay');
    finalizeBtn.click();
  })()`);
  await sleep(1000);

  // -------------------------------------------------------------
  // TEST 7: Printable Tax Invoice with Product Thumbnails & Thermal Mode
  // -------------------------------------------------------------
  console.log("\n[TEST 7] Verifying Invoice View with Product Thumbnails & Thermal Mode...");
  const invoiceInfo = await evaluate(`(() => {
    const invoiceBox = document.querySelector('.invoice-paper');
    if (!invoiceBox) return null;

    const invoiceNo = invoiceBox.querySelector('.meta-val')?.textContent || '';
    const thumbs = Array.from(invoiceBox.querySelectorAll('.product-thumb'));
    const total = invoiceBox.querySelector('.grand-total-row .num')?.textContent || '';
    const inWords = invoiceBox.querySelector('.in-words-box')?.textContent || '';

    return {
      invoiceNo,
      thumbCount: thumbs.length,
      total,
      inWords
    };
  })()`);

  recordResult(
    "Tax Invoice Generated Successfully",
    invoiceInfo && invoiceInfo.invoiceNo.length > 0,
    `Invoice: ${invoiceInfo?.invoiceNo}`
  );

  recordResult(
    "Tax Invoice Itemized Table Displays ProductImage Thumbnails for Items",
    invoiceInfo && invoiceInfo.thumbCount === 2,
    `Thumbnails in invoice table: ${invoiceInfo?.thumbCount}`
  );

  recordResult(
    "Tax Invoice Amount in Words Correct (Nine Hundred Fifty-Four)",
    invoiceInfo?.inWords.toLowerCase().includes('nine hundred fifty-four') ||
    invoiceInfo?.inWords.toLowerCase().includes('nine hundred fifty four') ||
    invoiceInfo?.inWords.includes('954'),
    `Amount in words: "${invoiceInfo?.inWords}"`
  );

  // Toggle Thermal 80mm Mode
  console.log("[TEST 7] Switching Invoice to Thermal 80mm Receipt Mode...");
  await evaluate(`(() => {
    const thermalBtn = document.querySelector('.btn-thermal-mode') || Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Thermal'));
    if (thermalBtn) thermalBtn.click();
  })()`);
  await sleep(500);

  const isThermalActive = await evaluate(`(() => {
    const paper = document.querySelector('.invoice-paper');
    return paper ? paper.classList.contains('thermal-paper') : false;
  })()`);

  recordResult(
    "Thermal 80mm Receipt Switch Active and Applied",
    isThermalActive,
    "Class 'thermal-paper' applied to invoice canvas"
  );

  // -------------------------------------------------------------
  // TEST 8: Inventory Stock Deduction Verification
  // Rice: 10 -> 8, Sugar: 20 -> 19, Milk: 15 (unchanged)
  // -------------------------------------------------------------
  console.log("\n[TEST 8] Verifying Post-Sale Stock Deductions in Inventory...");
  // Navigate to Inventory via footer link
  await evaluate(`(() => {
    const link = Array.from(document.querySelectorAll('.footer-col-nav button')).find(b => b.textContent.includes('Inventory'));
    if (link) link.click();
  })()`);
  await sleep(600);

  const postSaleStock = await evaluate(`(() => {
    const raw = localStorage.getItem('freshcart_pos_products_v2');
    const prods = JSON.parse(raw || '[]');
    const rice = prods.find(p => p.name.toLowerCase().includes('rice'));
    const sugar = prods.find(p => p.name.toLowerCase().includes('sugar'));
    const milk = prods.find(p => p.name.toLowerCase().includes('milk'));

    const inventoryThumbs = Array.from(document.querySelectorAll('.inventory-table .product-thumb'));

    return {
      riceStock: rice ? rice.stock : null,
      sugarStock: sugar ? sugar.stock : null,
      milkStock: milk ? milk.stock : null,
      inventoryThumbsCount: inventoryThumbs.length
    };
  })()`);

  recordResult(
    "Inventory Verification: Rice stock deducted from 10 to 8",
    postSaleStock.riceStock === 8,
    `Rice stock: ${postSaleStock.riceStock}`
  );

  recordResult(
    "Inventory Verification: Sugar stock deducted from 20 to 19",
    postSaleStock.sugarStock === 19,
    `Sugar stock: ${postSaleStock.sugarStock}`
  );

  recordResult(
    "Inventory Verification: Milk stock untouched at 15",
    postSaleStock.milkStock === 15,
    `Milk stock: ${postSaleStock.milkStock}`
  );

  recordResult(
    "Inventory Table Renders ProductImage Thumbnails for All Items",
    postSaleStock.inventoryThumbsCount >= 30,
    `Inventory table thumbnails: ${postSaleStock.inventoryThumbsCount}`
  );

  // -------------------------------------------------------------
  // TEST 9: Dashboard — Best Sellers & Inventory Alerts with Thumbnails
  // -------------------------------------------------------------
  console.log("\n[TEST 9] Verifying Dashboard Best Sellers & Inventory Alerts Thumbnails...");
  // Navigate to Dashboard via footer link
  await evaluate(`(() => {
    const link = Array.from(document.querySelectorAll('.footer-col-nav button')).find(b => b.textContent.includes('Dashboard'));
    if (link) link.click();
  })()`);
  await sleep(600);

  const dashboardThumbs = await evaluate(`(() => {
    const bestSellerThumbs = Array.from(document.querySelectorAll('.best-sellers-list .product-thumb'));
    const revenueCard = document.querySelector('.metric-card');

    return {
      bestSellerThumbsCount: bestSellerThumbs.length,
      hasCards: !!revenueCard
    };
  })()`);

  recordResult(
    "Dashboard Best Sellers Displays ProductImage Thumbnails",
    dashboardThumbs.bestSellerThumbsCount >= 1,
    `Best seller thumbnails on dashboard: ${dashboardThumbs.bestSellerThumbsCount}`
  );

  // -------------------------------------------------------------
  // TEST 10: Sales Reports — Best Sellers Table with Thumbnails
  // -------------------------------------------------------------
  console.log("\n[TEST 10] Verifying Sales Reports Best Sellers Table Thumbnails...");
  // Navigate to Reports via footer link
  await evaluate(`(() => {
    const link = Array.from(document.querySelectorAll('.footer-col-nav button')).find(b => b.textContent.includes('Reports'));
    if (link) link.click();
  })()`);
  await sleep(600);

  const reportsThumbs = await evaluate(`(() => {
    const thumbs = Array.from(document.querySelectorAll('.reports-page table .product-thumb'));
    return { thumbCount: thumbs.length };
  })()`);

  recordResult(
    "Sales Reports Best Sellers Table Displays ProductImage Thumbnails",
    reportsThumbs.thumbCount >= 2,
    `Best seller thumbnails in report table: ${reportsThumbs.thumbCount}`
  );

  // -------------------------------------------------------------
  // TEST 11: Transaction History — Item List Thumbnails & Return Modal
  // -------------------------------------------------------------
  console.log("\n[TEST 11] Verifying Transaction History Item Thumbnails & Return Modal Preview...");
  // Navigate to History via footer link
  await evaluate(`(() => {
    const link = Array.from(document.querySelectorAll('.footer-col-nav button')).find(b => b.textContent.includes('History'));
    if (link) link.click();
  })()`);
  await sleep(600);

  const historyThumbs = await evaluate(`(() => {
    const thumbs = Array.from(document.querySelectorAll('.history-page table .product-thumb'));
    return { thumbCount: thumbs.length };
  })()`);

  recordResult(
    "Transaction History Table Displays Item Thumbnail Avatars",
    historyThumbs.thumbCount >= 2,
    `Item thumbnails in history rows: ${historyThumbs.thumbCount}`
  );

  // Open Return Modal and verify preview
  await evaluate(`(() => {
    const returnBtn = Array.from(document.querySelectorAll('.history-page table button')).find(b => b.textContent.includes('Return'));
    if (returnBtn) returnBtn.click();
  })()`);
  await sleep(500);

  const returnModalThumb = await evaluate(`(() => {
    const modal = document.querySelector('.modal-content');
    if (!modal) return null;
    const thumb = modal.querySelector('.product-thumb');
    return { hasThumb: !!thumb };
  })()`);

  recordResult(
    "Return / Restock Modal Displays Product Thumbnail & Details Card",
    returnModalThumb && returnModalThumb.hasThumb,
    "Thumbnail preview present in Return modal"
  );

  // Close Return Modal
  await evaluate(`(() => {
    const closeBtn = document.querySelector('.btn-close');
    if (closeBtn) closeBtn.click();
  })()`);
  await sleep(400);

  // -------------------------------------------------------------
  // TEST 12: Theme Toggle (Dark & Light Mode)
  // -------------------------------------------------------------
  console.log("\n[TEST 12] Testing Dark/Light Mode Theme Toggle...");
  const themeToggleResult = await evaluate(`(async () => {
    const themeBtn = document.querySelector('.btn-theme-toggle');
    if (!themeBtn) return null;

    const initialTheme = document.documentElement.getAttribute('data-theme') || 'light';
    themeBtn.click();
    await new Promise(r => setTimeout(r, 400));
    const newTheme = document.documentElement.getAttribute('data-theme');
    themeBtn.click();
    await new Promise(r => setTimeout(r, 400));
    const finalTheme = document.documentElement.getAttribute('data-theme');

    return { initialTheme, newTheme, finalTheme };
  })()`);

  recordResult(
    "Dark / Light Theme Toggle Switches Smoothly",
    themeToggleResult && themeToggleResult.newTheme !== themeToggleResult.initialTheme,
    `Initial: ${themeToggleResult?.initialTheme} -> Toggled: ${themeToggleResult?.newTheme} -> Restored: ${themeToggleResult?.finalTheme}`
  );

  // -------------------------------------------------------------
  // FINAL SCORE & SUMMARY
  // -------------------------------------------------------------
  console.log("\n==========================================================================");
  console.log("PHASE 5 E2E VERIFICATION TEST SUMMARY");
  console.log("==========================================================================");

  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;
  console.log(`TOTAL TESTS RUN : ${totalCount}`);
  console.log(`TESTS PASSED    : ${passedCount}`);
  console.log(`TESTS FAILED    : ${totalCount - passedCount}`);
  console.log(`OVERALL STATUS  : ${passedCount === totalCount ? '✓ ALL TESTS PASSED (100%)' : '✗ SOME TESTS FAILED'}`);
  console.log("==========================================================================\n");

  ws.close();
  chrome.kill();
  process.exit(passedCount === totalCount ? 0 : 1);
}

runPhase5Tests().catch(err => {
  console.error("[FATAL ERROR]", err);
  ws.close();
  chrome.kill();
  process.exit(1);
});
