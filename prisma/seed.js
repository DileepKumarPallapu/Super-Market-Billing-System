import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { SUPERMARKET_CATALOGUE } from '../src/data/productCatalogueData.js';
import { VERIFIED_PRODUCT_ASSETS } from '../src/data/productAssets.js';

const prisma = new PrismaClient();

async function main() {
  console.log('[SEED] Starting ORBIT MARKET database seeding (155 products)...');

  // 1. Store Settings
  console.log('[SEED] Upserting ORBIT MARKET store profile...');
  await prisma.storeSetting.upsert({
    where: { id: 'default' },
    update: {
      storeName: 'ORBIT MARKET',
      tagline: 'Intelligent Retail Studio',
      address: 'Hub 4, Orbit Avenue, Tech Retail Park, City - 560001',
      phone: '+91 98765 43210',
      email: 'studio@orbitmarket.com',
      gstin: '29ABCDE1234F1Z5',
      fssai: '11223344556677',
      currency: 'INR (₹)',
      defaultTaxRate: 0,
      defaultLowStockThreshold: 5,
      cashierName: 'Cashier-01 (Sunita Sharma)',
      managerPin: '1234',
      theme: 'light',
      receiptFooter: 'Thank you for shopping at ORBIT MARKET! Experience Intelligent Retail.'
    },
    create: {
      id: 'default',
      storeName: 'ORBIT MARKET',
      tagline: 'Intelligent Retail Studio',
      address: 'Hub 4, Orbit Avenue, Tech Retail Park, City - 560001',
      phone: '+91 98765 43210',
      email: 'studio@orbitmarket.com',
      gstin: '29ABCDE1234F1Z5',
      fssai: '11223344556677',
      currency: 'INR (₹)',
      defaultTaxRate: 0,
      defaultLowStockThreshold: 5,
      cashierName: 'Cashier-01 (Sunita Sharma)',
      managerPin: '1234',
      theme: 'light',
      receiptFooter: 'Thank you for shopping at ORBIT MARKET! Experience Intelligent Retail.'
    }
  });

  // 2. Users (5 Roles)
  console.log('[SEED] Seeding user accounts across roles...');
  const users = [
    { name: 'Pallapu Dileep Kumar (Super Admin)', email: 'admin@orbitmarket.com', password: 'Admin@123', role: 'SUPER_ADMIN' },
    { name: 'Rajesh Verma (Store Manager)', email: 'manager@orbitmarket.com', password: 'Manager@123', role: 'STORE_MANAGER' },
    { name: 'Sunita Sharma (Head Cashier)', email: 'cashier@orbitmarket.com', password: 'Cashier@123', role: 'CASHIER' },
    { name: 'Arjun Das (Inventory Manager)', email: 'inventory@orbitmarket.com', password: 'Inventory@123', role: 'INVENTORY_MANAGER' },
    { name: 'Meera Iyer (Accountant)', email: 'accountant@orbitmarket.com', password: 'Accountant@123', role: 'ACCOUNTANT' }
  ];

  const createdUsers = {};
  for (const u of users) {
    const passwordHash = bcrypt.hashSync(u.password, 10);
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, passwordHash },
      create: {
        name: u.name,
        email: u.email,
        passwordHash,
        role: u.role,
        isActive: true
      }
    });
    createdUsers[u.role] = user;
  }

  // 3. 30 Categories
  console.log('[SEED] Seeding 30 distinct categories...');
  const categoryNames = Array.from(new Set(SUPERMARKET_CATALOGUE.map(p => p.category)));
  const createdCategories = {};
  for (const name of categoryNames) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const cat = await prisma.category.upsert({
      where: { name },
      update: {},
      create: {
        name,
        slug,
        description: `Fresh retail products in ${name}`
      }
    });
    createdCategories[name] = cat;
  }

  // 4. Suppliers
  console.log('[SEED] Seeding wholesale suppliers...');
  const suppliersData = [
    { name: 'Apex Agro & Grains Ltd.', contactPerson: 'Anand Murthy', phone: '+91 98450 11223', email: 'anand@apexagro.com', address: 'APMC Yard, Gate 2, City', gstin: '29AAAAA0000A1Z5', paymentTerms: 'Net 30' },
    { name: 'Heritage Dairy & Fresh Produce', contactPerson: 'Geetha Raman', phone: '+91 98450 22334', email: 'orders@heritagedairy.com', address: 'Dairy Circle, Industrial Area, City', gstin: '29BBBBB1111B1Z4', paymentTerms: 'Net 15' },
    { name: 'Royal Spices & Condiments', contactPerson: 'Kishore Patel', phone: '+91 98450 33445', email: 'kishore@royalspices.com', address: 'Spice Market, Ward 4, City', gstin: '29CCCCC2222C1Z3', paymentTerms: 'Net 30' },
    { name: 'Hindustan Consumer Goods Co.', contactPerson: 'Suresh Nair', phone: '+91 98450 44556', email: 'suresh@hcgwholesale.com', address: 'Wholesale Depot, Ring Road, City', gstin: '29DDDDD3333D1Z2', paymentTerms: 'Net 45' },
    { name: 'Nature Choice Fresh Farms', contactPerson: 'Mohammed Farooq', phone: '+91 98450 55667', email: 'farooq@naturechoice.com', address: 'Farm Market Yard, North Highway, City', gstin: '29EEEEE4444E1Z1', paymentTerms: 'Immediate' }
  ];

  const createdSuppliers = [];
  for (const s of suppliersData) {
    let supplier = await prisma.supplier.findFirst({ where: { name: s.name } });
    if (!supplier) {
      supplier = await prisma.supplier.create({ data: s });
    }
    createdSuppliers.push(supplier);
  }

  // 5. 155 Supermarket Products
  console.log(`[SEED] Upserting ${SUPERMARKET_CATALOGUE.length} distinct supermarket products with verified SVG illustrations...`);
  for (let i = 0; i < SUPERMARKET_CATALOGUE.length; i++) {
    const p = SUPERMARKET_CATALOGUE[i];
    const cat = createdCategories[p.category];
    const sup = createdSuppliers[i % createdSuppliers.length];
    const asset = VERIFIED_PRODUCT_ASSETS[p.id];

    await prisma.product.upsert({
      where: { sku: p.sku },
      update: {
        name: p.name,
        barcode: p.barcode,
        categoryId: cat ? cat.id : undefined,
        supplierId: sup ? sup.id : undefined,
        unit: p.unit,
        sellingPrice: p.price,
        purchaseCost: p.cost,
        stock: p.stock,
        minStockThreshold: p.threshold,
        imageUrl: asset?.image || null,
        description: p.desc,
        isActive: true
      },
      create: {
        id: p.id,
        sku: p.sku,
        barcode: p.barcode,
        name: p.name,
        categoryId: cat.id,
        supplierId: sup.id,
        unit: p.unit,
        sellingPrice: p.price,
        purchaseCost: p.cost,
        stock: p.stock,
        minStockThreshold: p.threshold,
        imageUrl: asset?.image || null,
        description: p.desc,
        isActive: true
      }
    });
  }

  // 6. Promotions
  console.log('[SEED] Seeding promotions...');
  await prisma.promotion.upsert({
    where: { code: 'SAVE10' },
    update: { value: 10, type: 'PERCENTAGE', isActive: true },
    create: {
      code: 'SAVE10',
      description: '10% discount on entire bill',
      type: 'PERCENTAGE',
      value: 10,
      minOrderAmount: 0,
      isActive: true
    }
  });

  await prisma.promotion.upsert({
    where: { code: 'FLAT50' },
    update: {},
    create: {
      code: 'FLAT50',
      description: 'Flat ₹50 discount on orders above ₹500',
      type: 'FIXED',
      value: 50,
      minOrderAmount: 500,
      isActive: true
    }
  });

  // 7. Customers
  console.log('[SEED] Seeding customers...');
  const customersData = [
    { name: 'Pallapu Dileep Kumar', phone: '9876543210', email: 'dileep@example.com', loyaltyPoints: 120, totalSpent: 12500, orderCount: 6 },
    { name: 'Priya Sundaram', phone: '9876543211', email: 'priya@example.com', loyaltyPoints: 85, totalSpent: 8400, orderCount: 4 },
    { name: 'Vikram Malhotra', phone: '9876543212', email: 'vikram@example.com', loyaltyPoints: 210, totalSpent: 21800, orderCount: 9 },
    { name: 'Ananya Rao', phone: '9876543213', email: 'ananya@example.com', loyaltyPoints: 45, totalSpent: 4200, orderCount: 2 }
  ];

  for (const c of customersData) {
    const existing = await prisma.customer.findFirst({ where: { phone: c.phone } });
    if (!existing) {
      await prisma.customer.create({ data: c });
    }
  }

  // 8. Open Cashier Shift
  const cashier = createdUsers.CASHIER;
  const activeShift = await prisma.cashierShift.findFirst({
    where: { cashierId: cashier.id, status: 'OPEN' }
  });
  if (!activeShift) {
    await prisma.cashierShift.create({
      data: {
        cashierId: cashier.id,
        cashierName: cashier.name,
        openingCash: 1000,
        status: 'OPEN',
        notes: 'Initial morning operational shift'
      }
    });
  }

  // 9. Initial Audit Log
  await prisma.auditLog.create({
    data: {
      userId: createdUsers.SUPER_ADMIN.id,
      userName: createdUsers.SUPER_ADMIN.name,
      action: 'SYSTEM_SEED',
      entity: 'Database',
      details: 'ORBIT MARKET database initialized with 155 products, 30 categories, and 5 RBAC roles.'
    }
  });

  console.log('[SEED] Seeding completed successfully! 155 products active.');
}

main()
  .catch((e) => {
    console.error('[SEED ERROR]', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
