import React, { useState, useEffect } from 'react';
import { usePOS } from '../context/POSContext';
import {
  Truck,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  FileText,
  CheckCircle2,
  XCircle,
  Edit2,
  Building2
} from 'lucide-react';

export default function Suppliers() {
  const { suppliers, addSupplier, updateSupplier, fetchSuppliers } = usePOS();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    gstin: '',
    paymentTerms: 'Net 30'
  });

  useEffect(() => {
    if (fetchSuppliers) fetchSuppliers();
  }, [fetchSuppliers]);

  const handleOpenAdd = () => {
    setEditingSupplier(null);
    setFormData({
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      gstin: '',
      paymentTerms: 'Net 30'
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (s) => {
    setEditingSupplier(s);
    setFormData({
      name: s.name || '',
      contactPerson: s.contactPerson || '',
      phone: s.phone || '',
      email: s.email || '',
      address: s.address || '',
      gstin: s.gstin || '',
      paymentTerms: s.paymentTerms || 'Net 30'
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingSupplier) {
      await updateSupplier(editingSupplier.id, formData);
    } else {
      await addSupplier(formData);
    }
    setModalOpen(false);
  };

  const filtered = (suppliers || []).filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.contactPerson && s.contactPerson.toLowerCase().includes(search.toLowerCase())) ||
    (s.phone && s.phone.includes(search))
  );

  return (
    <div className="page-container">
      {/* Header Controls */}
      <div className="section-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="icon-pill" style={{ background: '#ecfdf5', color: '#059669', padding: '10px', borderRadius: '10px', display: 'flex', alignItems: 'center' }}>
            <Truck size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>Supplier & Vendor Directory</h2>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Manage wholesale distributors, procurement agreements, and GSTIN records</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div className="search-box" style={{ minWidth: '260px' }}>
            <Search size={16} />
            <input
              type="text"
              placeholder="Search by vendor, contact, phone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            <Plus size={16} />
            <span>Add Supplier</span>
          </button>
        </div>
      </div>

      {/* Grid of Suppliers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
        {filtered.map(s => (
          <div key={s.id} className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.25rem 0', color: 'var(--text-main)' }}>{s.name}</h3>
                  <span style={{ fontSize: '0.8rem', background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
                    {s.paymentTerms || 'Net 30'}
                  </span>
                </div>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleOpenEdit(s)}
                  style={{ padding: '6px' }}
                  title="Edit Supplier"
                >
                  <Edit2 size={14} />
                </button>
              </div>

              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.75rem' }}>
                {s.contactPerson && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Building2 size={14} style={{ color: '#059669' }} />
                    <span>Contact: <strong style={{ color: 'var(--text-main)' }}>{s.contactPerson}</strong></span>
                  </div>
                )}
                {s.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Phone size={14} style={{ color: '#059669' }} />
                    <span>{s.phone}</span>
                  </div>
                )}
                {s.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Mail size={14} style={{ color: '#059669' }} />
                    <span>{s.email}</span>
                  </div>
                )}
                {s.address && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <MapPin size={14} style={{ color: '#059669', marginTop: '2px' }} />
                    <span>{s.address}</span>
                  </div>
                )}
                {s.gstin && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <FileText size={14} style={{ color: '#059669' }} />
                    <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>GSTIN: {s.gstin}</span>
                  </div>
                )}
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '1rem', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Products Supplied: <strong>{s.productsCount || 0}</strong></span>
              <span className={`badge ${s.isActive !== false ? 'badge-success' : 'badge-danger'}`}>
                {s.isActive !== false ? 'Active Vendor' : 'Inactive'}
              </span>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="card" style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Truck size={40} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
            <p>No suppliers found matching your query.</p>
          </div>
        )}
      </div>

      {/* Add / Edit Supplier Modal */}
      {modalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>{editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}</h3>
              <button className="btn-close" onClick={() => setModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div className="form-group">
                  <label>Supplier / Company Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Apex Agri Foods Ltd."
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label>Contact Person</label>
                    <input
                      type="text"
                      value={formData.contactPerson}
                      onChange={e => setFormData({ ...formData, contactPerson: e.target.value })}
                      placeholder="e.g. Anand Murthy"
                    />
                  </div>
                  <div className="form-group">
                    <label>Payment Terms</label>
                    <select
                      value={formData.paymentTerms}
                      onChange={e => setFormData({ ...formData, paymentTerms: e.target.value })}
                    >
                      <option value="Immediate">Immediate / Cash</option>
                      <option value="Net 15">Net 15 Days</option>
                      <option value="Net 30">Net 30 Days</option>
                      <option value="Net 60">Net 60 Days</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label>Phone Number</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+91 98..."
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      placeholder="sales@vendor.com"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>GSTIN</label>
                  <input
                    type="text"
                    value={formData.gstin}
                    onChange={e => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                    placeholder="29ABCDE1234F1Z5"
                  />
                </div>
                <div className="form-group">
                  <label>Address / Warehouse Location</label>
                  <textarea
                    rows={2}
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Plot 45, APMC Yard..."
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingSupplier ? 'Save Changes' : 'Create Supplier'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
