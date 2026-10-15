import express from 'express';
import prisma from '../prisma.js';
import { verifyToken } from '../middleware/auth.js';
import { recordAuditLog } from '../middleware/audit.js';
import { calculateBillServerSide, round2 } from '../utils/calculations.js';

const router = express.Router();

// Generate unique invoice number: INV-YYYYMMDD-XXXX
function generateInvoiceNumber() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `INV-${dateStr}-${randomSuffix}`;
}

// POST transactional checkout
router.post('/checkout', verifyToken, async (req, res) => {
  try {
    const {
      items = [],
      customer,
      customerId: providedCustomerId,
      couponCode,
      manualDiscount = 0,
      paymentMethod = 'CASH',
      amountReceived,
      paymentRef,
      splitBreakdown,
      taxRate = 0
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Cart is empty. Please add products to checkout.' });
    }

    // Extract product identifiers
    const productIds = items.map(i => i.productId || i.id).filter(Boolean);
    const skus = items.map(i => i.sku).filter(Boolean);

    // Fetch db products
    const dbProducts = await prisma.product.findMany({
      where: {
        OR: [
          { id: { in: productIds } },
          { sku: { in: skus } }
        ]
      },
      include: { category: true }
    });

    if (dbProducts.length === 0) {
      return res.status(400).json({ success: false, error: 'None of the requested products exist in catalogue.' });
    }

    // Fetch coupon if provided
    let promotionRecord = null;
    if (couponCode) {
      const codeClean = String(couponCode).toUpperCase().trim();
      promotionRecord = await prisma.promotion.findUnique({
        where: { code: codeClean }
      });
      // Allow SAVE10 even if not found in db as fallback
      if (!promotionRecord && codeClean === 'SAVE10') {
        promotionRecord = {
          code: 'SAVE10',
          type: 'PERCENTAGE',
          value: 10,
          description: '10% discount on entire bill',
          minOrderAmount: 0
        };
      }
    }

    // Server-side authoritative calculations
    const bill = calculateBillServerSide({
      dbProducts,
      cartItems: items,
      coupon: promotionRecord,
      manualDiscount,
      taxRate
    });

    // Payment validation
    const numReceived = parseFloat(amountReceived);
    if (isNaN(numReceived) || numReceived < bill.finalTotal) {
      return res.status(400).json({
        success: false,
        error: `Insufficient payment amount. Total payable is ₹${bill.finalTotal.toFixed(2)}, received ₹${(numReceived || 0).toFixed(2)}.`
      });
    }

    const changeReturned = round2(numReceived - bill.finalTotal);

    // Execute atomic checkout transaction
    const checkoutResult = await prisma.$transaction(async (tx) => {
      // 1. Resolve or create customer
      let finalCustomerId = providedCustomerId;
      if (!finalCustomerId && customer && customer.name && customer.name.trim() !== '') {
        const cleanPhone = customer.phone ? customer.phone.trim() : null;
        let cust = cleanPhone ? await tx.customer.findFirst({ where: { phone: cleanPhone } }) : null;
        if (!cust) {
          cust = await tx.customer.create({
            data: {
              name: customer.name.trim(),
              phone: cleanPhone,
              email: customer.email ? customer.email.trim() : null,
              orderCount: 1,
              totalSpent: bill.finalTotal,
              loyaltyPoints: Math.floor(bill.finalTotal / 100)
            }
          });
        } else {
          cust = await tx.customer.update({
            where: { id: cust.id },
            data: {
              orderCount: { increment: 1 },
              totalSpent: { increment: bill.finalTotal },
              loyaltyPoints: { increment: Math.floor(bill.finalTotal / 100) }
            }
          });
        }
        finalCustomerId = cust.id;
      } else if (finalCustomerId) {
        await tx.customer.update({
          where: { id: finalCustomerId },
          data: {
            orderCount: { increment: 1 },
            totalSpent: { increment: bill.finalTotal },
            loyaltyPoints: { increment: Math.floor(bill.finalTotal / 100) }
          }
        });
      }

      // 2. Generate unique invoice number
      let invoiceNo = generateInvoiceNumber();
      let invoiceExists = await tx.sale.findUnique({ where: { invoiceNo } });
      while (invoiceExists) {
        invoiceNo = generateInvoiceNumber();
        invoiceExists = await tx.sale.findUnique({ where: { invoiceNo } });
      }

      // 3. Create Sale record
      const sale = await tx.sale.create({
        data: {
          invoiceNo,
          cashierId: req.user?.id || null,
          cashierName: req.user?.name || 'Cashier-01',
          customerId: finalCustomerId || null,
          subtotal: bill.subtotal,
          couponCode: bill.couponCode,
          couponDiscount: bill.couponDiscount,
          manualDiscount: bill.manualDiscount,
          discount: bill.totalDiscount,
          taxRate: bill.taxRate,
          taxAmount: bill.taxAmount,
          finalTotal: bill.finalTotal,
          totalUnits: bill.totalUnits,
          paymentMethod: paymentMethod.toUpperCase(),
          paymentStatus: 'COMPLETED',
          amountReceived: numReceived,
          changeReturned,
          paymentRef: paymentRef || null,
          splitBreakdown: splitBreakdown ? JSON.stringify(splitBreakdown) : null
        }
      });

      // 4. Create SaleItems & update Product stocks & create InventoryMovements
      const createdItems = [];
      for (const snap of bill.itemSnapshots) {
        const saleItem = await tx.saleItem.create({
          data: {
            saleId: sale.id,
            productId: snap.productId,
            productName: snap.productName,
            sku: snap.sku,
            category: snap.category,
            imageUrl: snap.imageUrl,
            unitPrice: snap.unitPrice,
            purchaseCost: snap.purchaseCost,
            quantity: snap.quantity,
            subtotal: snap.subtotal,
            discount: snap.discount,
            taxRate: snap.taxRate,
            taxAmount: snap.taxAmount,
            totalAmount: snap.totalAmount
          }
        });
        createdItems.push(saleItem);

        // Fetch current stock to record exact movement
        const currentProd = await tx.product.findUnique({ where: { id: snap.productId } });
        const oldStock = currentProd.stock;
        const newStock = Math.max(0, oldStock - snap.quantity);

        await tx.product.update({
          where: { id: snap.productId },
          data: { stock: newStock }
        });

        await tx.inventoryMovement.create({
          data: {
            productId: snap.productId,
            type: 'SALE',
            quantity: -snap.quantity,
            previousStock: oldStock,
            newStock,
            reason: `Sold in sale ${sale.invoiceNo}`,
            userId: req.user?.id || null
          }
        });

        // Check if now low stock
        if (newStock <= currentProd.minStockThreshold) {
          await tx.notification.create({
            data: {
              title: newStock === 0 ? 'Out of Stock Alert' : 'Low Stock Warning',
              message: `Product "${currentProd.name}" stock reduced to ${newStock} units after invoice ${sale.invoiceNo}.`,
              type: newStock === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK'
            }
          });
        }
      }

      // Update coupon usage count if db promotion exists
      if (promotionRecord && promotionRecord.id) {
        await tx.promotion.update({
          where: { id: promotionRecord.id },
          data: { usageCount: { increment: 1 } }
        });
      }

      return { sale, items: createdItems };
    });

    // Record audit log
    await recordAuditLog({
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'CHECKOUT_SALE',
      entity: 'Sale',
      entityId: checkoutResult.sale.id,
      details: `Completed bill ${checkoutResult.sale.invoiceNo} for ₹${bill.finalTotal} (${bill.totalUnits} items). Paid via ${paymentMethod}`,
      req
    });

    // Fetch store profile for printable invoice
    const storeSetting = await prisma.storeSetting.findUnique({ where: { id: 'default' } });

    res.status(201).json({
      success: true,
      message: `Sale ${checkoutResult.sale.invoiceNo} processed successfully!`,
      data: {
        ...checkoutResult.sale,
        items: checkoutResult.items,
        store: storeSetting || {
          storeName: 'ORBIT MARKET — Intelligent Retail Studio',
          tagline: 'Curated Groceries & Household Essentials',
          address: '77 Commerce Boulevard, Metro Plaza, Suite 400',
          phone: '+91 98765 43210',
          gstin: '29ABCDE1234F1Z5',
          receiptFooter: 'Thank you for shopping at ORBIT MARKET! Experience Intelligent Retail.'
        }
      }
    });
  } catch (err) {
    console.error('[CHECKOUT ERROR]', err);
    res.status(400).json({
      success: false,
      error: err.message || 'Checkout failed due to transaction conflict.'
    });
  }
});

// GET sales listing with filters and search
router.get('/', async (req, res) => {
  try {
    const { search, paymentMethod, startDate, endDate, limit = 50, page = 1 } = req.query;
    const where = {};

    if (search) {
      const q = String(search).trim();
      where.OR = [
        { invoiceNo: { contains: q } },
        { cashierName: { contains: q } },
        { customer: { name: { contains: q } } },
        { customer: { phone: { contains: q } } }
      ];
    }

    if (paymentMethod && paymentMethod !== 'All') {
      where.paymentMethod = paymentMethod.toUpperCase();
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const take = parseInt(limit, 10) || 50;
    const skip = ((parseInt(page, 10) || 1) - 1) * take;

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: {
          items: true,
          customer: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      prisma.sale.count({ where })
    ]);

    res.json({
      success: true,
      data: sales,
      total,
      page: parseInt(page, 10) || 1,
      limit: take
    });
  } catch (err) {
    console.error('[GET SALES ERROR]', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve sales history.' });
  }
});

// GET sale details by ID or Invoice Number
router.get('/:idOrInvoice', async (req, res) => {
  try {
    const { idOrInvoice } = req.params;
    const sale = await prisma.sale.findFirst({
      where: {
        OR: [
          { id: idOrInvoice },
          { invoiceNo: idOrInvoice }
        ]
      },
      include: {
        items: true,
        customer: true,
        returns: {
          include: { items: true }
        }
      }
    });

    if (!sale) {
      return res.status(404).json({ success: false, error: 'Sale record not found.' });
    }

    const store = await prisma.storeSetting.findUnique({ where: { id: 'default' } });

    res.json({
      success: true,
      data: {
        ...sale,
        store: store || {}
      }
    });
  } catch (err) {
    console.error('[GET SALE BY ID ERROR]', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve sale details.' });
  }
});

export default router;
