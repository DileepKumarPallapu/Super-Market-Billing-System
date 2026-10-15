import React, { useState, useEffect } from 'react';
import { usePOS } from '../context/POSContext';
import {
  ShieldAlert,
  Search,
  Filter,
  User,
  Clock,
  Activity,
  FileCheck
} from 'lucide-react';

export default function AuditTrail() {
  const { auditLogs, fetchAuditLogs } = usePOS();
  const [filterAction, setFilterAction] = useState('All');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (fetchAuditLogs) fetchAuditLogs();
  }, [fetchAuditLogs]);

  const filtered = (auditLogs || []).filter(log => {
    const matchesAction = filterAction === 'All' || log.action === filterAction;
    const matchesSearch = !search ||
      (log.userName && log.userName.toLowerCase().includes(search.toLowerCase())) ||
      (log.details && log.details.toLowerCase().includes(search.toLowerCase())) ||
      (log.action && log.action.toLowerCase().includes(search.toLowerCase()));
    return matchesAction && matchesSearch;
  });

  return (
    <div className="page-container">
      {/* Header */}
      <div className="section-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="icon-pill" style={{ background: '#eff6ff', color: '#1d4ed8', padding: '10px', borderRadius: '10px', display: 'flex', alignItems: 'center' }}>
            <ShieldAlert size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>System Audit Trail & Compliance Log</h2>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Immutable log of operational events, cash movements, refunds, and user actions</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="search-box" style={{ minWidth: '240px' }}>
            <Search size={16} />
            <input
              type="text"
              placeholder="Search audit trail..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <select
            value={filterAction}
            onChange={e => setFilterAction(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)' }}
          >
            <option value="All">All Actions</option>
            <option value="LOGIN">Logins</option>
            <option value="CHECKOUT_SALE">Sales Checkout</option>
            <option value="PROCESS_RETURN">Returns / Refunds</option>
            <option value="STOCK_ADJUSTMENT">Stock Adjustments</option>
            <option value="CREATE_PRODUCT">Product Creation</option>
            <option value="CREATE_PURCHASE_ORDER">Purchase Orders</option>
            <option value="RECEIVE_PURCHASE_ORDER">Stock Intake</option>
            <option value="OPEN_SHIFT">Shift Open</option>
            <option value="CLOSE_SHIFT">Shift Close</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Operator</th>
                <th>Action</th>
                <th>Target Entity</th>
                <th>Event Details</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(log => {
                let badgeClass = 'badge-secondary';
                if (log.action.includes('SALE') || log.action.includes('RECEIVE')) badgeClass = 'badge-success';
                if (log.action.includes('RETURN') || log.action.includes('CLOSE')) badgeClass = 'badge-warning';
                if (log.action.includes('DELETE') || log.action.includes('DAMAGE')) badgeClass = 'badge-danger';
                if (log.action.includes('LOGIN') || log.action.includes('CREATE')) badgeClass = 'badge-primary';

                return (
                  <tr key={log.id}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Clock size={13} style={{ color: 'var(--text-muted)' }} />
                        <span>{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <User size={14} style={{ color: '#059669' }} />
                        <strong>{log.userName || 'System Staff'}</strong>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${badgeClass}`} style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
                        {log.action}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{log.entity}</span>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-main)', maxWidth: '450px' }}>
                      {log.details || '—'}
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <ShieldAlert size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
                    <p>No audit log entries matching selected criteria.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
