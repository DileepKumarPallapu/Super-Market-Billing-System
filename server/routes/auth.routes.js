import express from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../prisma.js';
import { signToken, verifyToken } from '../middleware/auth.js';
import { recordAuditLog } from '../middleware/audit.js';

const router = express.Router();

// List demo credentials for college presentation quick login
router.get('/demo-accounts', (req, res) => {
  res.json({
    success: true,
    data: [
      { role: 'SUPER_ADMIN', email: 'admin@orbitmarket.com', name: 'Pallapu Dileep Kumar', passwordHint: 'Admin@123' },
      { role: 'STORE_MANAGER', email: 'manager@orbitmarket.com', name: 'Rajesh Verma', passwordHint: 'Manager@123' },
      { role: 'CASHIER', email: 'cashier@orbitmarket.com', name: 'Sunita Sharma', passwordHint: 'Cashier@123' },
      { role: 'INVENTORY_MANAGER', email: 'inventory@orbitmarket.com', name: 'Arjun Das', passwordHint: 'Inventory@123' },
      { role: 'ACCOUNTANT', email: 'accountant@orbitmarket.com', name: 'Meera Iyer', passwordHint: 'Accountant@123' }
    ]
  });
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide both email and password.'
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: String(email).toLowerCase().trim() }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials. User not found.'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Account deactivated. Please contact the administrator.'
      });
    }

    const isMatch = bcrypt.compareSync(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid password. Please check your credentials.'
      });
    }

    const token = signToken(user);

    await recordAuditLog({
      userId: user.id,
      userName: user.name,
      action: 'LOGIN',
      entity: 'User',
      entityId: user.id,
      details: `User logged in with role ${user.role}`,
      req
    });

    res.json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('[AUTH LOGIN ERROR]', err);
    res.status(500).json({
      success: false,
      error: 'An unexpected authentication error occurred.'
    });
  }
});

// Get current authenticated user
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, error: 'User session invalid.' });
    }

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Logout
router.post('/logout', verifyToken, async (req, res) => {
  await recordAuditLog({
    userId: req.user.id,
    userName: req.user.name,
    action: 'LOGOUT',
    entity: 'User',
    entityId: req.user.id,
    details: 'User logged out',
    req
  });
  res.json({ success: true, message: 'Logged out successfully.' });
});

export default router;
