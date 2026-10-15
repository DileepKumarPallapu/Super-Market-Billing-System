import express from 'express';
import prisma from '../prisma.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { recordAuditLog } from '../middleware/audit.js';

const router = express.Router();

// GET inventory valuation metrics
router.get('/valuation', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: { category: true }
    });

    let totalSKUs = products.length;
    let totalUnits = 0;
    let valuationAtCost = 0;
    let valuationAtRetail = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    const categoryStats = {};

    for (const p of products) {
      const stock = p.stock || 0;
      totalUnits += stock;
      const atCost = stock * (p.purchaseCost || 0);
      const atRetail = stock * (p.sellingPrice || 0);

      valuationAtCost += atCost;
      valuationAtRetail += atRetail;

      if (stock === 0) {
        outOfStockCount++;
      } else if (stock <= p.minStockThreshold) {
        lowStockCount++;
      }

      const catName = p.category?.name || 'Uncategorized';
      if (!categoryStats[catName]) {
        categoryStats[catName] = { name: catName, skus: 0, units: 0, costValuation: 0, retailValuation: 0 };
      }
      categoryStats[catName].skus++;
      categoryStats[catName].units += stock;
      categoryStats[catName].costValuation += atCost;
      categoryStats[catName].retailValuation += atRetail;
    }

    const potentialGrossProfit = valuationAtRetail - valuationAtCost;
    const marginPercent = valuationAtRetail > 0
      ? ((potentialGrossProfit / valuationAtRetail) * 100).toFixed(1)
      : '0.0';

    res.json({
      success: true,
      data: {
        totalSKUs,
        totalUnits,
        valuationAtCost: Math.round(valuationAtCost * 100) / 100,
        valuationAtRetail: Math.round(valuationAtRetail * 100) / 100,
        potentialGrossProfit: Math.round(potentialGrossProfit * 100) / 100,
        marginPercent: parseFloat(marginPercent),
        lowStockCount,
        outOfStockCount,
        categoryBreakdown: Object.values(categoryStats)
      }
    });
  } catch (err) {
    console.error('[INVENTORY VALUATION ERROR]', err);
    res.status(500).json({ success: false, error: 'Failed to compute inventory valuation.' });
  }
});

// GET inventory stock movement ledger
router.get('/movements', async (req, res) => {
  try {
    const { productId, type, limit = 50, page = 1 } = req.query;
    const where = {};

    if (productId) where.productId = productId;
    if (type) where.type = type.toUpperCase();

    const take = parseInt(limit, 10) || 50;
    const skip = ((parseInt(page, 10) || 1) - 1) * take;

    const [movements, total] = await Promise.all([
      prisma.inventoryMovement.findMany({
        where,
        include: {
          product: {
            select: { id: true, name: true, sku: true, unit: true }
          },
          user: {
            select: { id: true, name: true, role: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      prisma.inventoryMovement.count({ where })
    ]);

    res.json({
      success: true,
      data: movements,
      total,
      page: parseInt(page, 10) || 1,
      limit: take
    });
  } catch (err) {
    console.error('[INVENTORY MOVEMENTS ERROR]', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve stock movements.' });
  }
});

// POST adjust stock level
router.post('/adjust', verifyToken, requireRole('SUPER_ADMIN', 'STORE_MANAGER', 'INVENTORY_MANAGER'), async (req, res) => {
  try {
    const { productId, adjustment, reason, type = 'ADJUSTMENT' } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, error: 'Product ID is required.' });
    }

    const delta = parseInt(adjustment, 10);
    if (isNaN(delta) || delta === 0) {
      return res.status(400).json({ success: false, error: 'Valid non-zero adjustment quantity is required.' });
    }

    if (!reason || reason.trim() === '') {
      return res.status(400).json({ success: false, error: 'Reason for stock adjustment is required for audit compliance.' });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found.' });
    }

    const oldStock = product.stock;
    const newStock = oldStock + delta;

    if (newStock < 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot reduce stock below zero. Current: ${oldStock}, Reduction: ${Math.abs(delta)}`
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: { stock: newStock }
      });

      const movement = await tx.inventoryMovement.create({
        data: {
          productId,
          type: type.toUpperCase(),
          quantity: delta,
          previousStock: oldStock,
          newStock,
          reason: reason.trim(),
          userId: req.user?.id || null
        }
      });

      // If new stock is at or below threshold, create notification
      if (newStock <= product.minStockThreshold) {
        await tx.notification.create({
          data: {
            title: newStock === 0 ? 'Out of Stock Alert' : 'Low Stock Alert',
            message: `Product "${product.name}" has reached ${newStock} units (Threshold: ${product.minStockThreshold}).`,
            type: newStock === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK'
          }
        });
      }

      return { product: updatedProduct, movement };
    });

    await recordAuditLog({
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'STOCK_ADJUSTMENT',
      entity: 'Product',
      entityId: productId,
      details: `Stock of "${product.name}" adjusted by ${delta > 0 ? '+' : ''}${delta} (${oldStock} -> ${newStock}). Reason: ${reason}`,
      req
    });

    res.json({
      success: true,
      message: `Stock for "${product.name}" adjusted successfully. Current stock: ${newStock}`,
      data: result
    });
  } catch (err) {
    console.error('[INVENTORY ADJUST ERROR]', err);
    res.status(500).json({ success: false, error: 'Failed to adjust stock: ' + err.message });
  }
});

export default router;
