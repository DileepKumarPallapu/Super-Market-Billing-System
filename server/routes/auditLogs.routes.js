import express from 'express';
import prisma from '../prisma.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// GET audit logs (Admin/Manager)
router.get('/', verifyToken, requireRole('SUPER_ADMIN', 'STORE_MANAGER'), async (req, res) => {
  try {
    const { action, entity, limit = 50, page = 1 } = req.query;
    const where = {};

    if (action && action !== 'All') where.action = action;
    if (entity && entity !== 'All') where.entity = entity;

    const take = parseInt(limit, 10) || 50;
    const skip = ((parseInt(page, 10) || 1) - 1) * take;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      prisma.auditLog.count({ where })
    ]);

    res.json({
      success: true,
      data: logs,
      total,
      page: parseInt(page, 10) || 1,
      limit: take
    });
  } catch (err) {
    console.error('[GET AUDIT LOGS ERROR]', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve audit trail.' });
  }
});

export default router;
