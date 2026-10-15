import React, { useState, useEffect } from 'react';
import { usePOS } from '../context/POSContext';
import {
  ClipboardList,
  Plus,
  PackageCheck,
  Truck,
  CheckCircle2,
  Clock,
  Trash2,
  Calendar,
  AlertCircle
} from 'lucide-react';

export default function PurchaseOrders() {
  const {
    purchaseOrders,
    suppliers,
    products,
    fetchPurchaseOrders,
    createPurchaseOrder,
    receivePurchaseOrder
  } = usePOS();

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([
    { productId: '', quantity: 10, unitCost: 0 }
  ]);
  const [receivingId, setReceivingId] = useState(null);

  useEffect(() => {
    if (fetchPurchaseOrders) fetchPurchaseOrders();
  }, [fetchPurchaseOrders]);

  const handleAddItemLine = () => {
    setItems([...items, { productId: '', quantity: 10, unitCost: 0 }]);
  };

  const handleRemoveItemLine = (idx) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx, field, value) => {
    const updated = [...items];
    updated[idx][field] = value;

    if (field === 'productId') {
      const prod = products.find(p => p.id === value);
      if (prod) {
        updated[idx].unitCost = prod.purchaseCost || Math.round(prod.price * 0.75);
      }
    }
    setItems(updated);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => {
      const qty = Number(item.quantity) || 0;
      const cost = Number(item.unitCost) || 0;
      return sum + (qty * cost);
    }, 0);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSupplierId) return;

    const validItems = items.filter(i => i.productId && Number(i.quantity) > 0);
    if (validItems.length === 0) return;

    await createPurchaseOrder({
      supplierId: selectedSupplierId,
      items: validItems.map(i => ({
        productId: i.productId,
        quantityOrdered: Number(i.quantity),
        unitCost: Number(i.unitCost)
      })),
      notes
    });

    setModalOpen(false);
    setSelectedSupplierId('');
    setNotes('');
    setItems([{ productId: '', quantity: 10, unitCost: 0 }]);
  };

  const handleReceive = async (poId) => {
    setReceivingId(poId);
    try {
      await receivePurchaseOrder(poId);
    } finally {
      setReceivingId(null);
    }
  };

  return (
    <div className="page-container">
      {/* Header Row */}
      <div className="section-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="icon-pill" style={{ background: '#ecfdf5', color: '#059669', padding: '10px', borderRadius: '10px', display: 'flex', alignItems: 'center' }}>
            <ClipboardList size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>Purchase Orders & Stock Intake</h2>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Issue supplier purchase orders and receive verified shipments directly into warehouse inventory</p>
          </div>
        </div>

        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          <Plus size={16} />
          <span>New Purchase Order</span>
        </button>
      </div>

      {/* PO Table */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Supplier</th>
                <th>Date Ordered</th>
                <th>Items Count</th>
                <th>Total Value</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(purchaseOrders || []).map(po => {
                const isReceived = po.status === 'RECEIVED';
                const itemsCount = po.items ? po.items.length : 0;
                return (
                  <tr key={po.id}>
                    <td>
                      <strong style={{ fontFamily: 'monospace', color: 'var(--brand-primary)' }}>{po.poNumber}</strong>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{po.supplier?.name || 'Wholesale Supplier'}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{po.supplier?.contactPerson || 'Vendor'}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}>
                        <Calendar size={13} style={{ color: 'var(--text-muted)' }} />
                        <span>{new Date(po.createdAt || po.orderedAt).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td>{itemsCount} Line Item(s)</td>
                    <td>
                      <strong>₹{(po.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                    </td>
                    <td>
                      <span className={`badge ${isReceived ? 'badge-success' : 'badge-warning'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                        {isReceived ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                        {po.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {!isReceived ? (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleReceive(po.id)}
                          disabled={receivingId === po.id}
                          title="Receive goods and increment live warehouse stock"
                        >
                          <PackageCheck size={14} />
                          <span>{receivingId === po.id ? 'Receiving...' : 'Receive Goods'}</span>
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 600 }}>
                          Stock Added ✓
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {(!purchaseOrders || purchaseOrders.length === 0) && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <ClipboardList size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
                    <p>No purchase orders recorded yet. Create one to replenish inventory.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create PO Modal */}
      {modalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '680px' }}>
            <div className="modal-header">
              <h3>Create Purchase Order</h3>
              <button className="btn-close" onClick={() => setModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleCreateSubmit} style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label>Select Supplier *</label>
                  <select
                    required
                    value={selectedSupplierId}
                    onChange={e => setSelectedSupplierId(e.target.value)}
                  >
                    <option value="">-- Choose Wholesale Supplier --</option>
                    {(suppliers || []).map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.paymentTerms || 'Net 30'})</option>
                    ))}
                  </select>
                </div>

                {/* Items List */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>Order Items</label>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddItemLine}>
                      <Plus size={14} /> Add Line
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {items.map((item, idx) => (
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '0.5rem', alignItems: 'center' }}>
                        <select
                          required
                          value={item.productId}
                          onChange={e => handleItemChange(idx, 'productId', e.target.value)}
                        >
                          <option value="">-- Select Product --</option>
                          {(products || []).map(p => (
                            <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min="1"
                          required
                          placeholder="Quantity"
                          value={item.quantity}
                          onChange={e => handleItemChange(idx, 'quantity', e.target.value)}
                        />
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          placeholder="Unit Cost (₹)"
                          value={item.unitCost}
                          onChange={e => handleItemChange(idx, 'unitCost', e.target.value)}
                        />
                        {items.length > 1 && (
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => handleRemoveItemLine(idx)}
                            style={{ padding: '6px' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: '0.75rem', textAlign: 'right', fontSize: '0.95rem' }}>
                    Estimated Total: <strong style={{ color: 'var(--brand-primary)', fontSize: '1.1rem' }}>₹{calculateTotal().toFixed(2)}</strong>
                  </div>
                </div>

                <div className="form-group">
                  <label>Notes / Instructions</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="e.g. Deliver to Warehouse Bay 3, urgent restock..."
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Purchase Order</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
