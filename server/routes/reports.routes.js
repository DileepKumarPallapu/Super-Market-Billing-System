import express from 'express';
import prisma from '../prisma.js';
import { round2 } from '../utils/calculations.js';

const router = express.Router();

// GET high-level summary KPIs
router.get('/summary', async (req, res) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [allSales, todaySales, monthSales, allSaleItems, totalProducts] = await Promise.all([
      prisma.sale.aggregate({
        _sum: { finalTotal: true, totalUnits: true, discount: true, taxAmount: true },
        _count: { id: true }
      }),
      prisma.sale.aggregate({
        where: { createdAt: { gte: startOfToday } },
        _sum: { finalTotal: true, totalUnits: true },
        _count: { id: true }
      }),
      prisma.sale.aggregate({
        where: { createdAt: { gte: startOfMonth } },
        _sum: { finalTotal: true },
        _count: { id: true }
      }),
      prisma.saleItem.findMany({
        select: { unitPrice: true, purchaseCost: true, quantity: true, totalAmount: true }
      }),
      prisma.product.count({ where: { isActive: true } })
    ]);

    const totalRevenue = round2(allSales._sum.finalTotal || 0);
    const totalTransactions = allSales._count.id || 0;
    const totalUnits = allSales._sum.totalUnits || 0;
    const totalDiscounts = round2(allSales._sum.discount || 0);
    const avgOrderValue = totalTransactions > 0 ? round2(totalRevenue / totalTransactions) : 0;

    // Gross Profit calculation from real items
    let grossProfit = 0;
    let totalCostOfGoodsSold = 0;
    for (const item of allSaleItems) {
      const cost = (item.purchaseCost || 0) * item.quantity;
      totalCostOfGoodsSold += cost;
      grossProfit += (item.totalAmount - cost);
    }
    grossProfit = round2(grossProfit);
    totalCostOfGoodsSold = round2(totalCostOfGoodsSold);

    const grossMarginPercent = totalRevenue > 0 ? round2((grossProfit / totalRevenue) * 100) : 0;

    res.json({
      success: true,
      data: {
        totalRevenue,
        totalTransactions,
        totalUnits,
        totalDiscounts,
        avgOrderValue,
        grossProfit,
        totalCostOfGoodsSold,
        grossMarginPercent,
        totalProducts,
        today: {
          revenue: round2(todaySales._sum.finalTotal || 0),
          transactions: todaySales._count.id || 0,
          units: todaySales._sum.totalUnits || 0
        },
        thisMonth: {
          revenue: round2(monthSales._sum.finalTotal || 0),
          transactions: monthSales._count.id || 0
        }
      }
    });
  } catch (err) {
    console.error('[REPORTS SUMMARY ERROR]', err);
    res.status(500).json({ success: false, error: 'Failed to generate summary metrics.' });
  }
});

// GET historical sales chart data for Recharts (daily breakdown)
router.get('/sales-chart', async (req, res) => {
  try {
    const days = parseInt(req.query.days, 10) || 14;
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    const sales = await prisma.sale.findMany({
      where: { createdAt: { gte: sinceDate } },
      select: { createdAt: true, finalTotal: true, totalUnits: true },
      orderBy: { createdAt: 'asc' }
    });

    const dailyMap = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dailyMap[key] = { date: key, sales: 0, orders: 0, units: 0 };
    }

    for (const s of sales) {
      const key = new Date(s.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (dailyMap[key]) {
        dailyMap[key].sales = round2(dailyMap[key].sales + s.finalTotal);
        dailyMap[key].orders += 1;
        dailyMap[key].units += s.totalUnits;
      }
    }

    res.json({ success: true, data: Object.values(dailyMap) });
  } catch (err) {
    console.error('[REPORTS CHART ERROR]', err);
    res.status(500).json({ success: false, error: 'Failed to generate chart data.' });
  }
});

// GET top selling products
router.get('/top-selling', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const saleItems = await prisma.saleItem.findMany({
      select: {
        productId: true,
        productName: true,
        category: true,
        quantity: true,
        totalAmount: true
      }
    });

    const productMap = {};
    for (const item of saleItems) {
      if (!productMap[item.productId]) {
        productMap[item.productId] = {
          id: item.productId,
          name: item.productName,
          category: item.category || 'General',
          unitsSold: 0,
          revenue: 0
        };
      }
      productMap[item.productId].unitsSold += item.quantity;
      productMap[item.productId].revenue = round2(productMap[item.productId].revenue + item.totalAmount);
    }

    const sorted = Object.values(productMap)
      .sort((a, b) => b.unitsSold - a.unitsSold)
      .slice(0, limit);

    res.json({ success: true, data: sorted });
  } catch (err) {
    console.error('[TOP SELLING ERROR]', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve top selling products.' });
  }
});

// GET category sales distribution
router.get('/category-breakdown', async (req, res) => {
  try {
    const saleItems = await prisma.saleItem.findMany({
      select: { category: true, totalAmount: true, quantity: true }
    });

    const catMap = {};
    for (const item of saleItems) {
      const cat = item.category || 'General';
      if (!catMap[cat]) catMap[cat] = { name: cat, revenue: 0, units: 0 };
      catMap[cat].revenue = round2(catMap[cat].revenue + item.totalAmount);
      catMap[cat].units += item.quantity;
    }

    res.json({ success: true, data: Object.values(catMap) });
  } catch (err) {
    console.error('[CATEGORY BREAKDOWN ERROR]', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve category breakdown.' });
  }
});

// GET payment method distribution
router.get('/payment-methods', async (req, res) => {
  try {
    const sales = await prisma.sale.groupBy({
      by: ['paymentMethod'],
      _sum: { finalTotal: true },
      _count: { id: true }
    });

    res.json({
      success: true,
      data: sales.map(s => ({
        method: s.paymentMethod,
        revenue: round2(s._sum.finalTotal || 0),
        count: s._count.id
      }))
    });
  } catch (err) {
    console.error('[PAYMENT BREAKDOWN ERROR]', err);
    res.status(500).json({ success: false, error: 'Failed to get payment method breakdown.' });
  }
});

export default router;
