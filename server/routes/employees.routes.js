import express from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../prisma.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { recordAuditLog } from '../middleware/audit.js';

const router = express.Router();

// GET all staff members
router.get('/', verifyToken, requireRole('SUPER_ADMIN', 'STORE_MANAGER'), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: { sales: true, shifts: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: users.map(u => ({
        ...u,
        totalSalesProcessed: u._count.sales,
        totalShifts: u._count.shifts
      }))
    });
  } catch (err) {
    console.error('[GET EMPLOYEES ERROR]', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve staff members.' });
  }
});

// POST add new employee
router.post('/', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const { name, email, password, role = 'CASHIER' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Name, email, and password are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existing) {
      return res.status(400).json({ success: false, error: 'An account with this email already exists.' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        passwordHash,
        role: role.toUpperCase()
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });

    await recordAuditLog({
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'CREATE_EMPLOYEE',
      entity: 'User',
      entityId: user.id,
      details: `Created new staff account for ${user.name} (${user.role})`,
      req
    });

    res.status(201).json({
      success: true,
      message: `Staff member "${user.name}" added successfully.`,
      data: user
    });
  } catch (err) {
    console.error('[CREATE EMPLOYEE ERROR]', err);
    res.status(500).json({ success: false, error: 'Failed to create staff account: ' + err.message });
  }
});

// PUT update employee (role, name, active status, password)
router.put('/:id', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, isActive, password } = req.body;

    const dataToUpdate = {};
    if (name) dataToUpdate.name = name.trim();
    if (role) dataToUpdate.role = role.toUpperCase();
    if (isActive !== undefined) dataToUpdate.isActive = Boolean(isActive);
    if (password && password.trim() !== '') {
      dataToUpdate.passwordHash = bcrypt.hashSync(password.trim(), 10);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true
      }
    });

    await recordAuditLog({
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'UPDATE_EMPLOYEE',
      entity: 'User',
      entityId: id,
      details: `Updated staff account for ${updated.name}`,
      req
    });

    res.json({
      success: true,
      message: `Staff member "${updated.name}" updated.`,
      data: updated
    });
  } catch (err) {
    console.error('[UPDATE EMPLOYEE ERROR]', err);
    res.status(500).json({ success: false, error: 'Failed to update employee.' });
  }
});

export default router;
