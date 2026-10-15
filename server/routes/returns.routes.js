import express from 'express';
import prisma from '../prisma.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { recordAuditLog } from '../middleware/audit.js';
import { round2 } from '../utils/calculations.js';

const router = express.Router();

function generateReturnNumber() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `RET-${dateStr}-${randomSuffix}`;
}

// POST process refund/return
router.post('/', verifyToken, requireRole('SUPER_ADMIN', 'STORE_MANAGER', 'CASHIER'), async (req, res) => {
  try {
    const { saleId, invoiceNo, items = [], reason = 'Customer return', paymentMethod = 'CASH' } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Please select items to return.' });
    }

    // Find sale
    const sale = await prisma.sale.findFirst({
      where: {
        OR: [
          saleId ? { id: saleId } : undefined,
          invoiceNo ? { invoiceNo } : undefined
        ].filter(Boolean)
      },
      include: {
        items: true,
        returns: {
          include: { items: true }
        }
      }
    });

    if (!sale) {
      return res.status(404).json({ success: false, error: 'Sale record not found for refund.' });
    }

    // Verify quantities against previous returns
    const previouslyReturnedQty = {};
    for (const ret of sale.returns) {
      for (const retItem of ret.items) {
        previouslyReturnedQty[retItem.productId] = (previouslyReturnedQty[retItem.productId] || 0) + retItem.quantity;
      }
    }

    let calculatedRefundAmount = 0;
    const validatedReturnItems = [];

    for (const item of items) {
      const saleItem = sale.items.find(si => si.productId === item.productId || si.id === item.saleItemId);
      if (!saleItem) {
        return res.status(400).json({
          success: false,
          error: `Item "${item.productName || item.productId}" was not part of original sale ${sale.invoiceNo}.`
        });
      }

      const returnQty = parseInt(item.quantity, 10);
      if (isNaN(returnQty) || returnQty <= 0) {
        return res.status(400).json({ success: false, error: `Invalid return quantity for ${saleItem.productName}.` });
      }

      const alreadyReturned = previouslyReturnedQty[saleItem.productId] || 0;
      const remainingAvailableToReturn = saleItem.quantity - alreadyReturned;

      if (returnQty > remainingAvailableToReturn) {
        return res.status(400).json({
          success: false,
          error: `Cannot return ${returnQty} units of ${saleItem.productName}. Only ${remainingAvailableToReturn} unit(s) eligible.`
        });
      }

      // Unit refund amount after itemized discount
      const itemUnitPrice = round2(saleItem.totalAmount / saleItem.quantity);
      const lineRefund = round2(itemUnitPrice * returnQty);
      calculatedRefundAmount = round2(calculatedRefundAmount + lineRefund);

      validatedReturnItems.push({
        saleItemId: saleItem.id,
        productId: saleItem.productId,
        productName: saleItem.productName,
        quantity: returnQty,
        unitPrice: itemUnitPrice,
        refundAmount: lineRefund,
        condition: item.condition === 'DAMAGED' ? 'DAMAGED' : 'RESTOCKABLE'
      });
    }

    // Execute return transaction
    const returnResult = await prisma.$transaction(async (tx) => {
      const returnNo = generateReturnNumber();

      const createdReturn = await tx.return.create({
        data: {
          returnNo,
          saleId: sale.id,
          cashierId: req.user?.id || null,
          customerId: sale.customerId || null,
          refundAmount: calculatedRefundAmount,
          paymentMethod: paymentMethod.toUpperCase(),
          reason: reason.trim()
        }
      });

      for (const item of validatedReturnItems) {
        await tx.returnItem.create({
          data: {
            returnId: createdReturn.id,
            saleItemId: item.saleItemId,
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            refundAmount: item.refundAmount,
            condition: item.condition
          }
        });

        // Restock if restockable
        if (item.condition === 'RESTOCKABLE') {
          const product = await tx.product.findUnique({ where: { id: item.productId } });
          const oldStock = product.stock;
          const newStock = oldStock + item.quantity;

          await tx.product.update({
            where: { id: item.productId },
            data: { stock: newStock }
          });

          await tx.inventoryMovement.create({
            data: {
              productId: item.productId,
              type: 'RETURN',
              quantity: item.quantity,
              previousStock: oldStock,
              newStock,
              reason: `Returned & restocked from sale ${sale.invoiceNo} (Return ${returnNo})`,
              userId: req.user?.id || null
            }
          });
        }
      }

      // Calculate if fully refunded or partially
      const totalOriginalSold = sale.items.reduce((sum, i) => sum + i.quantity, 0);
      const totalReturnedNow = Object.values(previouslyReturnedQty).reduce((a, b) => a + b, 0) +
        validatedReturnItems.reduce((sum, i) => sum + i.quantity, 0);

      const newPaymentStatus = totalReturnedNow >= totalOriginalSold ? 'REFUNDED' : 'PARTIALLY_REFUNDED';

      await tx.sale.update({
        where: { id: sale.id },
        data: { paymentStatus: newPaymentStatus }
      });

      return createdReturn;
    });

    await recordAuditLog({
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'PROCESS_RETURN',
      entity: 'Return',
      entityId: returnResult.id,
      details: `Processed return ${returnResult.returnNo} for ₹${calculatedRefundAmount} against sale ${sale.invoiceNo}`,
      req
    });

    res.status(201).json({
      success: true,
      message: `Return ${returnResult.returnNo} processed. Refund amount: ₹${calculatedRefundAmount.toFixed(2)}`,
      data: {
        ...returnResult,
        items: validatedReturnItems
      }
    });
  } catch (err) {
    console.error('[PROCESS RETURN ERROR]', err);
    res.status(500).json({ success: false, error: 'Failed to process return: ' + err.message });
  }
});

// GET returns history
router.get('/', async (req, res) => {
  try {
    const { limit = 50, page = 1 } = req.query;
    const take = parseInt(limit, 10) || 50;
    const skip = ((parseInt(page, 10) || 1) - 1) * take;

    const [returns, total] = await Promise.all([
      prisma.return.findMany({
        include: {
          items: true,
          sale: {
            select: { invoiceNo: true, createdAt: true, finalTotal: true }
          },
          customer: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      prisma.return.count()
    ]);

    res.json({
      success: true,
      data: returns,
      total,
      page: parseInt(page, 10) || 1,
      limit: take
    });
  } catch (err) {
    console.error('[GET RETURNS ERROR]', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve returns history.' });
  }
});

export default router;
