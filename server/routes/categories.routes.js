import express from 'express';
import prisma from '../prisma.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// GET all categories with product count
router.get('/', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { products: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      data: categories.map(c => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        imageUrl: c.imageUrl,
        productCount: c._count.products
      }))
    });
  } catch (err) {
    console.error('[GET CATEGORIES ERROR]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch categories.' });
  }
});

// POST create category
router.post('/', verifyToken, requireRole('SUPER_ADMIN', 'STORE_MANAGER'), async (req, res) => {
  try {
    const { name, description, imageUrl } = req.body;
    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, error: 'Category name is required.' });
    }

    const slug = name.trim().toLowerCase().replace(/\s+/g, '-');
    const existing = await prisma.category.findFirst({
      where: {
        OR: [{ name: name.trim() }, { slug }]
      }
    });

    if (existing) {
      return res.status(400).json({ success: false, error: 'A category with this name already exists.' });
    }

    const created = await prisma.category.create({
      data: {
        name: name.trim(),
        slug,
        description: description || null,
        imageUrl: imageUrl || null
      }
    });

    res.status(201).json({
      success: true,
      message: `Category "${created.name}" created.`,
      data: created
    });
  } catch (err) {
    console.error('[CREATE CATEGORY ERROR]', err);
    res.status(500).json({ success: false, error: 'Failed to create category.' });
  }
});

export default router;
