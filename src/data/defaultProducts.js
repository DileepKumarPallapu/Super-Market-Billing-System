import { SUPERMARKET_CATALOGUE } from './productCatalogueData.js';
import { VERIFIED_PRODUCT_ASSETS } from './productAssets.js';

// Format 155 products for state management & backwards compatibility
export const DEFAULT_PRODUCTS = SUPERMARKET_CATALOGUE.map(p => {
  const asset = VERIFIED_PRODUCT_ASSETS[p.id];
  return {
    id: p.id,
    sku: p.sku,
    barcode: p.barcode,
    name: p.name,
    category: p.category,
    unit: p.unit,
    price: p.price,
    sellingPrice: p.price,
    cost: p.cost,
    purchaseCost: p.cost,
    stock: p.stock,
    lowStockThreshold: p.threshold,
    minStockThreshold: p.threshold,
    description: p.desc,
    emoji: p.icon,
    icon: p.icon,
    image: asset?.image || null,
    imageUrl: asset?.image || null,
    imageType: 'illustration',
    imageVerified: true,
    soldCount: 0,
    isActive: true,
    createdAt: new Date().toISOString()
  };
});

// Category list extracted from the 155 products
export const DEFAULT_CATEGORIES = [
  'All',
  ...Array.from(new Set(SUPERMARKET_CATALOGUE.map(p => p.category)))
];

export const PRODUCT_CATEGORIES = DEFAULT_CATEGORIES;

export const DEFAULT_SETTINGS = {
  storeName: 'ORBIT MARKET',
  storeTagline: 'Intelligent Retail Studio',
  storeAddress: 'Hub 4, Orbit Avenue, Tech Retail Park, City - 560001',
  storePhone: '+91 98765 43210',
  storeEmail: 'studio@orbitmarket.com',
  gstin: '29ABCDE1234F1Z5',
  fssai: '11223344556677',
  currency: 'INR (₹)',
  defaultTaxRate: 0,
  defaultLowStockThreshold: 5,
  cashierName: 'Cashier-01 (Sunita Sharma)',
  managerPin: '1234',
  theme: 'light',
  receiptFooter: 'Thank you for shopping at ORBIT MARKET! Experience Intelligent Retail.'
};

export const DEFAULT_CUSTOMERS = [
  { id: 'CUST-001', name: 'Pallapu Dileep Kumar', phone: '9876543210', email: 'dileep@example.com', loyaltyPoints: 120, totalSpent: 12500, orderCount: 6 },
  { id: 'CUST-002', name: 'Priya Sundaram', phone: '9876543211', email: 'priya@example.com', loyaltyPoints: 85, totalSpent: 8400, orderCount: 4 },
  { id: 'CUST-003', name: 'Vikram Malhotra', phone: '9876543212', email: 'vikram@example.com', loyaltyPoints: 210, totalSpent: 21800, orderCount: 9 },
  { id: 'CUST-004', name: 'Ananya Rao', phone: '9876543213', email: 'ananya@example.com', loyaltyPoints: 45, totalSpent: 4200, orderCount: 2 },
  { id: 'CUST-005', name: 'Rohan Mehta', phone: '9876543214', email: 'rohan@example.com', loyaltyPoints: 160, totalSpent: 15900, orderCount: 7 }
];
