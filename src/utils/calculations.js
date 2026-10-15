/**
 * Formats a numeric value into Indian Rupees (INR) format (e.g., ₹1,060.00)
 */
export function formatCurrency(amount) {
  const num = Number(amount || 0);
  return '₹' + num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * Rounds a number to exactly two decimal places safely
 */
export function round2(num) {
  return Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;
}

/**
 * Calculates cart totals including subtotal, SAVE10 coupon, manual manager discount, tax, and final amount
 * @param {Array} cartItems - Array of { productId, quantity }
 * @param {Array} products - Array of product objects
 * @param {string} coupon - Applied coupon code (e.g. 'SAVE10')
 * @param {number} taxRate - Tax percentage (defaults to 0)
 * @param {number} manualDiscount - Manual manager discount in rupees
 */
export function calculateCartTotals(cartItems, products, coupon = null, taxRate = 0, manualDiscount = 0) {
  let subtotal = 0;
  let totalUnits = 0;
  const itemDetails = [];

  for (const item of cartItems) {
    const product = products.find(p => p.id === item.productId);
    if (product) {
      const lineTotal = round2(product.price * item.quantity);
      subtotal = round2(subtotal + lineTotal);
      totalUnits += item.quantity;
      itemDetails.push({
        id: product.id,
        sku: product.sku || product.id,
        name: product.name,
        category: product.category || 'General',
        image: product.image || null,
        price: product.price,
        quantity: item.quantity,
        amount: lineTotal
      });
    }
  }

  // SAVE10 coupon: exactly 10% off the subtotal
  let couponDiscount = 0;
  const isSave10 = coupon && coupon.trim().toUpperCase() === 'SAVE10';
  if (isSave10) {
    couponDiscount = round2(subtotal * 0.10);
  }

  const validManualDiscount = Math.min(
    Math.max(0, round2(Number(manualDiscount || 0))),
    Math.max(0, subtotal - couponDiscount)
  );

  const discount = round2(couponDiscount + validManualDiscount);
  const taxableAmount = Math.max(0, round2(subtotal - discount));
  const tax = round2(taxableAmount * (Number(taxRate || 0) / 100));
  const finalTotal = round2(taxableAmount + tax);

  return {
    subtotal,
    couponDiscount,
    manualDiscount: validManualDiscount,
    discount,
    tax,
    finalTotal,
    totalUnits,
    itemDetails,
    isSave10
  };
}

/**
 * Calculates change to return (Amount Received - Final Bill Total)
 */
export function calculateChange(amountReceived, finalTotal) {
  const received = round2(Number(amountReceived || 0));
  const total = round2(Number(finalTotal || 0));
  return round2(Math.max(0, received - total));
}

/**
 * Calculates balance due (Final Bill Total - Amount Received)
 */
export function calculateBalanceDue(amountReceived, finalTotal) {
  const received = round2(Number(amountReceived || 0));
  const total = round2(Number(finalTotal || 0));
  return round2(Math.max(0, total - received));
}

/**
 * Validates product stock and returns status badge metadata
 */
export function getStockStatus(stock, threshold = 5) {
  if (stock <= 0) {
    return {
      label: 'Out of Stock',
      variant: 'danger',
      isOut: true,
      isLow: false
    };
  }
  if (stock <= threshold) {
    return {
      label: `Low Stock (≤${threshold})`,
      variant: 'warning',
      isOut: false,
      isLow: true
    };
  }
  return {
    label: 'In Stock',
    variant: 'success',
    isOut: false,
    isLow: false
  };
}

/**
 * Converts a numeric amount to Indian currency words
 */
export function numberToWordsINR(amount) {
  const num = Math.round(Number(amount || 0));
  if (num === 0) return 'Zero Rupees Only';

  const singleDigits = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertTwoDigits(n) {
    if (n < 10) return singleDigits[n];
    if (n >= 10 && n < 20) return teens[n - 10];
    return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + singleDigits[n % 10] : '');
  }

  function convertThreeDigits(n) {
    let str = '';
    if (Math.floor(n / 100) > 0) {
      str += singleDigits[Math.floor(n / 100)] + ' Hundred ';
    }
    const remainder = n % 100;
    if (remainder > 0) {
      str += convertTwoDigits(remainder);
    }
    return str.trim();
  }

  let words = '';
  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const hundred = num % 1000;

  if (crore > 0) words += convertTwoDigits(crore) + ' Crore ';
  if (lakh > 0) words += convertTwoDigits(lakh) + ' Lakh ';
  if (thousand > 0) words += convertTwoDigits(thousand) + ' Thousand ';
  if (hundred > 0) words += convertThreeDigits(hundred);

  return words.trim() + ' Rupees Only';
}
