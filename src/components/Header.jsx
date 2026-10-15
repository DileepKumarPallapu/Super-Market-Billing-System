import React, { useState } from 'react';
import { usePOS } from '../context/POSContext';
import {
  Sun,
  Moon,
  PlusCircle,
  Bell,
  ChevronDown,
  Shield,
  X,
  Menu
} from 'lucide-react';

const PAGE_METADATA = {
  dashboard: {
    title: 'Studio Dashboard & Performance',
    subtitle: 'Real-time retail turnover, transaction metrics, and warehouse inventory alerts'
  },
  products: {
    title: 'Item Catalogue & Master Inventory',
    subtitle: 'Browse 155+ verified supermarket products across 30 departments'
  },
  billing: {
    title: 'POS Billing Counter',
    subtitle: 'High-speed point of sale, barcode lookup, coupon discounts, and instant receipting'
  },
  inventory: {
    title: 'Warehouse Stock & Valuation',
    subtitle: 'Monitor inventory levels, safety thresholds, asset valuation at cost & retail'
  },
  suppliers: {
    title: 'Vendors & Procurement Directory',
    subtitle: 'Wholesale distributor agreements, contact records, and GSTIN registration'
  },
  'purchase-orders': {
    title: 'Purchase Orders & Stock Intake',
    subtitle: 'Issue procurement orders and receive verified shipments into live inventory'
  },
  shifts: {
    title: 'Cashier Shift Register & Reconciliation',
    subtitle: 'Drawer opening floats, cash turnover tracking, and end-of-shift variance audit'
  },
  reports: {
    title: 'Sales Intelligence & Financial Analytics',
    subtitle: 'Revenue curves, gross margins, payment distribution, and bestsellers'
  },
  history: {
    title: 'Order History & Refunds',
    subtitle: 'Archived customer sales, payment breakdowns, returns, and invoice reprints'
  },
  audit: {
    title: 'System Audit Trail & Security Ledger',
    subtitle: 'Cryptographically sealed audit trail of all transactions and operator actions'
  },
  settings: {
    title: 'Studio Configuration & Store Profile',
    subtitle: 'Brand parameters, taxation slabs, threshold alerts, and demo database controls'
  },
  invoice: {
    title: 'Tax Invoice & Customer Receipt',
    subtitle: 'Itemized fiscal breakdown with printable styling and PDF export'
  }
};

const ROLES = [
  { key: 'SUPER_ADMIN', label: 'Super Admin', user: 'Pallapu Dileep Kumar', color: '#4B2142' },
  { key: 'STORE_MANAGER', label: 'Store Manager', user: 'Rajesh Verma', color: '#E76F51' },
  { key: 'CASHIER', label: 'Cashier', user: 'Sunita Sharma', color: '#287D5A' },
  { key: 'INVENTORY_MANAGER', label: 'Inventory Mgr', user: 'Arjun Das', color: '#E9B44C' },
  { key: 'ACCOUNTANT', label: 'Accountant', user: 'Meera Iyer', color: '#6B6872' }
];

export default function Header({ onToggleSidebar }) {
  const {
    activeTab,
    setActiveTab,
    theme,
    toggleTheme,
    currentUser,
    switchUserRole,
    notifications,
    unreadNotificationCount
  } = usePOS();

  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [notifMenuOpen, setNotifMenuOpen] = useState(false);

  const currentMeta = PAGE_METADATA[activeTab] || PAGE_METADATA.dashboard;
  const currentRoleObj = ROLES.find(r => r.key === currentUser?.role) || ROLES[0];

  return (
    <header className="top-header no-print">
      <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
        >
          <Menu size={20} />
        </button>
        <div>
          <h2>{currentMeta.title}</h2>
          <p className="header-subtitle">{currentMeta.subtitle}</p>
        </div>
      </div>

      <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Role Switcher Pill */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setRoleMenuOpen(!roleMenuOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '6px 12px',
              borderRadius: '20px',
              background: 'var(--bg-card)',
              border: `1.5px solid ${currentRoleObj.color}`,
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 700,
              color: 'var(--text-main)',
              boxShadow: 'var(--shadow-xs)'
            }}
            title="Click to switch operator role & permissions"
          >
            <Shield size={14} style={{ color: currentRoleObj.color }} />
            <span>{currentRoleObj.label}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 500 }}>
              ({currentUser?.name?.split(' ')[0] || 'User'})
            </span>
            <ChevronDown size={12} style={{ color: 'var(--text-muted)' }} />
          </button>

          {roleMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                right: 0,
                width: '240px',
                background: 'var(--bg-card)',
                borderRadius: '12px',
                boxShadow: 'var(--shadow-lg)',
                border: '1px solid var(--border-soft)',
                zIndex: 100,
                overflow: 'hidden'
              }}
            >
              <div style={{ padding: '8px 12px', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-soft)' }}>
                Switch Operator Role
              </div>
              {ROLES.map(r => (
                <button
                  key={r.key}
                  onClick={() => {
                    switchUserRole(r.key);
                    setRoleMenuOpen(false);
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    padding: '8px 12px',
                    border: 'none',
                    background: currentUser?.role === r.key ? 'var(--bg-subtle)' : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.15s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: r.color }}></span>
                    <strong style={{ fontSize: '0.84rem', color: 'var(--text-main)' }}>{r.label}</strong>
                    {currentUser?.role === r.key && <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--color-success)', fontWeight: 800 }}>✓</span>}
                  </div>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginLeft: '16px' }}>{r.user}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            className="btn-icon"
            onClick={() => setNotifMenuOpen(!notifMenuOpen)}
            title="System Alerts & Notifications"
            style={{ position: 'relative' }}
          >
            <Bell size={16} />
            {unreadNotificationCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '1px',
                  right: '1px',
                  background: 'var(--color-danger)',
                  color: '#fff',
                  fontSize: '0.62rem',
                  fontWeight: 800,
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {unreadNotificationCount}
              </span>
            )}
          </button>

          {notifMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                right: 0,
                width: '320px',
                maxHeight: '380px',
                background: 'var(--bg-card)',
                borderRadius: '12px',
                boxShadow: 'var(--shadow-lg)',
                border: '1px solid var(--border-soft)',
                zIndex: 100,
                overflowY: 'auto'
              }}
            >
              <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>Notifications</strong>
                <button
                  onClick={() => setNotifMenuOpen(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  <X size={14} />
                </button>
              </div>

              <div>
                {(notifications || []).slice(0, 10).map(n => (
                  <div
                    key={n.id}
                    style={{
                      padding: '10px 14px',
                      borderBottom: '1px solid var(--border-soft)',
                      fontSize: '0.8rem',
                      background: n.isRead ? 'transparent' : 'var(--bg-subtle)'
                    }}
                  >
                    <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: '2px' }}>{n.title}</div>
                    <div style={{ color: 'var(--text-secondary)', lineHeight: 1.3 }}>{n.message}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}

                {(!notifications || notifications.length === 0) && (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No unread notifications.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          className="btn-icon"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Warm Porcelain Theme' : 'Switch to Dark Studio Theme'}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Quick New Bill Button */}
        <button
          className="btn btn-coral"
          onClick={() => setActiveTab('billing')}
        >
          <PlusCircle size={15} />
          <span>New Bill</span>
        </button>
      </div>
    </header>
  );
}
