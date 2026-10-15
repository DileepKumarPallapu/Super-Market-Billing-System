import express from 'express';
import prisma from '../prisma.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { recordAuditLog } from '../middleware/audit.js';
import { round2 } from '../utils/calculations.js';

const router = express.Router();

// GET current active shift
router.get('/current', verifyToken, async (req, res) => {
  try {
    const shift = await prisma.cashierShift.findFirst({
      where: {
        cashierId: req.user?.id,
        status: 'OPEN'
      },
      orderBy: { openedAt: 'desc' }
    });

    res.json({ success: true, data: shift || null });
  } catch (err) {
    console.error('[GET CURRENT SHIFT ERROR]', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve current shift.' });
  }
});

// GET all shifts history
router.get('/', verifyToken, async (req, res) => {
  try {
    const { limit = 30, page = 1 } = req.query;
    const take = parseInt(limit, 10) || 30;
    const skip = ((parseInt(page, 10) || 1) - 1) * take;

    const [shifts, total] = await Promise.all([
      prisma.cashierShift.findMany({
        orderBy: { openedAt: 'desc' },
        skip,
        take
      }),
      prisma.cashierShift.count()
    ]);

    res.json({
      success: true,
      data: shifts,
      total,
      page: parseInt(page, 10) || 1,
      limit: take
    });
  } catch (err) {
    console.error('[GET SHIFTS ERROR]', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve shifts.' });
  }
});

// POST open a new cashier shift
router.post('/open', verifyToken, async (req, res) => {
  try {
    const { openingCash = 1000, notes } = req.body;
    const cashierId = req.user?.id;
    const cashierName = req.user?.name || 'Cashier-01';

    // Check if already has open shift
    const existing = await prisma.cashierShift.findFirst({
      where: { cashierId, status: 'OPEN' }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: `You already have an open shift (Started ${new Date(existing.openedAt).toLocaleTimeString()}). Please close it before opening a new one.`,
        data: existing
      });
    }

    const shift = await prisma.cashierShift.create({
      data: {
        cashierId,
        cashierName,
        openingCash: round2(parseFloat(openingCash) || 0),
        status: 'OPEN',
        notes: notes || null
      }
    });

    await recordAuditLog({
      userId: cashierId,
      userName: cashierName,
      action: 'OPEN_SHIFT',
      entity: 'CashierShift',
      entityId: shift.id,
      details: `Opened cashier shift with ₹${shift.openingCash} drawer cash`,
      req
    });

    res.status(201).json({
      success: true,
      message: `Shift opened successfully with ₹${shift.openingCash} opening cash.`,
      data: shift
    });
  } catch (err) {
    console.error('[OPEN SHIFT ERROR]', err);
    res.status(500).json({ success: false, error: 'Failed to open shift: ' + err.message });
  }
});

// POST close a cashier shift with cash drawer reconciliation
router.post('/:id/close', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { closingCash, notes } = req.body;

    const shift = await prisma.cashierShift.findUnique({ where: { id } });
    if (!shift) {
      return res.status(404).json({ success: false, error: 'Shift not found.' });
    }
    if (shift.status === 'CLOSED') {
      return res.status(400).json({ success: false, error: 'Shift is already closed.' });
    }

    const closedAt = new Date();

    // Calculate cash sales in this shift interval
    const cashSales = await prisma.sale.aggregate({
      where: {
        cashierId: shift.cashierId,
        paymentMethod: 'CASH',
        createdAt: {
          gte: shift.openedAt,
          lte: closedAt
        }
      },
      _sum: { finalTotal: true }
    });

    // Calculate cash refunds
    const cashRefunds = await prisma.return.aggregate({
      where: {
        cashierId: shift.cashierId,
        paymentMethod: 'CASH',
        createdAt: {
          gte: shift.openedAt,
          lte: closedAt
        }
      },
      _sum: { refundAmount: true }
    });

    const totalCashSales = cashSales._sum.finalTotal || 0;
    const totalCashRefunds = cashRefunds._sum.refundAmount || 0;
    const expectedCash = round2(shift.openingCash + totalCashSales - totalCashRefunds);
    const actualClosingCash = round2(parseFloat(closingCash) || 0);
    const discrepancy = round2(actualClosingCash - expectedCash);

    const closedShift = await prisma.cashierShift.update({
      where: { id },
      data: {
        status: 'CLOSED',
        closedAt,
        closingCash: actualClosingCash,
        expectedCash,
        discrepancy,
        notes: notes ? `${shift.notes ? shift.notes + ' | ' : ''}${notes}` : shift.notes
      }
    });

    await recordAuditLog({
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'CLOSE_SHIFT',
      entity: 'CashierShift',
      entityId: id,
      details: `Shift closed. Expected: ₹${expectedCash}, Actual: ₹${actualClosingCash}, Discrepancy: ₹${discrepancy}`,
      req
    });

    res.json({
      success: true,
      message: `Shift closed successfully. Discrepancy: ₹${discrepancy >= 0 ? '+' : ''}${discrepancy}`,
      data: closedShift
    });
  } catch (err) {
    console.error('[CLOSE SHIFT ERROR]', err);
    res.status(500).json({ success: false, error: 'Failed to close shift: ' + err.message });
  }
});

export default router;
