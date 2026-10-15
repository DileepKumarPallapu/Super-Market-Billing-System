import express from 'express';
import prisma from '../prisma.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { recordAuditLog } from '../middleware/audit.js';

const router = express.Router();

// GET all suppliers
router.get('/', async (req, res) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      include: {
        _count: {
          select: { products: true, purchaseOrders: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      data: suppliers.map(s => ({
        ...s,
        productsCount: s._count.products,
        purchaseOrdersCount: s._count.purchaseOrders
      }))
    });
  } catch (err) {
    console.error('[GET SUPPLIERS ERROR]', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve suppliers.' });
  }
});

// POST create supplier
router.post('/', verifyToken, requireRole('SUPER_ADMIN', 'STORE_MANAGER', 'INVENTORY_MANAGER'), async (req, res) => {
  try {
    const { name, contactPerson, phone, email, address, gstin, paymentTerms } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, error: 'Supplier company name is required.' });
    }

    const supplier = await prisma.supplier.create({
      data: {
        name: name.trim(),
        contactPerson: contactPerson || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        gstin: gstin || null,
        paymentTerms: paymentTerms || 'Net 30'
      }
    });

    await recordAuditLog({
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'CREATE_SUPPLIER',
      entity: 'Supplier',
      entityId: supplier.id,
      details: `Created supplier ${supplier.name}`,
      req
    });

    res.status(201).json({
      success: true,
      message: `Supplier "${supplier.name}" added successfully.`,
      data: supplier
    });
  } catch (err) {
    console.error('[CREATE SUPPLIER ERROR]', err);
    res.status(500).json({ success: false, error: 'Failed to create supplier: ' + err.message });
  }
});

// PUT update supplier
router.put('/:id', verifyToken, requireRole('SUPER_ADMIN', 'STORE_MANAGER', 'INVENTORY_MANAGER'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, contactPerson, phone, email, address, gstin, paymentTerms, isActive } = req.body;

    const updated = await prisma.supplier.update({
      where: { id },
      data: {
        name: name ? name.trim() : undefined,
        contactPerson,
        phone,
        email,
        address,
        gstin,
        paymentTerms,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined
      }
    });

    await recordAuditLog({
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'UPDATE_SUPPLIER',
      entity: 'Supplier',
      entityId: id,
      details: `Updated supplier ${updated.name}`,
      req
    });

    res.json({
      success: true,
      message: `Supplier "${updated.name}" updated.`,
      data: updated
    });
  } catch (err) {
    console.error('[UPDATE SUPPLIER ERROR]', err);
    res.status(500).json({ success: false, error: 'Failed to update supplier: ' + err.message });
  }
});

export default router;
