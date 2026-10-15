import express from 'express';
import prisma from '../prisma.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { recordAuditLog } from '../middleware/audit.js';

const router = express.Router();

// GET all products with filtering, searching, and pagination
router.get('/', async (req, res) => {
  try {
    const { search, category, stockFilter, sort = 'name_asc', page = 1, limit = 100 } = req.query;

    const where = {};

    if (search) {
      const q = String(search).trim();
      where.OR = [
        { name: { contains: q } },
        { sku: { contains: q } },
        { barcode: { contains: q } },
        { description: { contains: q } }
      ];
    }

    if (category && category !== 'All' && category !== 'all') {
      where.category = {
        name: { equals: category }
      };
    }

    if (stockFilter === 'low') {
      where.stock = { gt: 0, lte: 5 };
    } else if (stockFilter === 'out') {
      where.stock = { equals: 0 };
    } else if (stockFilter === 'in') {
      where.stock = { gt: 5 };
    }

    let orderBy = { name: 'asc' };
    if (sort === 'name_desc') orderBy = { name: 'desc' };
    if (sort === 'price_asc') orderBy = { sellingPrice: 'asc' };
    if (sort === 'price_desc') orderBy = { sellingPrice: 'desc' };
    if (sort === 'stock_asc') orderBy = { stock: 'asc' };
    if (sort === 'stock_desc') orderBy = { stock: 'desc' };

    const take = parseInt(limit, 10) || 100;
    const skip = ((parseInt(page, 10) || 1) - 1) * take;

    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
          supplier: true
        },
        orderBy,
        skip,
        take
      }),
      prisma.product.count({ where })
    ]);

    // Format products for frontend compatibility
    const formatted = products.map(p => ({
      ...p,
      categoryName: p.category?.name || 'General',
      category: p.category?.name || 'General',
      price: p.sellingPrice,
      isLowStock: p.stock > 0 && p.stock <= p.minStockThreshold,
      isOutOfStock: p.stock === 0
    }));

    res.json({
      success: true,
      data: formatted,
      total: totalCount,
      page: parseInt(page, 10) || 1,
      limit: take
    });
  } catch (err) {
    console.error('[GET PRODUCTS ERROR]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch products catalogue.' });
  }
});

// GET single product by ID, SKU, or Barcode
router.get('/lookup/:query', async (req, res) => {
  try {
    const q = req.params.query.trim();
    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { id: q },
          { barcode: q },
          { sku: q },
          { name: { equals: q } }
        ]
      },
      include: { category: true, supplier: true }
    });

    if (!product) {
      return res.status(404).json({ success: false, error: `Product not found for lookup: ${q}` });
    }

    res.json({
      success: true,
      data: {
        ...product,
        categoryName: product.category?.name || 'General',
        category: product.category?.name || 'General',
        price: product.sellingPrice,
        isLowStock: product.stock > 0 && product.stock <= product.minStockThreshold,
        isOutOfStock: product.stock === 0
      }
    });
  } catch (err) {
    console.error('[LOOKUP PRODUCT ERROR]', err);
    res.status(500).json({ success: false, error: 'Failed to lookup product.' });
  }
});

// POST create product
router.post('/', verifyToken, requireRole('SUPER_ADMIN', 'STORE_MANAGER', 'INVENTORY_MANAGER'), async (req, res) => {
  try {
    const {
      name,
      category: categoryName,
      categoryId,
      sellingPrice,
      purchaseCost,
      stock,
      unit = 'unit',
      taxRate = 0,
      minStockThreshold = 5,
      imageUrl,
      sku,
      barcode,
      description,
      supplierId
    } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, error: 'Product name is required.' });
    }

    const priceNum = parseFloat(sellingPrice);
    const costNum = parseFloat(purchaseCost) || (priceNum * 0.7);
    const stockNum = parseInt(stock, 10);

    if (isNaN(priceNum) || priceNum < 0) {
      return res.status(400).json({ success: false, error: 'Valid selling price (>= 0) is required.' });
    }
    if (isNaN(stockNum) || stockNum < 0) {
      return res.status(400).json({ success: false, error: 'Valid stock quantity (>= 0) is required.' });
    }

    // Resolve category
    let finalCatId = categoryId;
    if (!finalCatId && categoryName) {
      let cat = await prisma.category.findFirst({
        where: { name: { equals: categoryName.trim() } }
      });
      if (!cat) {
        cat = await prisma.category.create({
          data: {
            name: categoryName.trim(),
            slug: categoryName.toLowerCase().replace(/\s+/g, '-')
          }
        });
      }
      finalCatId = cat.id;
    }

    if (!finalCatId) {
      const defaultCat = await prisma.category.findFirst();
      finalCatId = defaultCat ? defaultCat.id : null;
    }

    // Generate SKU / Barcode if not provided
    const cleanSku = (sku && sku.trim() !== '')
      ? sku.trim().toUpperCase()
      : `SKU-${Date.now().toString().slice(-6)}`;
    const cleanBarcode = (barcode && barcode.trim() !== '')
      ? barcode.trim()
      : `890100${Date.now().toString().slice(-7)}`;

    // Check uniqueness
    const existing = await prisma.product.findFirst({
      where: {
        OR: [{ sku: cleanSku }, { barcode: cleanBarcode }]
      }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: `A product with SKU "${cleanSku}" or Barcode "${cleanBarcode}" already exists.`
      });
    }

    // Create product in transaction with movement
    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          name: name.trim(),
          sku: cleanSku,
          barcode: cleanBarcode,
          categoryId: finalCatId,
          supplierId: supplierId || null,
          sellingPrice: priceNum,
          purchaseCost: costNum,
          stock: stockNum,
          unit,
          taxRate: parseFloat(taxRate) || 0,
          minStockThreshold: parseInt(minStockThreshold, 10) || 5,
          imageUrl: imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80',
          description: description || null
        },
        include: { category: true, supplier: true }
      });

      if (stockNum > 0) {
        await tx.inventoryMovement.create({
          data: {
            productId: created.id,
            type: 'PURCHASE',
            quantity: stockNum,
            previousStock: 0,
            newStock: stockNum,
            reason: 'Initial stock intake upon product creation',
            userId: req.user?.id || null
          }
        });
      }

      return created;
    });

    await recordAuditLog({
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'CREATE_PRODUCT',
      entity: 'Product',
      entityId: product.id,
      details: `Added new product "${product.name}" with initial stock ${stockNum} and price ₹${priceNum}`,
      req
    });

    res.status(201).json({
      success: true,
      message: `Product "${product.name}" created successfully.`,
      data: {
        ...product,
        categoryName: product.category?.name || 'General',
        category: product.category?.name || 'General',
        price: product.sellingPrice
      }
    });
  } catch (err) {
    console.error('[CREATE PRODUCT ERROR]', err);
    res.status(500).json({ success: false, error: 'Failed to create product: ' + err.message });
  }
});

// PUT update product
router.put('/:id', verifyToken, requireRole('SUPER_ADMIN', 'STORE_MANAGER', 'INVENTORY_MANAGER'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      category: categoryName,
      categoryId,
      sellingPrice,
      purchaseCost,
      stock,
      unit,
      taxRate,
      minStockThreshold,
      imageUrl,
      sku,
      barcode,
      description,
      supplierId,
      isActive
    } = req.body;

    const existingProduct = await prisma.product.findUnique({
      where: { id }
    });

    if (!existingProduct) {
      return res.status(404).json({ success: false, error: 'Product not found.' });
    }

    let finalCatId = categoryId;
    if (!finalCatId && categoryName) {
      const cat = await prisma.category.findFirst({
        where: { name: { equals: categoryName.trim() } }
      });
      if (cat) finalCatId = cat.id;
    }

    const priceNum = sellingPrice !== undefined ? parseFloat(sellingPrice) : existingProduct.sellingPrice;
    const costNum = purchaseCost !== undefined ? parseFloat(purchaseCost) : existingProduct.purchaseCost;
    const stockNum = stock !== undefined ? parseInt(stock, 10) : existingProduct.stock;
    const oldStock = existingProduct.stock;

    const updated = await prisma.$transaction(async (tx) => {
      const prod = await tx.product.update({
        where: { id },
        data: {
          name: name ? name.trim() : existingProduct.name,
          sku: sku ? sku.trim().toUpperCase() : existingProduct.sku,
          barcode: barcode ? barcode.trim() : existingProduct.barcode,
          categoryId: finalCatId || existingProduct.categoryId,
          supplierId: supplierId !== undefined ? supplierId : existingProduct.supplierId,
          sellingPrice: priceNum,
          purchaseCost: costNum,
          stock: stockNum,
          unit: unit !== undefined ? unit : existingProduct.unit,
          taxRate: taxRate !== undefined ? parseFloat(taxRate) : existingProduct.taxRate,
          minStockThreshold: minStockThreshold !== undefined ? parseInt(minStockThreshold, 10) : existingProduct.minStockThreshold,
          imageUrl: imageUrl !== undefined ? imageUrl : existingProduct.imageUrl,
          description: description !== undefined ? description : existingProduct.description,
          isActive: isActive !== undefined ? Boolean(isActive) : existingProduct.isActive
        },
        include: { category: true, supplier: true }
      });

      // Log movement if stock changed directly
      if (stockNum !== oldStock) {
        const diff = stockNum - oldStock;
        await tx.inventoryMovement.create({
          data: {
            productId: prod.id,
            type: 'ADJUSTMENT',
            quantity: diff,
            previousStock: oldStock,
            newStock: stockNum,
            reason: `Manual inventory adjustment by ${req.user?.name || 'Staff'}`,
            userId: req.user?.id || null
          }
        });
      }

      return prod;
    });

    await recordAuditLog({
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'UPDATE_PRODUCT',
      entity: 'Product',
      entityId: updated.id,
      details: `Updated product "${updated.name}" (Price: ₹${priceNum}, Stock: ${stockNum})`,
      req
    });

    res.json({
      success: true,
      message: `Product "${updated.name}" updated successfully.`,
      data: {
        ...updated,
        categoryName: updated.category?.name || 'General',
        category: updated.category?.name || 'General',
        price: updated.sellingPrice
      }
    });
  } catch (err) {
    console.error('[UPDATE PRODUCT ERROR]', err);
    res.status(500).json({ success: false, error: 'Failed to update product: ' + err.message });
  }
});

// DELETE remove or deactivate product
router.delete('/:id', verifyToken, requireRole('SUPER_ADMIN', 'STORE_MANAGER'), async (req, res) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: { saleItems: true }
    });

    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found.' });
    }

    // If product has sales, deactivate instead of hard delete to preserve sales history
    if (product.saleItems && product.saleItems.length > 0) {
      await prisma.product.update({
        where: { id },
        data: { isActive: false, stock: 0 }
      });
      await recordAuditLog({
        userId: req.user?.id,
        userName: req.user?.name,
        action: 'DEACTIVATE_PRODUCT',
        entity: 'Product',
        entityId: id,
        details: `Deactivated product "${product.name}" because historical sales exist`,
        req
      });
      return res.json({
        success: true,
        message: `Product "${product.name}" has been deactivated to preserve transaction history.`
      });
    }

    // Hard delete if no sales
    await prisma.inventoryMovement.deleteMany({ where: { productId: id } });
    await prisma.product.delete({ where: { id } });

    await recordAuditLog({
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'DELETE_PRODUCT',
      entity: 'Product',
      entityId: id,
      details: `Deleted product "${product.name}"`,
      req
    });

    res.json({
      success: true,
      message: `Product "${product.name}" deleted successfully.`
    });
  } catch (err) {
    console.error('[DELETE PRODUCT ERROR]', err);
    res.status(500).json({ success: false, error: 'Failed to delete product: ' + err.message });
  }
});

export default router;
