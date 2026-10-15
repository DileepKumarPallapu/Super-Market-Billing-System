# ORBIT MARKET — Intelligent Retail Studio & Point-of-Sale System
## Super Market Billing System

A production-grade, full-stack Supermarket Billing, ERP, and Point of Sale (POS) platform built with **React 18**, **Vite 6**, **Node.js & Express REST API**, **SQLite Database with Prisma ORM**, **Lucide Icons**, and **Recharts Business Intelligence**.

---

### 👨‍💻 Developer & Academic Information

- **Developer**: Pallapu Dileep Kumar
- **Department**: Department of Computer Science and Engineering
- **Institution**: Vel Tech Rangarajan Dr. Sagunthala R&D Institute of Science and Technology
- **Academic Year**: 2026–2027
- **LinkedIn Profile**: [linkedin.com/in/dileep-kumar-pallapu-16a003253](https://www.linkedin.com/in/dileep-kumar-pallapu-16a003253)
- **GitHub Profile**: [github.com/DileepKumarPallapu](https://github.com/DileepKumarPallapu)
- **GitHub Repository**: [github.com/DileepKumarPallapu/Super-Market-Billing-System](https://github.com/DileepKumarPallapu/Super-Market-Billing-System)

---

## 🌟 Key System Capabilities

1. **Editorial Visual Identity (ORBIT MARKET)**:
   - Warm Porcelain (`#F7F4EF`) foundation with crisp Pure White (`#FFFFFF`) card surfaces.
   - Deep Aubergine (`#4B2142`), Burnt Coral (`#E76F51`), and Golden Saffron (`#E9B44C`) brand accents.
   - Fully responsive across desktop (1440px), laptop (1280px), tablet (768px), and mobile (390px) with off-canvas navigation drawer.
2. **Expanded 155-Item Supermarket Catalogue**:
   - 155 distinct supermarket products categorized across 30 departments.
   - Zero broken image guarantee with pure vector SVG data URIs and strict aspect-ratio preservation.
   - Baseline pricing preserved: Rice (₹500), Sugar (₹60), Milk (₹30), and Bread (₹40).
3. **Role-Based Access Control (RBAC)**:
   - 5 Distinct Roles: Super Admin, Store Manager, Cashier, Inventory Manager, Accountant.
   - One-click role switcher pill in top navigation with JWT authentication.
4. **Authoritative Server-Side Transactional Checkout**:
   - Atomic database transactions with Prisma `$transaction`.
   - Real-time stock validation, locking, and single-execution stock decrement upon checkout.
   - Instant calculation engine for `SAVE10` (10% off), manual manager discounts, GST, and cash change return.
5. **Enterprise ERP Modules**:
   - **Point of Sale (POS)**: Barcode scanning, multi-item cart, bill hold/resume, cash/UPI/card/split payment modes.
   - **Inventory Management**: Stock valuation at cost & retail, minimum threshold alerts, out-of-stock badges.
   - **Inventory Movement Ledger**: Immutable audit log of every stock intake, sale, return, and manual adjustment.
   - **Suppliers & Vendors**: Wholesale directory with contact person, phone, email, address, and GSTIN.
   - **Purchase Orders & Stock Intake**: Issue POs to suppliers and click "Receive Goods" to automatically replenish warehouse stock.
   - **Cashier Shift Register**: Drawer float tracking, cash sales aggregation, and end-of-shift cash discrepancy reconciliation.
   - **Returns & Refunds**: Itemized return processing with restockable verification and customer refunds.
   - **Analytics & BI**: Gross profit margin, Average Order Value (AOV), daily sales Recharts, and top-selling products.
   - **System Audit Trail**: Complete security compliance log recording all operator events with timestamps.
   - **Itemized Tax Invoices**: Print-ready CSS and PDF receipt generation.

---

## 🔑 Demo Role Accounts & Credentials

| Role | Name | Email | Password | Primary Permissions |
|---|---|---|---|---|
| **Super Admin** | Pallapu Dileep Kumar | `admin@orbitmarket.com` | `Admin@123` | Full system access, staff creation, database reset |
| **Store Manager** | Rajesh Verma | `manager@orbitmarket.com` | `Manager@123` | Product catalog, supplier management, discount overrides |
| **Cashier** | Sunita Sharma | `cashier@orbitmarket.com` | `Cashier@123` | POS checkout, shift drawer management, customer returns |
| **Inventory Manager** | Arjun Das | `inventory@orbitmarket.com` | `Inventory@123` | Stock valuation, purchase orders, receiving goods |
| **Accountant** | Meera Iyer | `accountant@orbitmarket.com` | `Accountant@123` | Sales reports, gross profit margins, audit trail |

---

## 🚀 Quick Start Guide

### 1. Start the Express REST API Backend
```bash
# In project root:
node server/index.js
```
*API live on:* **http://localhost:5001** (Health check: `http://localhost:5001/api/health`)

### 2. Start the Vite Frontend Server
```bash
# In a second terminal (or npm run dev):
npm run dev
```
*Web App live on:* **http://localhost:5173** (Vite automatically proxies `/api` requests to port `5001`).

### 3. Run Automated Full-Stack Verification Suite
```bash
node verify_fullstack.mjs
```
Runs 45 automated assertions verifying server health, JWT auth, database CRUD, stock deduction, PO receiving, returns restock, and the mandatory acceptance test.

### 4. Build Production Bundle
```bash
npm run build
```

---

## 🛒 Mandatory Acceptance Test Baseline

- **Rice**: ₹500 (Stock: 10)
- **Sugar**: ₹60 (Stock: 20)
- **Milk**: ₹30 (Stock: 15)
- **Bread**: ₹40 (Stock: 25)

**Acceptance Calculation**:
- Add Rice × 2 (₹1,000) + Sugar × 1 (₹60) = Subtotal **₹1,060**
- Apply Coupon `SAVE10` = Discount **₹106**
- Final Total = **₹954**
- Cash Tendered = **₹1,000** $\to$ Change Returned = **₹46**

---

## 🗄️ Database Architecture (SQLite + Prisma ORM)

Located at `prisma/dev.db` with 17 normalized relational models:
- `User`: Operator accounts, passwords (bcrypt), and roles.
- `Product`: SKUs, barcodes, pricing, purchase costs, current stock, and thresholds.
- `Category`: Supermarket product categories.
- `Supplier`: Wholesale vendors and payment terms.
- `PurchaseOrder` & `PurchaseOrderItem`: Procurement and intake shipments.
- `Sale` & `SaleItem`: Invoices, subtotal, discount breakdown, taxes, and payment references.
- `Return` & `ReturnItem`: Customer refunds and restocked items.
- `InventoryMovement`: Stock intake, sale, return, and adjustment audit ledger.
- `CashierShift`: Shift drawer register and cash reconciliation records.
- `Notification`: Real-time low-stock, out-of-stock, and intake alerts.
- `AuditLog`: Security and operator event audit trail.
- `StoreSetting`: Store profile, GSTIN, and receipts footer.

---

## 📡 REST API Endpoints Overview

- `POST /api/auth/login` — Authenticate and receive JWT token
- `GET /api/auth/demo-accounts` — List demo role profiles
- `GET /api/products` — Product catalogue search, category & stock filters
- `POST /api/products` — Create product (Admin / Manager)
- `PUT /api/products/:id` — Update product details or stock
- `DELETE /api/products/:id` — Remove or deactivate product
- `POST /api/sales/checkout` — Atomic transactional sale checkout & stock deduction
- `GET /api/sales` — Search sales records & reprint invoices
- `POST /api/returns` — Process return and restock inventory
- `POST /api/coupons/validate` — Validate promo code against subtotal
- `GET /api/suppliers` & `POST /api/suppliers` — Supplier directory
- `GET /api/purchase-orders` & `POST /api/purchase-orders` — Procurement orders
- `POST /api/purchase-orders/:id/receive` — Receive goods & auto-replenish stock
- `POST /api/shifts/open` & `POST /api/shifts/:id/close` — Cashier shifts
- `GET /api/reports/summary` & `/sales-chart` — Financial KPIs & Recharts data
- `GET /api/audit-logs` — Immutable compliance history
- `POST /api/settings/reset-demo` — Reset database to pristine seeded state

---

## 📄 License & Attribution

Developed by **Pallapu Dileep Kumar** for the academic year 2026–2027 at **Vel Tech Rangarajan Dr. Sagunthala R&D Institute of Science and Technology**. All rights reserved.
