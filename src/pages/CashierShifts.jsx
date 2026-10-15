import React, { useState, useEffect } from 'react';
import { usePOS } from '../context/POSContext';
import {
  Wallet,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  History,
  Lock,
  Unlock
} from 'lucide-react';

export default function CashierShifts() {
  const {
    currentShift,
    shifts,
    currentUser,
    fetchShifts,
    openShift,
    closeShift
  } = usePOS();

  const [openModal, setOpenModal] = useState(false);
  const [closeModal, setCloseModal] = useState(false);
  const [openingCash, setOpeningCash] = useState('1000');
  const [closingCash, setClosingCash] = useState('');
  const [shiftNotes, setShiftNotes] = useState('');

  useEffect(() => {
    if (fetchShifts) fetchShifts();
  }, [fetchShifts]);

  const handleOpenSubmit = async (e) => {
    e.preventDefault();
    await openShift(parseFloat(openingCash) || 0, shiftNotes);
    setOpenModal(false);
    setShiftNotes('');
  };

  const handleCloseSubmit = async (e) => {
    e.preventDefault();
    if (!currentShift) return;
    await closeShift(currentShift.id, parseFloat(closingCash) || 0, shiftNotes);
    setCloseModal(false);
    setClosingCash('');
    setShiftNotes('');
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="section-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="icon-pill" style={{ background: '#ecfdf5', color: '#059669', padding: '10px', borderRadius: '10px', display: 'flex', alignItems: 'center' }}>
            <Wallet size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>Cashier Shifts & Drawer Reconciliation</h2>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Manage cash floats, track drawer balances, and reconcile end-of-shift discrepancies</p>
          </div>
        </div>

        <div>
          {currentShift ? (
            <button className="btn btn-danger" onClick={() => setCloseModal(true)}>
              <Lock size={16} />
              <span>Close Shift & Reconcile</span>
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => setOpenModal(true)}>
              <Unlock size={16} />
              <span>Open Cashier Shift</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Shift Card */}
      {currentShift ? (
        <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem', borderLeft: '4px solid #059669', background: 'linear-gradient(135deg, rgba(5,150,105,0.04) 0%, transparent 100%)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span className="status-dot"></span> ACTIVE SHIFT
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Cashier: <strong>{currentShift.cashierName}</strong>
                </span>
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>Drawer Status: Operational</h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Opened on {new Date(currentShift.openedAt).toLocaleDateString()} at {new Date(currentShift.openedAt).toLocaleTimeString()}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Opening Float</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  ₹{(currentShift.openingCash || 0).toFixed(2)}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Estimated In Drawer</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#059669' }}>
                  ₹{((currentShift.openingCash || 0) + (currentShift.currentCashSales || 0)).toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Unlock size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
          <p style={{ margin: '0 0 0.5rem 0', fontWeight: 600 }}>No Cashier Shift Currently Active</p>
          <p style={{ margin: 0, fontSize: '0.85rem' }}>Click "Open Cashier Shift" above to record initial drawer float and begin billing.</p>
        </div>
      )}

      {/* Historical Shift Register */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <History size={16} />
          <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Shift Register & Audit History</h3>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Cashier</th>
                <th>Opened At</th>
                <th>Closed At</th>
                <th>Opening Cash</th>
                <th>Closing Cash</th>
                <th>Expected Cash</th>
                <th>Discrepancy</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(shifts || []).map(s => {
                const isClosed = s.status === 'CLOSED';
                const disc = s.discrepancy || 0;
                return (
                  <tr key={s.id}>
                    <td><strong>{s.cashierName}</strong></td>
                    <td>{new Date(s.openedAt).toLocaleString()}</td>
                    <td>{s.closedAt ? new Date(s.closedAt).toLocaleString() : '—'}</td>
                    <td>₹{(s.openingCash || 0).toFixed(2)}</td>
                    <td>{s.closingCash !== null && s.closingCash !== undefined ? `₹${s.closingCash.toFixed(2)}` : '—'}</td>
                    <td>{s.expectedCash !== null && s.expectedCash !== undefined ? `₹${s.expectedCash.toFixed(2)}` : '—'}</td>
                    <td>
                      {isClosed ? (
                        <span style={{ fontWeight: 700, color: disc === 0 ? '#059669' : disc > 0 ? '#2563eb' : '#dc2626' }}>
                          {disc === 0 ? 'Exact (₹0.00)' : `${disc > 0 ? '+' : ''}₹${disc.toFixed(2)}`}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>Pending Close</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${isClosed ? 'badge-secondary' : 'badge-success'}`}>
                        {s.status}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {(!shifts || shifts.length === 0) && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No prior shift history recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Open Shift Modal */}
      {openModal && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3>Open Cashier Shift</h3>
              <button className="btn-close" onClick={() => setOpenModal(false)}>×</button>
            </div>
            <form onSubmit={handleOpenSubmit} style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div className="form-group">
                  <label>Opening Cash Float (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={openingCash}
                    onChange={e => setOpeningCash(e.target.value)}
                    placeholder="1000"
                  />
                  <small style={{ color: 'var(--text-muted)' }}>Initial physical coins and notes in cash drawer</small>
                </div>
                <div className="form-group">
                  <label>Notes / Shift Remarks</label>
                  <textarea
                    rows={2}
                    value={shiftNotes}
                    onChange={e => setShiftNotes(e.target.value)}
                    placeholder="Morning shift, register #1..."
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setOpenModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Open Shift</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close Shift Modal */}
      {closeModal && currentShift && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3>Close Shift & Count Cash</h3>
              <button className="btn-close" onClick={() => setCloseModal(false)}>×</button>
            </div>
            <form onSubmit={handleCloseSubmit} style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ padding: '0.75rem', background: 'var(--bg-subtle)', borderRadius: '8px', fontSize: '0.85rem' }}>
                  <div>Cashier: <strong>{currentShift.cashierName}</strong></div>
                  <div>Opening Float: <strong>₹{(currentShift.openingCash || 0).toFixed(2)}</strong></div>
                </div>

                <div className="form-group">
                  <label>Physical Cash Counted in Drawer (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={closingCash}
                    onChange={e => setClosingCash(e.target.value)}
                    placeholder="Count and enter exact drawer cash"
                  />
                  <small style={{ color: 'var(--text-muted)' }}>The server will reconcile this against system sales and record any variance.</small>
                </div>

                <div className="form-group">
                  <label>Closing Reconciliation Notes</label>
                  <textarea
                    rows={2}
                    value={shiftNotes}
                    onChange={e => setShiftNotes(e.target.value)}
                    placeholder="e.g. Cash handed over to Store Manager Rajesh"
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setCloseModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-danger">Reconcile & Close Shift</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
