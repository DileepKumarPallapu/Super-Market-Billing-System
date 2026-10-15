import React from 'react';
import { usePOS } from '../context/POSContext';
import {
  LayoutDashboard,
  Package,
  Receipt,
  Boxes,
  BarChart3,
  History,
  Settings as SettingsIcon,
  ShoppingBag,
  Truck,
  ClipboardList,
  Wallet,
  ShieldCheck,
  X
} from 'lucide-react';

export default function Sidebar({ isOpen = false, onClose }) {
  const { activeTab, setActiveTab, products, cart, settings, currentShift } = usePOS();

  const lowStockCount = (products || []).filter(
    p => p.stock <= (p.lowStockThreshold || p.minStockThreshold || settings.defaultLowStockThreshold || 5)
  ).length;

  const cartUnits = (cart || []).reduce((sum, item) => sum + item.quantity, 0);

  const navItems = [
    { id: 'dashboard', label: 'Studio Dashboard', icon: LayoutDashboard },
    { id: 'products', label: 'Item Catalogue', icon: Package },
    { id: 'billing', label: 'Billing Counter', icon: ShoppingBag, badge: cartUnits > 0 ? cartUnits : null },
    { id: 'invoice', label: 'Tax Invoice', icon: Receipt },
    { id: 'inventory', label: 'Stock & Valuation', icon: Boxes, alert: lowStockCount > 0 ? lowStockCount : null },
    { id: 'suppliers', label: 'Vendors & Suppliers', icon: Truck },
    { id: 'purchase-orders', label: 'Purchase Orders', icon: ClipboardList },
    { id: 'shifts', label: 'Cashier Shifts', icon: Wallet, badge: currentShift ? 'Active' : null },
    { id: 'reports', label: 'Sales Analytics', icon: BarChart3 },
    { id: 'history', label: 'Order History', icon: History },
    { id: 'audit', label: 'Audit Trail', icon: ShieldCheck },
    { id: 'settings', label: 'Studio Settings', icon: SettingsIcon }
  ];

  return (
    <aside className={`sidebar no-print ${isOpen ? 'mobile-open' : ''}`}>
      <div className="brand-section">
        <img
          src="/orbit-icon.svg"
          alt="ORBIT MARKET"
          className="brand-logo-img"
        />
        <div className="brand-info">
          <h1>ORBIT MARKET</h1>
          <span>Retail Studio</span>
        </div>
        {onClose && (
          <button
            type="button"
            className="mobile-close-btn"
            onClick={onClose}
            aria-label="Close navigation sidebar"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <div className="nav-label">Navigation</div>
      <nav className="nav-links">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => {
                setActiveTab(item.id);
                if (onClose) onClose();
              }}
            >
              <Icon size={17} />
              <span>{item.label}</span>
              {item.badge && (
                <span className="nav-badge" style={{ background: item.id === 'shifts' ? '#287D5A' : undefined }}>
                  {item.badge}
                </span>
              )}
              {item.alert && (
                <span className="nav-badge" style={{ background: '#E76F51', color: '#FFFFFF' }}>
                  {item.alert}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="store-card">
          <strong>
            <span className="status-dot"></span> Studio Terminal
          </strong>
          <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.8 }}>POS Station #1 · Synchronized</p>
        </div>
      </div>
    </aside>
  );
}
