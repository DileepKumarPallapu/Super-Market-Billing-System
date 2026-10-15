import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Route imports
import authRoutes from './routes/auth.routes.js';
import productRoutes from './routes/products.routes.js';
import categoryRoutes from './routes/categories.routes.js';
import inventoryRoutes from './routes/inventory.routes.js';
import salesRoutes from './routes/sales.routes.js';
import returnRoutes from './routes/returns.routes.js';
import couponRoutes from './routes/coupons.routes.js';
import supplierRoutes from './routes/suppliers.routes.js';
import purchaseOrderRoutes from './routes/purchaseOrders.routes.js';
import customerRoutes from './routes/customers.routes.js';
import shiftRoutes from './routes/shifts.routes.js';
import reportRoutes from './routes/reports.routes.js';
import employeeRoutes from './routes/employees.routes.js';
import notificationRoutes from './routes/notifications.routes.js';
import auditLogRoutes from './routes/auditLogs.routes.js';
import settingRoutes from './routes/settings.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging in development
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.originalUrl.startsWith('/api')) {
      console.log(`[${req.method}] ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    system: 'Supermarket Billing & Management System API',
    version: '2.0.0-fullstack',
    timestamp: new Date().toISOString()
  });
});

// Mount modular API routers
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/returns', returnRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/settings', settingRoutes);

// Central 404 handler for undefined API routes
app.use((req, res, next) => {
  if (req.originalUrl.startsWith('/api')) {
    return res.status(404).json({
      success: false,
      error: `API endpoint '${req.method} ${req.originalUrl}' not found.`
    });
  }
  next();
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('[UNCAUGHT SERVER ERROR]', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

// Start listening
const server = app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Supermarket REST API Server live on port ${PORT}`);
  console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`=======================================================`);
});

export default app;
