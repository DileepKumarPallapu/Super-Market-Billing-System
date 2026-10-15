import express from 'express';
import prisma from '../prisma.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// GET notifications
router.get('/', verifyToken, async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    const unreadCount = await prisma.notification.count({
      where: { isRead: false }
    });

    res.json({
      success: true,
      data: notifications,
      unreadCount
    });
  } catch (err) {
    console.error('[GET NOTIFICATIONS ERROR]', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve notifications.' });
  }
});

// PATCH mark single notification as read
router.patch('/:id/read', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await prisma.notification.update({
      where: { id },
      data: { isRead: true }
    });

    res.json({ success: true, data: notification });
  } catch (err) {
    console.error('[MARK READ ERROR]', err);
    res.status(500).json({ success: false, error: 'Failed to update notification.' });
  }
});

// POST mark all as read
router.post('/mark-all-read', verifyToken, async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { isRead: false },
      data: { isRead: true }
    });

    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    console.error('[MARK ALL READ ERROR]', err);
    res.status(500).json({ success: false, error: 'Failed to mark all as read.' });
  }
});

export default router;
