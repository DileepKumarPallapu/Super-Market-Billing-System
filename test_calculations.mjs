import assert from 'node:assert/strict';
import {
  formatCurrency,
  round2,
  calculateCartTotals,
  getStockStatus
} from './src/utils/calculations.js';

console.log("Running Unit Tests for calculations.js...\n");

// Test 1: formatCurrency
console.log("1. Testing formatCurrency...");
assert.equal(formatCurrency(1060), "₹1,060.00");
assert.equal(formatCurrency(954), "₹954.00");
assert.equal(formatCurrency(0), "₹0.00");
assert.equal(formatCurrency(1234567.89), "₹12,34,567.89");
console.log("✓ formatCurrency tests passed.");

// Test 2: calculateCartTotals without coupon
console.log("\n2. Testing calculateCartTotals without coupon...");
const mockProducts = [
  { id: 'prod-rice', price: 500, stock: 10, name: 'Rice' },
  { id: 'prod-sugar', price: 60, stock: 20, name: 'Sugar' },
  { id: 'prod-milk', price: 30, stock: 15, name: 'Milk' }
];

const mockCart = [
  { productId: 'prod-rice', quantity: 2 },
  { productId: 'prod-sugar', quantity: 1 }
];

const totalsNoCoupon = calculateCartTotals(mockCart, mockProducts, null, 0);
assert.equal(totalsNoCoupon.subtotal, 1060);
assert.equal(totalsNoCoupon.discount, 0);
assert.equal(totalsNoCoupon.tax, 0);
assert.equal(totalsNoCoupon.finalTotal, 1060);
assert.equal(totalsNoCoupon.totalUnits, 3);
console.log("✓ Cart totals without coupon verified (Subtotal = ₹1,060).");

// Test 3: Mandatory Acceptance Test with SAVE10 coupon
console.log("\n3. Testing Mandatory Acceptance Test with SAVE10 coupon...");
const totalsWithSave10 = calculateCartTotals(mockCart, mockProducts, 'SAVE10', 0);
assert.equal(totalsWithSave10.subtotal, 1060, "Subtotal must be ₹1,060");
assert.equal(totalsWithSave10.discount, 106, "SAVE10 discount must be exactly ₹106 (10%)");
assert.equal(totalsWithSave10.tax, 0, "Tax must default to ₹0");
assert.equal(totalsWithSave10.finalTotal, 954, "Final amount must be ₹954");
assert.equal(totalsWithSave10.totalUnits, 3, "Total units must be 3");
console.log("✓ Mandatory acceptance calculation verified: Subtotal = 1060, Discount = 106, Final = 954.");

// Test 4: Invalid coupon rejection
console.log("\n4. Testing invalid coupon rejection...");
const totalsInvalidCoupon = calculateCartTotals(mockCart, mockProducts, 'SAVE50', 0);
assert.equal(totalsInvalidCoupon.discount, 0, "Unsupported coupon SAVE50 must yield 0 discount");
assert.equal(totalsInvalidCoupon.finalTotal, 1060);
console.log("✓ Unsupported coupons yield ₹0 discount as required.");

// Test 5: getStockStatus thresholds
console.log("\n5. Testing getStockStatus thresholds...");
assert.equal(getStockStatus(10, 5).label, "In Stock");
assert.equal(getStockStatus(5, 5).label, "Low Stock (≤5)");
assert.equal(getStockStatus(1, 5).label, "Low Stock (≤5)");
assert.equal(getStockStatus(0, 5).label, "Out of Stock");
console.log("✓ getStockStatus threshold rules verified.");

console.log("\n==========================================");
console.log("ALL UNIT TESTS PASSED SUCCESSFULLY!");
console.log("==========================================");
