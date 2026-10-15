import express from 'express';
import prisma from '../prisma.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { round2 } from '../utils/calculations.js';

const router = express.Router();

// GET all coupons
router.get('/', async (req, res) => {
  try {
    const coupons = await prisma.promotion.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: coupons });
  } catch (err) {
    console.error('[GET COUPONS ERROR]', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve coupons.' });
  }
});

// POST validate coupon against subtotal
router.post('/validate', async (req, res) => {
  try {
    const { code, subtotal = 0 } = req.body;
    if (!code || String(code).trim() === '') {
      return res.status(400).json({ success: false, error: 'Coupon code is required.' });
    }

    const cleanCode = String(code).toUpperCase().trim();
    const orderSubtotal = round2(parseFloat(subtotal) || 0);

    // Baseline rule: SAVE10 gives exactly 10% off
    if (cleanCode === 'SAVE10') {
      const discount = round2(orderSubtotal * 0.10);
      return res.json({
        success: true,
        valid: true,
        data: {
          code: 'SAVE10',
          description: '10% discount on entire bill',
          type: 'PERCENTAGE',
          value: 10,
          discountAmount: discount,
          finalSubtotal: round2(orderSubtotal - discount)
        },
        message: `Coupon SAVE10 applied! You save ₹${discount.toFixed(2)} (10%).`
      });
    }

    const promo = await prisma.promotion.findUnique({
      where: { code: cleanCode }
    });

    if (!promo || !promo.isActive) {
      return res.status(404).json({
        success: false,
        valid: false,
        error: `Coupon "${cleanCode}" is invalid or expired.`
      });
    }

    if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) {
      return res.status(400).json({
        success: false,
        valid: false,
        error: `Coupon "${cleanCode}" expired on ${new Date(promo.expiresAt).toLocaleDateString()}.`
      });
    }

    if (orderSubtotal < promo.minOrderAmount) {
      return res.status(400).json({
        success: false,
        valid: false,
        error: `Minimum order amount of ₹${promo.minOrderAmount} required for coupon ${cleanCode}.`
      });
    }

    let discount = 0;
    if (promo.type === 'PERCENTAGE') {
      discount = round2(orderSubtotal * (promo.value / 100));
      if (promo.maxDiscount) {
        discount = Math.min(discount, promo.maxDiscount);
      }
    } else {
      discount = Math.min(promo.value, orderSubtotal);
    }

    res.json({
      success: true,
      valid: true,
      data: {
        code: promo.code,
        description: promo.description,
        type: promo.type,
        value: promo.value,
        discountAmount: discount,
        finalSubtotal: round2(orderSubtotal - discount)
      },
      message: `Coupon ${promo.code} applied! You save ₹${discount.toFixed(2)}.`
    });
  } catch (err) {
    console.error('[VALIDATE COUPON ERROR]', err);
    res.status(500).json({ success: false, error: 'Failed to validate coupon.' });
  }
});

// POST create or update coupon
router.post('/', verifyToken, requireRole('SUPER_ADMIN', 'STORE_MANAGER'), async (req, res) => {
  try {
    const { code, description, type = 'PERCENTAGE', value, minOrderAmount = 0, maxDiscount, expiresAt } = req.body;

    if (!code || !value) {
      return res.status(400).json({ success: false, error: 'Code and discount value are required.' });
    }

    const cleanCode = String(code).toUpperCase().trim();
    const coupon = await prisma.promotion.upsert({
      where: { code: cleanCode },
      update: {
        description: description || `Discount promo ${cleanCode}`,
        type,
        value: parseFloat(value),
        minOrderAmount: parseFloat(minOrderAmount) || 0,
        maxDiscount: maxDiscount ? parseFloat(maxDiscount) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: true
      },
      create: {
        code: cleanCode,
        description: description || `Discount promo ${cleanCode}`,
        type,
        value: parseFloat(value),
        minOrderAmount: parseFloat(minOrderAmount) || 0,
        maxDiscount: maxDiscount ? parseFloat(maxDiscount) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: true
      }
    });

    res.json({
      success: true,
      message: `Coupon ${coupon.code} saved successfully.`,
      data: coupon
    });
  } catch (err) {
    console.error('[CREATE COUPON ERROR]', err);
    res.status(500).json({ success: false, error: 'Failed to save coupon: ' + err.message });
  }
});

export default router;
