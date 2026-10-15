import React, { useState, useMemo, useEffect } from 'react';
import { usePOS } from '../context/POSContext';
import { PRODUCT_CATEGORIES } from '../data/defaultProducts';
import { formatCurrency, getStockStatus } from '../utils/calculations';
import ConfirmationModal from '../components/ConfirmationModal';
import ProductImage from '../components/ProductImage';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Package,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function Products() {
  const {
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    settings,
    productModalState,
    setProductModalState
  } = usePOS();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [stockFilter, setStockFilter] = useState('All');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Form inputs
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: 'Grocery',
    price: '',
    stock: '',
    lowStockThreshold: '5',
    description: '',
    emoji: '🛍️'
  });

  const threshold = settings.defaultLowStockThreshold || 5;

  // Sync external navigation requests (e.g. from Dashboard or Inventory)
  useEffect(() => {
    if (productModalState?.isOpen) {
      if (productModalState.product) {
        handleOpenEdit(productModalState.product);
      } else {
        handleOpenAdd();
      }
      setProductModalState(null);
    }
  }, [productModalState, setProductModalState]);

  // Reset page to 1 whenever any search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, stockFilter, sortBy, sortOrder, pageSize]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    return products
      .filter(p => {
        const matchesSearch =
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesCategory =
          selectedCategory === 'All' || p.category === selectedCategory;

        let matchesStock = true;
        if (stockFilter === 'in_stock') matchesStock = p.stock > threshold;
        else if (stockFilter === 'low_stock') matchesStock = p.stock > 0 && p.stock <= threshold;
        else if (stockFilter === 'out_of_stock') matchesStock = p.stock <= 0;

        return matchesSearch && matchesCategory && matchesStock;
      })
      .sort((a, b) => {
        let valA = a[sortBy];
        let valB = b[sortBy];

        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [products, searchQuery, selectedCategory, stockFilter, sortBy, sortOrder, threshold]);

  // Pagination calculation
  const totalPages = pageSize === 'all' ? 1 : Math.max(1, Math.ceil(filteredProducts.length / Number(pageSize)));
  const paginatedProducts = useMemo(() => {
    if (pageSize === 'all') return filteredProducts;
    const size = Number(pageSize);
    const start = (currentPage - 1) * size;
    return filteredProducts.slice(start, start + size);
  }, [filteredProducts, currentPage, pageSize]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      sku: `SKU-${Date.now().toString().slice(-6)}`,
      category: 'Grocery',
      price: '',
      stock: '',
      lowStockThreshold: String(threshold),
      description: '',
      emoji: '🛍️',
      image: ''
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (p) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      sku: p.sku || '',
      category: p.category || 'Grocery',
      price: String(p.price),
      stock: String(p.stock),
      lowStockThreshold: String(p.lowStockThreshold || threshold),
      description: p.description || '',
      emoji: p.emoji || '🛍️',
      image: p.image || ''
    });
    setIsFormOpen(true);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (editingProduct) {
      const ok = updateProduct(editingProduct.id, formData);
      if (ok) setIsFormOpen(false);
    } else {
      const ok = addProduct(formData);
      if (ok) setIsFormOpen(false);
    }
  };

  const handleDelete = () => {
    if (deleteConfirmId) {
      deleteProduct(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const productToDelete = products.find(p => p.id === deleteConfirmId);

  const renderSortIndicator = (field) => {
    if (sortBy !== field) return null;
    return sortOrder === 'asc' ? <ArrowUp size={12} style={{ display: 'inline', marginLeft: '4px' }} /> : <ArrowDown size={12} style={{ display: 'inline', marginLeft: '4px' }} />;
  };

  return (
    <div className="products-page">
      {/* Controls & Filter Bar */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '280px', flexWrap: 'wrap' }}>
            {/* Search Input with Clear Button */}
            <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
              <input
                className="input"
                style={{ paddingLeft: '38px', paddingRight: searchQuery ? '36px' : '14px' }}
                placeholder="Search products by name or SKU…"
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
                  title="Clear search filter"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Category Filter */}
            <select
              className="select"
              style={{ width: 'auto', minWidth: '140px' }}
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              title="Filter by category"
            >
              {PRODUCT_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'All' ? 'All Categories' : cat}
                </option>
              ))}
            </select>

            {/* Stock Health Filter */}
            <select
              className="select"
              style={{ width: 'auto', minWidth: '140px' }}
              value={stockFilter}
              onChange={e => setStockFilter(e.target.value)}
              title="Filter by stock health"
            >
              <option value="All">All Stock Levels</option>
              <option value="in_stock">In Stock (&gt;{threshold})</option>
              <option value="low_stock">Low Stock (≤{threshold})</option>
              <option value="out_of_stock">Out of Stock (0)</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))}
              title={`Toggle sort order (currently ${sortOrder === 'asc' ? 'Ascending' : 'Descending'})`}
            >
              <ArrowUpDown size={14} />
              <span>{sortOrder === 'asc' ? 'Ascending' : 'Descending'}</span>
            </button>

            <button className="btn btn-primary" onClick={handleOpenAdd}>
              <Plus size={16} />
              <span>Add Product</span>
            </button>
          </div>
        </div>
      </div>

      {/* Products Table Card */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3>Catalogue Inventory ({filteredProducts.length} items)</h3>
            <p>Master price list and physical stock quantities</p>
          </div>
          <span className="badge badge-success">
            {products.length} registered
          </span>
        </div>

        <div className="table-responsive">
          <table className="table products-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('sku')} style={{ cursor: 'pointer' }} title="Sort by SKU">
                  SKU {renderSortIndicator('sku')}
                </th>
                <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }} title="Sort by Name">
                  Product Name {renderSortIndicator('name')}
                </th>
                <th onClick={() => handleSort('category')} style={{ cursor: 'pointer' }} title="Sort by Category">
                  Category {renderSortIndicator('category')}
                </th>
                <th onClick={() => handleSort('price')} style={{ cursor: 'pointer' }} title="Sort by Price">
                  Selling Price {renderSortIndicator('price')}
                </th>
                <th onClick={() => handleSort('stock')} style={{ cursor: 'pointer' }} title="Sort by Stock">
                  Stock Level {renderSortIndicator('stock')}
                </th>
                <th>Stock Valuation</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.length > 0 ? (
                paginatedProducts.map(p => {
                  const status = getStockStatus(p.stock, p.lowStockThreshold || threshold);
                  return (
                    <tr key={p.id}>
                      <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: 'var(--muted)' }}>
                        {p.sku || p.id}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <ProductImage src={p.image} alt={p.name} category={p.category} size={40} productId={p.id} />
                          <div>
                            <strong style={{ fontSize: '13.5px', color: 'var(--ink)' }}>{p.name}</strong>
                            {p.description && (
                              <small style={{ display: 'block', color: 'var(--muted)', fontSize: '11px' }}>
                                {p.description}
                              </small>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="badge" style={{ background: 'var(--bg)', color: 'var(--ink-secondary)' }}>
                          {p.category || 'Grocery'}
                        </span>
                      </td>
                      <td style={{ fontWeight: '700' }}>{formatCurrency(p.price)}</td>
                      <td style={{ fontWeight: '700' }}>
                        {p.stock}{' '}
                        <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 'normal' }}>units</span>
                      </td>
                      <td>{formatCurrency(p.price * p.stock)}</td>
                      <td>
                        <span className={`badge badge-${status.variant}`}>
                          {status.label}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleOpenEdit(p)}
                            title="Edit Product"
                          >
                            <Edit2 size={13} /> Edit
                          </button>
                          <button
                            className="btn btn-danger-soft btn-sm"
                            onClick={() => setDeleteConfirmId(p.id)}
                            title="Delete Product"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
                    <div className="empty-state">
                      <div className="empty-state-icon">
                        <Package size={28} />
                      </div>
                      <h4>No Products Match Filters</h4>
                      <p>Try clearing your search query or adjusting your category filter.</p>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedCategory('All');
                          setStockFilter('All');
                        }}
                      >
                        Clear Filters
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {filteredProducts.length > 0 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 20px',
              borderTop: '1px solid var(--line)',
              flexWrap: 'wrap',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--muted)' }}>
              <span>Show per page:</span>
              <select
                className="select"
                style={{ width: 'auto', padding: '4px 8px', fontSize: '12px' }}
                value={pageSize}
                onChange={e => setPageSize(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value="all">All ({filteredProducts.length})</option>
              </select>
              <span>
                Showing {pageSize === 'all' ? `all ${filteredProducts.length}` : `${Math.min(filteredProducts.length, (currentPage - 1) * Number(pageSize) + 1)} - ${Math.min(filteredProducts.length, currentPage * Number(pageSize))} of ${filteredProducts.length}`} items
              </span>
            </div>

            {pageSize !== 'all' && totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  title="Previous page"
                >
                  <ChevronLeft size={14} /> Previous
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                  <button
                    key={pageNum}
                    className={`btn btn-sm ${currentPage === pageNum ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ minWidth: '32px', padding: '4px 8px' }}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                ))}

                <button
                  className="btn btn-secondary btn-sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  title="Next page"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add / Edit Product Modal */}
      {isFormOpen && (
        <div className="modal-overlay" onClick={() => setIsFormOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--ink)' }}>
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}
                title="Close form"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div className="form-group">
                <label className="form-label">Product Name *</label>
                <input
                  className="input"
                  required
                  placeholder="e.g. Basmati Rice 1kg"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">SKU / Item Code</label>
                  <input
                    className="input"
                    placeholder="e.g. GRN-001"
                    value={formData.sku}
                    onChange={e => setFormData({ ...formData, sku: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="select"
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                  >
                    {PRODUCT_CATEGORIES.filter(c => c !== 'All').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Selling Price (₹) *</label>
                  <input
                    className="input"
                    required
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.price}
                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Available Stock *</label>
                  <input
                    className="input"
                    required
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={formData.stock}
                    onChange={e => setFormData({ ...formData, stock: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Low Stock Alert Threshold</label>
                <input
                  className="input"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="5"
                  value={formData.lowStockThreshold}
                  onChange={e => setFormData({ ...formData, lowStockThreshold: e.target.value })}
                />
                <small style={{ color: 'var(--muted)', fontSize: '11px' }}>
                  An alert will trigger when inventory drops to or below this number.
                </small>
              </div>

              <div className="form-group">
                <label className="form-label">Description (Optional)</label>
                <input
                  className="input"
                  placeholder="Short note about unit weight or brand"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsFormOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingProduct ? 'Save Changes' : 'Add to Catalogue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!deleteConfirmId}
        title="Delete Product"
        message={`Are you sure you want to remove "${productToDelete?.name}" from the product catalogue? Completed historical invoices will retain this item's details.`}
        confirmText="Delete Product"
        isDanger={true}
        onConfirm={handleDelete}
        onClose={() => setDeleteConfirmId(null)}
      />
    </div>
  );
}
