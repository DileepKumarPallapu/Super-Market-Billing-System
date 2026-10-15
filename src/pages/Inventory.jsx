import React, { useState, useEffect, useMemo } from 'react';
import { usePOS } from '../context/POSContext';
import { formatCurrency, getStockStatus } from '../utils/calculations';
import MetricCard from '../components/MetricCard';
import ProductImage from '../components/ProductImage';
import {
  Boxes,
  IndianRupee,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  ArrowRight,
  PackagePlus,
  Edit2,
  X,
  Plus
} from 'lucide-react';

export default function Inventory() {
  const {
    products,
    settings,
    setActiveTab,
    restockProduct,
    navigateToEditProduct,
    inventoryFilterTarget,
    setInventoryFilterTarget,
    addToast
  } = usePOS();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  // Restock Modal state
  const [restockItem, setRestockItem] = useState(null); // product object
  const [restockQty, setRestockQty] = useState('10');

  const defaultThreshold = settings.defaultLowStockThreshold || 5;

  // Sync external navigation requests (e.g. from Dashboard "Low-Stock Alerts")
  useEffect(() => {
    if (inventoryFilterTarget) {
      setFilterStatus(inventoryFilterTarget);
      setInventoryFilterTarget('All');
    }
  }, [inventoryFilterTarget, setInventoryFilterTarget]);

  const totalProducts = products.length;
  const totalUnits = products.reduce((acc, p) => acc + (p.stock || 0), 0);
  const totalValuation = products.reduce((acc, p) => acc + (p.price * (p.stock || 0)), 0);

  const lowStockItems = products.filter(
    p => p.stock > 0 && p.stock <= (p.lowStockThreshold || defaultThreshold)
  );
  const outOfStockItems = products.filter(p => p.stock <= 0);
  const healthyItems = products.filter(
    p => p.stock > (p.lowStockThreshold || defaultThreshold)
  );

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()));

      const status = getStockStatus(p.stock, p.lowStockThreshold || defaultThreshold);
      let matchesStatus = true;
      if (filterStatus === 'in_stock') matchesStatus = !status.isLow && !status.isOut;
      else if (filterStatus === 'low_stock') matchesStatus = status.isLow;
      else if (filterStatus === 'out_of_stock') matchesStatus = status.isOut;

      return matchesSearch && matchesStatus;
    });
  }, [products, searchQuery, filterStatus, defaultThreshold]);

  const handleOpenRestock = (product) => {
    setRestockItem(product);
    setRestockQty('10');
  };

  const handleSaveRestock = (e) => {
    e.preventDefault();
    if (!restockItem) return;

    const qty = Number(restockQty);
    if (isNaN(qty) || !Number.isInteger(qty) || qty <= 0) {
      addToast('Restock quantity must be a positive whole number.', 'error');
      return;
    }

    const success = restockProduct(restockItem.id, qty);
    if (success) {
      setRestockItem(null);
    }
  };

  return (
    <div className="inventory-page">
      {/* Top Inventory Metrics */}
      <div className="metrics-grid">
        <MetricCard
          title="Total Stock Valuation"
          value={formatCurrency(totalValuation)}
          subtitle="Click to view all products"
          icon={IndianRupee}
          color="#E9B44C"
          onClick={() => setFilterStatus('All')}
        />
        <MetricCard
          title="Stock In Hand"
          value={totalUnits.toLocaleString('en-IN')}
          subtitle={`${totalProducts} catalogue products`}
          icon={Boxes}
          color="#4B2142"
          onClick={() => setFilterStatus('All')}
        />
        <MetricCard
          title="Low-Stock Items"
          value={lowStockItems.length}
          subtitle={`Click to filter (≤ ${defaultThreshold} units)`}
          icon={AlertTriangle}
          color="#E76F51"
          onClick={() => setFilterStatus('low_stock')}
        />
        <MetricCard
          title="Out of Stock"
          value={outOfStockItems.length}
          subtitle="Click to filter 0 units"
          icon={XCircle}
          color="#B42332"
          onClick={() => setFilterStatus('out_of_stock')}
        />
      </div>

      {/* Main Inventory Card */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3>Inventory Overview & Stock Health</h3>
            <p>Real-time valuation, threshold alerts, and one-click restocking</p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('products')}>
            Manage Products <ArrowRight size={13} />
          </button>
        </div>

        {/* Filter bar */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
            <input
              className="input"
              style={{ paddingLeft: '38px', paddingRight: searchQuery ? '36px' : '14px' }}
              placeholder="Search inventory by product name or SKU…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--muted)',
                  display: 'flex'
                }}
                title="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              className={`btn btn-sm ${filterStatus === 'All' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilterStatus('All')}
            >
              All ({products.length})
            </button>
            <button
              className={`btn btn-sm ${filterStatus === 'in_stock' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilterStatus('in_stock')}
            >
              In Stock ({healthyItems.length})
            </button>
            <button
              className={`btn btn-sm ${filterStatus === 'low_stock' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilterStatus('low_stock')}
            >
              Low Stock ({lowStockItems.length})
            </button>
            <button
              className={`btn btn-sm ${filterStatus === 'out_of_stock' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilterStatus('out_of_stock')}
            >
              Out of Stock ({outOfStockItems.length})
            </button>
          </div>
        </div>

        {/* Table with Working Actions */}
        <div className="table-responsive">
          <table className="table inventory-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Unit Price</th>
                <th>Stock Units</th>
                <th>Threshold</th>
                <th>Stock Valuation</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length > 0 ? (
                filteredProducts.map(p => {
                  const status = getStockStatus(p.stock, p.lowStockThreshold || defaultThreshold);
                  return (
                    <tr key={p.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <ProductImage src={p.image} alt={p.name} category={p.category} size={40} productId={p.id} />
                          <strong style={{ fontSize: '13.5px', color: 'var(--ink)' }}>{p.name}</strong>
                        </div>
                      </td>
                      <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: 'var(--muted)' }}>
                        {p.sku || p.id}
                      </td>
                      <td>
                        <span className="badge" style={{ background: 'var(--bg)', color: 'var(--ink-secondary)' }}>
                          {p.category || 'Grocery'}
                        </span>
                      </td>
                      <td style={{ fontWeight: '600' }}>{formatCurrency(p.price)}</td>
                      <td style={{ fontWeight: '800' }}>
                        {p.stock} <small style={{ color: 'var(--muted)' }}>units</small>
                      </td>
                      <td style={{ color: 'var(--muted)', fontSize: '12px' }}>
                        ≤ {p.lowStockThreshold || defaultThreshold}
                      </td>
                      <td style={{ fontWeight: '700' }}>
                        {formatCurrency(p.price * p.stock)}
                      </td>
                      <td>
                        <span className={`badge badge-${status.variant}`}>
                          {status.label}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleOpenRestock(p)}
                            title="Restock Product"
                          >
                            <PackagePlus size={13} /> Restock
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => navigateToEditProduct(p)}
                            title="Edit Product"
                          >
                            <Edit2 size={13} /> Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '36px', color: 'var(--muted)' }}>
                    No products match the selected criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Restock Product Modal */}
      {restockItem && (
        <div className="modal-overlay" onClick={() => setRestockItem(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '460px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: 'var(--primary-soft)',
                    color: 'var(--primary)',
                    display: 'grid',
                    placeItems: 'center'
                  }}
                >
                  <PackagePlus size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', color: 'var(--ink)' }}>Restock Inventory</h3>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--muted)' }}>{restockItem.name} ({restockItem.sku})</p>
                </div>
              </div>
              <button
                onClick={() => setRestockItem(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveRestock}>
              <div
                style={{
                  background: 'var(--bg)',
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '18px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  fontSize: '13px'
                }}
              >
                <div>
                  <span style={{ color: 'var(--muted)', display: 'block', fontSize: '11px' }}>CURRENT STOCK</span>
                  <strong style={{ fontSize: '16px', color: 'var(--ink)' }}>{restockItem.stock} units</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--muted)', display: 'block', fontSize: '11px' }}>SELLING PRICE</span>
                  <strong style={{ fontSize: '16px', color: 'var(--ink)' }}>{formatCurrency(restockItem.price)}</strong>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>
                  Quick Add Presets:
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[5, 10, 20, 50, 100].map(amt => (
                    <button
                      type="button"
                      key={amt}
                      className={`btn btn-sm ${restockQty === String(amt) ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ flex: 1, padding: '6px 0' }}
                      onClick={() => setRestockQty(String(amt))}
                    >
                      +{amt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Units to Add *</label>
                <input
                  className="input"
                  type="number"
                  required
                  min="1"
                  step="1"
                  placeholder="Enter quantity to add"
                  value={restockQty}
                  onChange={e => setRestockQty(e.target.value)}
                />
              </div>

              {/* Preview Result */}
              {Number(restockQty) > 0 && (
                <div
                  style={{
                    background: 'var(--primary-soft)',
                    border: '1px solid var(--primary-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '10px 14px',
                    fontSize: '13px',
                    color: 'var(--primary)',
                    marginBottom: '20px',
                    fontWeight: '600'
                  }}
                >
                  Resulting Stock Level: {restockItem.stock} + {Number(restockQty)} = {restockItem.stock + Number(restockQty)} units
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setRestockItem(null)}
                >
                  Cancel Changes
                </button>
                <button type="submit" className="btn btn-primary">
                  <CheckCircle2 size={15} /> Save Stock Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
