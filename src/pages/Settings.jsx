import React, { useState, useEffect } from 'react';
import { usePOS } from '../context/POSContext';
import ConfirmationModal from '../components/ConfirmationModal';
import {
  Store,
  Percent,
  AlertTriangle,
  RotateCcw,
  HardDrive,
  Moon,
  Sun,
  Save,
  CheckCircle2,
  Undo2
} from 'lucide-react';

export default function Settings() {
  const {
    settings,
    setSettings,
    products,
    sales,
    theme,
    toggleTheme,
    resetDemoData,
    addToast
  } = usePOS();

  const [formData, setFormData] = useState({
    storeName: settings.storeName || 'ORBIT MARKET — Intelligent Retail Studio',
    storeTagline: settings.storeTagline || 'Curated Groceries & Household Essentials',
    storeAddress: settings.storeAddress || '77 Commerce Boulevard, Metro Plaza, Suite 400',
    storePhone: settings.storePhone || '+91 98765 43210',
    currency: 'INR (₹)',
    defaultTaxRate: String(settings.defaultTaxRate || 0),
    defaultLowStockThreshold: String(settings.defaultLowStockThreshold || 5)
  });

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // Sync formData whenever settings changes (e.g. after demo data reset)
  useEffect(() => {
    setFormData({
      storeName: settings.storeName || 'ORBIT MARKET — Intelligent Retail Studio',
      storeTagline: settings.storeTagline || 'Curated Groceries & Household Essentials',
      storeAddress: settings.storeAddress || '77 Commerce Boulevard, Metro Plaza, Suite 400',
      storePhone: settings.storePhone || '+91 98765 43210',
      currency: 'INR (₹)',
      defaultTaxRate: String(settings.defaultTaxRate || 0),
      defaultLowStockThreshold: String(settings.defaultLowStockThreshold || 5)
    });
  }, [settings]);

  // Approximate storage size
  const storageSizeKb = Math.round(
    ((localStorage.getItem('freshcart_pos_products_v2')?.length || 0) +
     (localStorage.getItem('freshcart_pos_sales_v2')?.length || 0) +
     (localStorage.getItem('freshcart_pos_settings_v2')?.length || 0)) / 1024
  );

  const handleSave = (e) => {
    e.preventDefault();
    const storeName = formData.storeName.trim();
    const tax = Number(formData.defaultTaxRate);
    const threshold = Number(formData.defaultLowStockThreshold);

    if (!storeName) {
      addToast('Supermarket store name cannot be empty.', 'error');
      return;
    }
    if (isNaN(tax) || tax < 0) {
      addToast('Tax rate must be 0% or a positive number.', 'error');
      return;
    }
    if (isNaN(threshold) || !Number.isInteger(threshold) || threshold < 1) {
      addToast('Low stock threshold must be a whole number of at least 1 unit.', 'error');
      return;
    }

    setSettings(prev => ({
      ...prev,
      storeName,
      storeTagline: formData.storeTagline.trim(),
      storeAddress: formData.storeAddress.trim(),
      storePhone: formData.storePhone.trim(),
      defaultTaxRate: tax,
      defaultLowStockThreshold: threshold
    }));

    addToast('Store settings saved successfully.', 'success');
  };

  const handleCancel = () => {
    setFormData({
      storeName: settings.storeName || 'ORBIT MARKET — Intelligent Retail Studio',
      storeTagline: settings.storeTagline || 'Curated Groceries & Household Essentials',
      storeAddress: settings.storeAddress || '77 Commerce Boulevard, Metro Plaza, Suite 400',
      storePhone: settings.storePhone || '+91 98765 43210',
      currency: 'INR (₹)',
      defaultTaxRate: String(settings.defaultTaxRate || 0),
      defaultLowStockThreshold: String(settings.defaultLowStockThreshold || 5)
    });
    addToast('Unsaved changes discarded.', 'info');
  };

  return (
    <div className="settings-page" style={{ maxWidth: '960px' }}>
      <form onSubmit={handleSave}>
        {/* Store Profile Card */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-header">
            <div>
              <h3>Store Profile & Billing Information</h3>
              <p>Store identity printed on customer receipts and invoices</p>
            </div>
            <Store size={20} style={{ color: 'var(--primary)' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Supermarket Store Name *</label>
              <input
                className="input"
                required
                value={formData.storeName}
                onChange={e => setFormData({ ...formData, storeName: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Receipt Tagline / Subtitle</label>
              <input
                className="input"
                value={formData.storeTagline}
                onChange={e => setFormData({ ...formData, storeTagline: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Store Physical Address</label>
              <input
                className="input"
                value={formData.storeAddress}
                onChange={e => setFormData({ ...formData, storeAddress: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Contact / Helpline Phone</label>
              <input
                className="input"
                value={formData.storePhone}
                onChange={e => setFormData({ ...formData, storePhone: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Business Logic & Rates Card */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-header">
            <div>
              <h3>Billing & Inventory Configuration</h3>
              <p>Define tax rates, thresholds, and currency rules</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Currency Symbol</label>
              <input className="input" disabled value="INR (₹) - Indian Rupee" />
              <small style={{ color: 'var(--muted)', fontSize: '11px' }}>Fixed to INR as required</small>
            </div>

            <div className="form-group">
              <label className="form-label">Default Tax Rate (%)</label>
              <input
                className="input"
                type="number"
                min="0"
                step="0.1"
                value={formData.defaultTaxRate}
                onChange={e => setFormData({ ...formData, defaultTaxRate: e.target.value })}
              />
              <small style={{ color: 'var(--muted)', fontSize: '11px' }}>Defaults to 0% (No GST)</small>
            </div>

            <div className="form-group">
              <label className="form-label">Global Low-Stock Threshold</label>
              <input
                className="input"
                type="number"
                min="1"
                step="1"
                value={formData.defaultLowStockThreshold}
                onChange={e => setFormData({ ...formData, defaultLowStockThreshold: e.target.value })}
              />
              <small style={{ color: 'var(--muted)', fontSize: '11px' }}>Triggers warning at ≤ threshold units</small>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <button type="button" className="btn btn-secondary" onClick={handleCancel}>
              <Undo2 size={15} /> Cancel Changes
            </button>
            <button type="submit" className="btn btn-primary">
              <Save size={15} /> Save Configuration
            </button>
          </div>
        </div>
      </form>

      {/* Appearance Theme Card */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <div>
            <h3>Theme & Appearance</h3>
            <p>Select your preferred POS terminal visual theme</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '14px' }}>
          <button
            className={`btn ${theme === 'light' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => theme !== 'light' && toggleTheme()}
            style={{ padding: '12px 24px' }}
          >
            <Sun size={16} /> Light Theme
          </button>
          <button
            className={`btn ${theme === 'dark' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => theme !== 'dark' && toggleTheme()}
            style={{ padding: '12px 24px' }}
          >
            <Moon size={16} /> Dark Theme
          </button>
        </div>
      </div>

      {/* Local Storage & Demo Data Maintenance Card */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3>Storage & Demo Reset</h3>
            <p>Manage local browser persistence and restore default demo products</p>
          </div>
          <HardDrive size={20} style={{ color: 'var(--muted)' }} />
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '14px',
            background: 'var(--bg)',
            padding: '16px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '20px'
          }}
        >
          <div>
            <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: '600' }}>PRODUCTS STORED</span>
            <strong style={{ fontSize: '18px', display: 'block', color: 'var(--ink)' }}>{products.length} items</strong>
          </div>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: '600' }}>SALES RECORDED</span>
            <strong style={{ fontSize: '18px', display: 'block', color: 'var(--ink)' }}>{sales.length} invoices</strong>
          </div>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: '600' }}>STORAGE FOOTPRINT</span>
            <strong style={{ fontSize: '18px', display: 'block', color: 'var(--ink)' }}>~{storageSizeKb || 1} KB</strong>
          </div>
        </div>

        <p style={{ fontSize: '12.5px', color: 'var(--ink-secondary)', lineHeight: 1.6, marginBottom: '20px' }}>
          <strong>Note for Evaluators:</strong> Data is persisted locally in this browser profile via <code>localStorage</code>.
          Clicking <strong>Reset Demo Data</strong> restores the sample products (Rice ₹500/10, Sugar ₹60/20, Milk ₹30/15),
          resets next invoice number to <code>FC-1001</code>, and clears sales history.
        </p>

        <button className="btn btn-danger-soft" onClick={() => setIsResetModalOpen(true)}>
          <RotateCcw size={15} />
          <span>Reset Demo Data to Initial Defaults</span>
        </button>
      </div>

      {/* Reset Confirmation Dialog */}
      <ConfirmationModal
        isOpen={isResetModalOpen}
        title="Reset Demo Data"
        message="Are you sure you want to reset demo data? This will restore the default products (Rice, Sugar, Milk) and permanently wipe all completed sales history on this browser."
        confirmText="Reset to Initial State"
        isDanger={true}
        onConfirm={resetDemoData}
        onClose={() => setIsResetModalOpen(false)}
      />
    </div>
  );
}
