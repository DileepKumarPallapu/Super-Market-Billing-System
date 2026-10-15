import express from 'express';
import prisma from '../prisma.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// GET all customers with search
router.get('/', async (req, res) => {
  try {
    const { search, limit = 50, page = 1 } = req.query;
    const where = {};

    if (search) {
      const q = String(search).trim();
      where.OR = [
        { name: { contains: q } },
        { phone: { contains: q } },
        { email: { contains: q } }
      ];
    }

    const take = parseInt(limit, 10) || 50;
    const skip = ((parseInt(page, 10) || 1) - 1) * take;

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: { totalSpent: 'desc' },
        skip,
        take
      }),
      prisma.customer.count({ where })
    ]);

    res.json({
      success: true,
      data: customers,
      total,
      page: parseInt(page, 10) || 1,
      limit: take
    });
  } catch (err) {
    console.error('[GET CUSTOMERS ERROR]', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve customers.' });
  }
});

// POST create customer
router.post('/', verifyToken, async (req, res) => {
  try {
    const { name, phone, email } = req.body;
    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, error: 'Customer name is required.' });
    }

    const cleanPhone = phone ? phone.trim() : null;
    if (cleanPhone) {
      const existing = await prisma.customer.findFirst({ where: { phone: cleanPhone } });
      if (existing) {
        return res.json({
          success: true,
          message: 'Customer already exists.',
          data: existing
        });
      }
    }

    const customer = await prisma.customer.create({
      data: {
        name: name.trim(),
        phone: cleanPhone,
        email: email ? email.trim() : null
      }
    });

    res.status(201).json({
      success: true,
      message: 'Customer added successfully.',
      data: customer
    });
  } catch (err) {
    console.error('[CREATE CUSTOMER ERROR]', err);
    res.status(500).json({ success: false, error: 'Failed to create customer: ' + err.message });
  }
});

// GET customer by ID with sales
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        sales: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found.' });
    }

    res.json({ success: true, data: customer });
  } catch (err) {
    console.error('[GET CUSTOMER ERROR]', err);
    res.status(500).json({ success: false, error: 'Failed to get customer details.' });
  }
});

export default router;
