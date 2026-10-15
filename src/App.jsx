import React, { useState } from 'react';
import { POSProvider, usePOS } from './context/POSContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Footer from './components/Footer';
import Toast from './components/Toast';

import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import BillingCounter from './pages/BillingCounter';
import Inventory from './pages/Inventory';
import SalesReports from './pages/SalesReports';
import TransactionHistory from './pages/TransactionHistory';
import Settings from './pages/Settings';
import InvoiceView from './pages/InvoiceView';
import Suppliers from './pages/Suppliers';
import PurchaseOrders from './pages/PurchaseOrders';
import CashierShifts from './pages/CashierShifts';
import AuditTrail from './pages/AuditTrail';

function MainApp() {
  const { activeTab } = usePOS();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="app-layout">
      {/* Mobile Drawer Overlay Backdrop */}
      {mobileSidebarOpen && (
        <div
          className="sidebar-backdrop active"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      <Sidebar
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />
      <div className="main-wrapper">
        <Header onToggleSidebar={() => setMobileSidebarOpen(prev => !prev)} />
        <main className="page-content">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'products' && <Products />}
          {activeTab === 'billing' && <BillingCounter />}
          {activeTab === 'inventory' && <Inventory />}
          {activeTab === 'suppliers' && <Suppliers />}
          {activeTab === 'purchase-orders' && <PurchaseOrders />}
          {activeTab === 'shifts' && <CashierShifts />}
          {activeTab === 'reports' && <SalesReports />}
          {activeTab === 'history' && <TransactionHistory />}
          {activeTab === 'audit' && <AuditTrail />}
          {activeTab === 'settings' && <Settings />}
          {activeTab === 'invoice' && <InvoiceView />}
        </main>
        <Footer />
      </div>
      <Toast />
    </div>
  );
}

export default function App() {
  return (
    <POSProvider>
      <MainApp />
    </POSProvider>
  );
}
