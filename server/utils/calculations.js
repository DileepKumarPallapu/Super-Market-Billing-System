export function round2(num) {
  return Math.round((Number(num) + Number.EPSILON) * 100) / 100;
}

export function calculateBillServerSide({
  dbProducts,
  cartItems,
  coupon = null,
  manualDiscount = 0,
  taxRate = 0
}) {
  let subtotal = 0;
  let totalUnits = 0;
  const itemSnapshots = [];

  for (const item of cartItems) {
    const product = dbProducts.find(p => p.id === item.productId || p.sku === item.sku || p.barcode === item.barcode);
    if (!product) {
      throw new Error(`Product "${item.productId || item.name}" not found in catalogue.`);
    }

    if (!product.isActive) {
      throw new Error(`Product "${product.name}" is currently inactive and cannot be sold.`);
    }

    const qty = parseInt(item.quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      throw new Error(`Invalid quantity ${item.quantity} for product "${product.name}".`);
    }

    if (qty > product.stock) {
      throw new Error(`Insufficient stock for "${product.name}". Requested: ${qty}, Available: ${product.stock}.`);
    }

    const unitPrice = round2(product.sellingPrice);
    const purchaseCost = round2(product.purchaseCost);
    const itemSubtotal = round2(unitPrice * qty);

    subtotal = round2(subtotal + itemSubtotal);
    totalUnits += qty;

    itemSnapshots.push({
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      category: product.category?.name || 'General',
      imageUrl: product.imageUrl,
      unitPrice,
      purchaseCost,
      quantity: qty,
      subtotal: itemSubtotal,
      discount: 0,
      taxRate: round2(product.taxRate || taxRate || 0),
      taxAmount: 0,
      totalAmount: itemSubtotal
    });
  }

  // Calculate discounts
  let couponDiscount = 0;
  let validatedCouponCode = null;

  if (coupon) {
    const code = String(coupon.code || coupon).toUpperCase().trim();
    if (code === 'SAVE10') {
      couponDiscount = round2(subtotal * 0.10);
      validatedCouponCode = 'SAVE10';
    } else if (coupon.type === 'PERCENTAGE') {
      const disc = round2(subtotal * (coupon.value / 100));
      couponDiscount = coupon.maxDiscount ? Math.min(disc, coupon.maxDiscount) : disc;
      validatedCouponCode = coupon.code;
    } else if (coupon.type === 'FIXED') {
      couponDiscount = Math.min(coupon.value, subtotal);
      validatedCouponCode = coupon.code;
    }
  }

  const numManualDiscount = round2(Math.max(0, Number(manualDiscount) || 0));
  const totalDiscount = round2(Math.min(subtotal, couponDiscount + numManualDiscount));
  const taxableAmount = round2(Math.max(0, subtotal - totalDiscount));

  // Calculate Tax
  const effectiveTaxRate = round2(Number(taxRate) || 0);
  const taxAmount = round2(taxableAmount * (effectiveTaxRate / 100));
  const finalTotal = round2(taxableAmount + taxAmount);

  // Distribute discount proportionally across items for itemized ledger
  if (totalDiscount > 0 && subtotal > 0) {
    let distributedDiscount = 0;
    for (let i = 0; i < itemSnapshots.length; i++) {
      const snap = itemSnapshots[i];
      if (i === itemSnapshots.length - 1) {
        snap.discount = round2(totalDiscount - distributedDiscount);
      } else {
        const itemDisc = round2((snap.subtotal / subtotal) * totalDiscount);
        snap.discount = itemDisc;
        distributedDiscount = round2(distributedDiscount + itemDisc);
      }
      const itemTaxable = Math.max(0, snap.subtotal - snap.discount);
      snap.taxAmount = round2(itemTaxable * (snap.taxRate / 100));
      snap.totalAmount = round2(itemTaxable + snap.taxAmount);
    }
  }

  return {
    subtotal,
    couponDiscount,
    manualDiscount: numManualDiscount,
    discount: totalDiscount,
    totalDiscount,
    taxableAmount,
    couponCode: validatedCouponCode,
    taxRate: effectiveTaxRate,
    taxAmount,
    finalTotal,
    totalUnits,
    itemSnapshots
  };
}
