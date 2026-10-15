import express from 'express';
import prisma from '../prisma.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { recordAuditLog } from '../middleware/audit.js';
import { round2 } from '../utils/calculations.js';

const router = express.Router();

function generatePONumber() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `PO-${dateStr}-${randomSuffix}`;
}

// GET purchase orders
router.get('/', async (req, res) => {
  try {
    const { status, limit = 50, page = 1 } = req.query;
    const where = {};
    if (status && status !== 'All') where.status = status.toUpperCase();

    const take = parseInt(limit, 10) || 50;
    const skip = ((parseInt(page, 10) || 1) - 1) * take;

    const [orders, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        include: {
          supplier: true,
          items: {
            include: { product: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      prisma.purchaseOrder.count({ where })
    ]);

    res.json({
      success: true,
      data: orders,
      total,
      page: parseInt(page, 10) || 1,
      limit: take
    });
  } catch (err) {
    console.error('[GET PURCHASE ORDERS ERROR]', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve purchase orders.' });
  }
});

// POST create purchase order
router.post('/', verifyToken, requireRole('SUPER_ADMIN', 'STORE_MANAGER', 'INVENTORY_MANAGER'), async (req, res) => {
  try {
    const { supplierId, items = [], notes, status = 'ORDERED' } = req.body;

    if (!supplierId) {
      return res.status(400).json({ success: false, error: 'Supplier is required.' });
    }
    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Purchase order must contain at least one item.' });
    }

    const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) {
      return res.status(404).json({ success: false, error: 'Supplier not found.' });
    }

    const poNumber = generatePONumber();
    let totalAmount = 0;

    const po = await prisma.$transaction(async (tx) => {
      // Calculate total
      const validatedItems = [];
      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) {
          throw new Error(`Product ID ${item.productId} not found.`);
        }
        const qty = parseInt(item.quantityOrdered || item.quantity, 10);
        const unitCost = round2(parseFloat(item.unitCost) || product.purchaseCost);
        const itemTotal = round2(qty * unitCost);
        totalAmount = round2(totalAmount + itemTotal);

        validatedItems.push({
          productId: product.id,
          productName: product.name,
          quantityOrdered: qty,
          quantityReceived: 0,
          unitCost,
          totalCost: itemTotal
        });
      }

      const createdPO = await tx.purchaseOrder.create({
        data: {
          poNumber,
          supplierId,
          status: status.toUpperCase(),
          totalAmount,
          notes: notes || null,
          createdById: req.user?.id || null,
          orderedAt: new Date()
        }
      });

      for (const it of validatedItems) {
        await tx.purchaseOrderItem.create({
          data: {
            purchaseOrderId: createdPO.id,
            productId: it.productId,
            productName: it.productName,
            quantityOrdered: it.quantityOrdered,
            quantityReceived: 0,
            unitCost: it.unitCost,
            totalCost: it.totalCost
          }
        });
      }

      return createdPO;
    });

    await recordAuditLog({
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'CREATE_PURCHASE_ORDER',
      entity: 'PurchaseOrder',
      entityId: po.id,
      details: `Created Purchase Order ${po.poNumber} for ₹${totalAmount} with supplier ${supplier.name}`,
      req
    });

    res.status(201).json({
      success: true,
      message: `Purchase Order ${po.poNumber} created successfully.`,
      data: po
    });
  } catch (err) {
    console.error('[CREATE PO ERROR]', err);
    res.status(500).json({ success: false, error: 'Failed to create purchase order: ' + err.message });
  }
});

// POST receive goods for a purchase order (increases inventory!)
router.post('/:id/receive', verifyToken, requireRole('SUPER_ADMIN', 'STORE_MANAGER', 'INVENTORY_MANAGER'), async (req, res) => {
  try {
    const { id } = req.params;
    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: { include: { product: true } }
      }
    });

    if (!po) {
      return res.status(404).json({ success: false, error: 'Purchase Order not found.' });
    }

    if (po.status === 'RECEIVED') {
      return res.status(400).json({ success: false, error: 'This Purchase Order has already been fully received.' });
    }

    const receivedPO = await prisma.$transaction(async (tx) => {
      // Receive all items
      for (const item of po.items) {
        const qtyToReceive = item.quantityOrdered - item.quantityReceived;
        if (qtyToReceive > 0) {
          const oldStock = item.product.stock;
          const newStock = oldStock + qtyToReceive;

          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: newStock,
              purchaseCost: item.unitCost // update latest purchase cost
            }
          });

          await tx.inventoryMovement.create({
            data: {
              productId: item.productId,
              type: 'PURCHASE',
              quantity: qtyToReceive,
              previousStock: oldStock,
              newStock,
              reason: `Received goods from PO ${po.poNumber} (${po.supplier?.name || 'Supplier'})`,
              userId: req.user?.id || null
            }
          });

          await tx.purchaseOrderItem.update({
            where: { id: item.id },
            data: { quantityReceived: item.quantityOrdered }
          });
        }
      }

      const updated = await tx.purchaseOrder.update({
        where: { id },
        data: {
          status: 'RECEIVED',
          receivedAt: new Date()
        }
      });

      await tx.notification.create({
        data: {
          title: 'Stock Intake Completed',
          message: `PO ${po.poNumber} from ${po.supplier?.name} received. Stock levels updated for ${po.items.length} items.`,
          type: 'PURCHASE'
        }
      });

      return updated;
    });

    await recordAuditLog({
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'RECEIVE_PURCHASE_ORDER',
      entity: 'PurchaseOrder',
      entityId: id,
      details: `Received all goods for PO ${po.poNumber}. Inventory replenished.`,
      req
    });

    res.json({
      success: true,
      message: `Purchase Order ${po.poNumber} marked as RECEIVED. Stock updated.`,
      data: receivedPO
    });
  } catch (err) {
    console.error('[RECEIVE PO ERROR]', err);
    res.status(500).json({ success: false, error: 'Failed to receive purchase order: ' + err.message });
  }
});

export default router;
