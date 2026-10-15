import React, { useState, useMemo } from 'react';
import { usePOS } from '../context/POSContext';
import { formatCurrency } from '../utils/calculations';
import { exportSalesToCsv } from '../utils/exportCsv';
import ProductImage from '../components/ProductImage';
import {
  Search,
  Eye,
  Receipt,
  Download,
  Calendar,
  ArrowUp,
  ArrowDown,
  X,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  Banknote,
  QrCode,
  CreditCard,
  Layers
} from 'lucide-react';

export default function TransactionHistory() {
  const { sales, refunds, processReturn, viewInvoice, setActiveTab, addToast } = usePOS();
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState('All');
  const [sortBy, setSortBy] = useState('timestamp'); // 'timestamp', 'invoiceNo', 'finalTotal'
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc', 'asc'

  // Return / Refund modal state
  const [returnTargetSale, setReturnTargetSale] = useState(null);
  const [returnProductId, setReturnProductId] = useState('');
  const [returnQuantity, setReturnQuantity] = useState('1');
  const [returnReason, setReturnReason] = useState('Customer Change of Mind');

  // Filter sales
  const filteredSales = useMemo(() => {
    return sales
      .filter(s => {
        const q = searchQuery.toLowerCase();
        const matchesInvoice = s.invoiceNo.toLowerCase().includes(q);
        const matchesCustomer = s.customer?.name ? s.customer.name.toLowerCase().includes(q) : false;
        const matchesItems = (s.items || []).some(i => i.name.toLowerCase().includes(q));
        const matchesMethod = (s.paymentMethod || '').toLowerCase().includes(q);
        const matchesSearch = matchesInvoice || matchesCustomer || matchesItems || matchesMethod;

        let matchesTime = true;
        if (timeFilter !== 'All') {
          const saleDate = new Date(s.timestamp);
          const now = new Date();
          if (timeFilter === 'today') {
            matchesTime = saleDate.toDateString() === now.toDateString();
          } else if (timeFilter === '7days') {
            matchesTime = saleDate >= new Date(now.getTime() - 7 * 86400000);
          } else if (timeFilter === '30days') {
            matchesTime = saleDate >= new Date(now.getTime() - 30 * 86400000);
          }
        }

        return matchesSearch && matchesTime;
      })
      .sort((a, b) => {
        let valA = a[sortBy];
        let valB = b[sortBy];

        if (sortBy === 'timestamp') {
          valA = new Date(valA).getTime();
          valB = new Date(valB).getTime();
        } else if (typeof valA === 'string') {
          valA = valA.toLowerCase();
          valB = valB.toLowerCase();
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [sales, searchQuery, timeFilter, sortBy, sortOrder]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder(field === 'timestamp' ? 'desc' : 'asc');
    }
  };

  const handleExport = () => {
    if (filteredSales.length === 0) {
      addToast('No transaction records available to export.', 'warning');
      return;
    }
    const ok = exportSalesToCsv(filteredSales, `transactions-${timeFilter.toLowerCase()}.csv`);
    if (ok) {
      addToast(`Exported ${filteredSales.length} transaction record(s) to CSV.`, 'success');
    }
  };

  const renderSortIndicator = (field) => {
    if (sortBy !== field) return null;
    return sortOrder === 'asc' ? <ArrowUp size={12} style={{ display: 'inline', marginLeft: '4px' }} /> : <ArrowDown size={12} style={{ display: 'inline', marginLeft: '4px' }} />;
  };

  // Open return modal
  const handleOpenReturnModal = (sale) => {
    setReturnTargetSale(sale);
    if (sale.items && sale.items.length > 0) {
      setReturnProductId(sale.items[0].id);
    }
    setReturnQuantity('1');
    setReturnReason('Customer Change of Mind');
  };

  const handleConfirmReturn = (e) => {
    e?.preventDefault();
    if (!returnTargetSale || !returnProductId) return;

    const ok = processReturn({
      invoiceNo: returnTargetSale.invoiceNo,
      productId: returnProductId,
      quantity: parseInt(returnQuantity, 10),
      reason: returnReason
    });

    if (ok) {
      setReturnTargetSale(null);
    }
  };

  return (
    <div className="history-page">
      {/* Controls & Filter Bar */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          {/* Search Input with Clear Button */}
          <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
            <input
              className="input"
              style={{ paddingLeft: '38px', paddingRight: searchQuery ? '36px' : '14px' }}
              placeholder="Search by invoice (FC-1001), customer, or product…"
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

          {/* Date Filter Pills */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
            <Calendar size={16} style={{ color: 'var(--muted)' }} />
            <button
              className={`btn btn-sm ${timeFilter === 'All' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setTimeFilter('All')}
            >
              All Time
            </button>
            <button
              className={`btn btn-sm ${timeFilter === 'today' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setTimeFilter('today')}
            >
              Today
            </button>
            <button
              className={`btn btn-sm ${timeFilter === '7days' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setTimeFilter('7days')}
            >
              Past 7 Days
            </button>
            <button
              className={`btn btn-sm ${timeFilter === '30days' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setTimeFilter('30days')}
            >
              Past 30 Days
            </button>
          </div>

          {/* Export Button */}
          <button className="btn btn-secondary" onClick={handleExport}>
            <Download size={15} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h3>All Historical Transactions ({filteredSales.length})</h3>
            <p>Audited ledger of customer receipts and checkout settlements</p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('billing')}>
            ＋ New Bill
          </button>
        </div>

        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th onClick={() => handleSort('invoiceNo')} style={{ cursor: 'pointer' }} title="Sort by Invoice Number">
                  Invoice No {renderSortIndicator('invoiceNo')}
                </th>
                <th onClick={() => handleSort('timestamp')} style={{ cursor: 'pointer' }} title="Sort by Date">
                  Date & Time {renderSortIndicator('timestamp')}
                </th>
                <th>Customer</th>
                <th>Payment</th>
                <th>Purchased Items</th>
                <th>Subtotal</th>
                <th>Discount</th>
                <th onClick={() => handleSort('finalTotal')} style={{ cursor: 'pointer' }} title="Sort by Total Amount">
                  Total Paid {renderSortIndicator('finalTotal')}
                </th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.length > 0 ? (
                filteredSales.map(sale => {
                  const saleRefunds = refunds.filter(r => r.invoiceNo === sale.invoiceNo);
                  const totalReturnedUnits = saleRefunds.reduce((s, r) => s + r.quantity, 0);

                  return (
                    <tr key={sale.id}>
                      <td>
                        <strong style={{ color: 'var(--primary)', fontFamily: 'JetBrains Mono, monospace' }}>
                          {sale.invoiceNo}
                        </strong>
                        {totalReturnedUnits > 0 && (
                          <span
                            className="badge badge-warning"
                            style={{ display: 'block', width: 'fit-content', marginTop: '3px', fontSize: '9.5px' }}
                          >
                            Return Logged ({totalReturnedUnits}u)
                          </span>
                        )}
                      </td>
                      <td>
                        <div>
                          {new Date(sale.timestamp).toLocaleDateString('en-IN')}{' '}
                          <small style={{ color: 'var(--muted)', display: 'block' }}>
                            {new Date(sale.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </small>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--ink)' }}>
                          {sale.customer ? sale.customer.name : 'Walk-in'}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            sale.paymentMethod === 'UPI'
                              ? 'badge-info'
                              : sale.paymentMethod === 'CARD'
                              ? 'badge-primary'
                              : sale.paymentMethod === 'SPLIT'
                              ? 'badge-warning'
                              : 'badge-success'
                          }`}
                          style={{ fontSize: '10.5px' }}
                        >
                          {sale.paymentMethod || 'CASH'}
                        </span>
                      </td>
                      <td style={{ maxWidth: '260px', whiteSpace: 'normal' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          {(sale.items || []).map(i => (
                            <div key={i.id || i.productId || i.name} style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                              <ProductImage src={i.image} alt={i.name} category={i.category} size={24} productId={i.id || i.productId} />
                              <span style={{ fontSize: '11.5px', color: 'var(--ink)' }}>
                                {i.name} <strong style={{ color: 'var(--muted)', fontWeight: '600' }}>×{i.quantity}</strong>
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td>{formatCurrency(sale.subtotal)}</td>
                      <td style={{ color: sale.discount > 0 ? 'var(--success)' : 'inherit' }}>
                        {sale.discount > 0 ? `− ${formatCurrency(sale.discount)}` : '₹0.00'}
                      </td>
                      <td style={{ fontWeight: '800', fontSize: '13.5px' }}>
                        {formatCurrency(sale.finalTotal)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => viewInvoice(sale)}
                            title="View and reprint invoice"
                          >
                            <Eye size={13} /> View
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleOpenReturnModal(sale)}
                            title="Process customer return / refund"
                          >
                            <RotateCcw size={13} /> Return
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '48px', color: 'var(--muted)' }}>
                    <div className="empty-state">
                      <div className="empty-state-icon">
                        <Receipt size={28} />
                      </div>
                      <h4>No Transactions Found</h4>
                      <p>
                        {searchQuery || timeFilter !== 'All'
                          ? 'No settled bills match your search criteria or date filters.'
                          : 'No completed transactions have been recorded yet.'}
                      </p>
                      {searchQuery || timeFilter !== 'All' ? (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setSearchQuery('');
                            setTimeFilter('All');
                          }}
                        >
                          Clear Filters
                        </button>
                      ) : (
                        <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('billing')}>
                          Create First Bill <ArrowRight size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Return / Refund Modal */}
      {returnTargetSale && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0 }}>Process Return & Restock</h3>
                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                  Invoice: {returnTargetSale.invoiceNo} · Customer: {returnTargetSale.customer?.name || 'Walk-in'}
                </span>
              </div>
              <button type="button" className="btn-close" onClick={() => setReturnTargetSale(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmReturn}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--ink-secondary)' }}>
                  Returned items are automatically replenished into inventory stock and the refund amount is deducted from net revenue.
                </p>

                {/* Product Select */}
                <div>
                  <label className="form-label">Select Item to Return *</label>
                  <select
                    className="input"
                    value={returnProductId}
                    onChange={e => setReturnProductId(e.target.value)}
                  >
                    {(returnTargetSale.items || []).map(item => {
                      const pastReturns = refunds
                        .filter(r => r.invoiceNo === returnTargetSale.invoiceNo && r.productId === item.id)
                        .reduce((sum, r) => sum + r.quantity, 0);
                      const availableToReturn = item.quantity - pastReturns;

                      return (
                        <option key={item.id} value={item.id} disabled={availableToReturn <= 0}>
                          {item.name} — Sold: {item.quantity} | Already Returned: {pastReturns} | Eligible: {availableToReturn}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {(() => {
                  const selItem = (returnTargetSale.items || []).find(i => String(i.id) === String(returnProductId));
                  if (!selItem) return null;
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'var(--bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--line)' }}>
                      <ProductImage src={selItem.image} alt={selItem.name} category={selItem.category} size={42} productId={selItem.id} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--ink)' }}>{selItem.name}</div>
                        <div style={{ fontSize: '11.5px', color: 'var(--muted)' }}>
                          Unit Price: {formatCurrency(selItem.price)} · Category: {selItem.category || 'Grocery'}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Return Quantity */}
                <div>
                  <label className="form-label">Return Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    className="input"
                    value={returnQuantity}
                    onChange={e => setReturnQuantity(e.target.value)}
                    required
                  />
                </div>

                {/* Reason */}
                <div>
                  <label className="form-label">Return Reason</label>
                  <select
                    className="input"
                    value={returnReason}
                    onChange={e => setReturnReason(e.target.value)}
                  >
                    <option value="Customer Change of Mind">Customer Change of Mind</option>
                    <option value="Damaged / Defective Packaging">Damaged / Defective Packaging</option>
                    <option value="Expired / Past Best-Before">Expired / Past Best-Before</option>
                    <option value="Incorrect Item Picked">Incorrect Item Picked</option>
                    <option value="Billed in Error">Billed in Error</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer" style={{ marginTop: '18px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setReturnTargetSale(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <CheckCircle2 size={15} /> Confirm Return & Restock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
