import express from 'express';
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from '../prisma.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { recordAuditLog } from '../middleware/audit.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// GET store settings
router.get('/', async (req, res) => {
  try {
    let settings = await prisma.storeSetting.findUnique({
      where: { id: 'default' }
    });

    if (!settings) {
      settings = await prisma.storeSetting.create({
        data: {
          id: 'default',
          storeName: 'ORBIT MARKET — Intelligent Retail Studio',
          tagline: 'Curated Groceries & Household Essentials',
          address: '77 Commerce Boulevard, Metro Plaza, Suite 400',
          phone: '+91 98765 43210',
          email: 'hello@orbitmarket.com',
          gstin: '29ABCDE1234F1Z5',
          fssai: '11223344556677',
          currency: 'INR (₹)',
          defaultTaxRate: 0,
          defaultLowStockThreshold: 5,
          cashierName: 'Cashier-01 (Pallapu Dileep Kumar)',
          receiptFooter: 'Thank you for shopping at ORBIT MARKET! Experience Intelligent Retail.'
        }
      });
    }

    res.json({ success: true, data: settings });
  } catch (err) {
    console.error('[GET SETTINGS ERROR]', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve settings.' });
  }
});

// PUT update store settings
router.put('/', verifyToken, requireRole('SUPER_ADMIN', 'STORE_MANAGER'), async (req, res) => {
  try {
    const {
      storeName,
      tagline,
      address,
      phone,
      email,
      gstin,
      fssai,
      currency,
      defaultTaxRate,
      defaultLowStockThreshold,
      cashierName,
      theme,
      receiptFooter
    } = req.body;

    const updated = await prisma.storeSetting.upsert({
      where: { id: 'default' },
      update: {
        storeName: storeName || undefined,
        tagline: tagline !== undefined ? tagline : undefined,
        address: address !== undefined ? address : undefined,
        phone: phone !== undefined ? phone : undefined,
        email: email !== undefined ? email : undefined,
        gstin: gstin !== undefined ? gstin : undefined,
        fssai: fssai !== undefined ? fssai : undefined,
        currency: currency || undefined,
        defaultTaxRate: defaultTaxRate !== undefined ? parseFloat(defaultTaxRate) : undefined,
        defaultLowStockThreshold: defaultLowStockThreshold !== undefined ? parseInt(defaultLowStockThreshold, 10) : undefined,
        cashierName: cashierName !== undefined ? cashierName : undefined,
        theme: theme || undefined,
        receiptFooter: receiptFooter !== undefined ? receiptFooter : undefined
      },
      create: {
        id: 'default',
        storeName: storeName || 'ORBIT MARKET — Intelligent Retail Studio',
        tagline: tagline || 'Curated Groceries & Household Essentials',
        address: address || '77 Commerce Boulevard, Metro Plaza, Suite 400',
        phone: phone || '+91 98765 43210',
        email: email || 'hello@orbitmarket.com',
        gstin: gstin || '29ABCDE1234F1Z5',
        fssai: fssai || '11223344556677',
        currency: currency || 'INR (₹)',
        defaultTaxRate: parseFloat(defaultTaxRate) || 0,
        defaultLowStockThreshold: parseInt(defaultLowStockThreshold, 10) || 5,
        cashierName: cashierName || 'Cashier-01 (Pallapu Dileep Kumar)',
        theme: theme || 'light',
        receiptFooter: receiptFooter || 'Thank you for shopping at ORBIT MARKET! Experience Intelligent Retail.'
      }
    });

    await recordAuditLog({
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'UPDATE_SETTINGS',
      entity: 'StoreSetting',
      entityId: 'default',
      details: `Updated store configuration profile`,
      req
    });

    res.json({
      success: true,
      message: 'Store settings updated successfully.',
      data: updated
    });
  } catch (err) {
    console.error('[UPDATE SETTINGS ERROR]', err);
    res.status(500).json({ success: false, error: 'Failed to update settings.' });
  }
});

// POST reset demo database to clean seeded baseline
router.post('/reset-demo', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const rootDir = path.resolve(__dirname, '../../');
    const seedScriptPath = path.join(rootDir, 'prisma/seed.js');

    exec(`node "${seedScriptPath}"`, (error, stdout, stderr) => {
      if (error) {
        console.error('[RESET DEMO EXEC ERROR]', error, stderr);
        return res.status(500).json({ success: false, error: 'Database reset failed: ' + error.message });
      }

      console.log('[RESET DEMO STDOUT]', stdout);
      res.json({
        success: true,
        message: 'Demo database has been successfully reset to initial pristine state.'
      });
    });
  } catch (err) {
    console.error('[RESET DEMO ERROR]', err);
    res.status(500).json({ success: false, error: 'Failed to reset demo: ' + err.message });
  }
});

export default router;
