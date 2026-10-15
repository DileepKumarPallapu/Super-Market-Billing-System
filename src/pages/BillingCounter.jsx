import React, { useState, useRef } from 'react';
import { usePOS } from '../context/POSContext';
import { PRODUCT_CATEGORIES } from '../data/defaultProducts';
import { formatCurrency, calculateCartTotals, getStockStatus } from '../utils/calculations';
import CheckoutModal from '../components/CheckoutModal';
import ProductImage from '../components/ProductImage';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Tag,
  CheckCircle2,
  AlertCircle,
  Receipt,
  Sparkles,
  Package,
  Milk,
  Wheat,
  Candy,
  ShoppingBag,
  X,
  User,
  UserPlus,
  Clock,
  PauseCircle,
  ShieldCheck,
  KeyRound,
  Barcode,
  ArrowRight
} from 'lucide-react';

function getCategoryIcon(category, name) {
  const cat = (category || '').toLowerCase();
  const n = (name || '').toLowerCase();
  if (n.includes('milk') || cat.includes('dairy')) return <Milk size={20} />;
  if (n.includes('rice') || cat.includes('grain')) return <Wheat size={20} />;
  if (n.includes('sugar') || cat.includes('sweet') || cat.includes('snack')) return <Candy size={20} />;
  return <Package size={20} />;
}

export default function BillingCounter() {
  const {
    products,
    cart,
    addToCart,
    updateCartQty,
    setCartQtyDirect,
    removeFromCart,
    clearCart,
    coupon,
    applyCoupon,
    removeCoupon,
    manualDiscount,
    applyManualDiscount,
    removeManualDiscount,
    customers,
    currentCustomer,
    setCurrentCustomer,
    registerCustomer,
    heldBills,
    holdCurrentBill,
    resumeHeldBill,
    deleteHeldBill,
    checkout,
    isCheckingOut,
    settings,
    addToast
  } = usePOS();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('default'); // 'default', 'name', 'price_asc', 'price_desc', 'popularity'
  const [couponInput, setCouponInput] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');

  // Modal Dialog States
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isHeldBillsOpen, setIsHeldBillsOpen] = useState(false);
  const [isHoldModalOpen, setIsHoldModalOpen] = useState(false);
  const [holdNote, setHoldNote] = useState('');

  const [isNewCustomerOpen, setIsNewCustomerOpen] = useState(false);
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custEmail, setCustEmail] = useState('');

  const [isManagerModalOpen, setIsManagerModalOpen] = useState(false);
  const [mgrPin, setMgrPin] = useState('');
  const [mgrAmount, setMgrAmount] = useState('');
  const [mgrReason, setMgrReason] = useState('Store Loyalty Special');

  const searchInputRef = useRef(null);
  const barcodeInputRef = useRef(null);

  // Calculate cart totals including manual discount
  const totals = calculateCartTotals(cart, products, coupon, settings.defaultTaxRate, manualDiscount);

  // Filter products for the picker
  const filteredProducts = products.filter(p => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      p.name.toLowerCase().includes(q) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q));
    const matchesCategory =
      selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  }).sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'price_asc') return a.price - b.price;
    if (sortBy === 'price_desc') return b.price - a.price;
    if (sortBy === 'popularity') return (b.soldCount || 0) - (a.soldCount || 0);
    return 0;
  });

  // Barcode / SKU quick-add handler
  const handleBarcodeSubmit = (e) => {
    e?.preventDefault();
    const code = barcodeInput.trim();
    if (!code) return;

    const target = products.find(
      p =>
        (p.sku && p.sku.toUpperCase() === code.toUpperCase()) ||
        p.name.toLowerCase() === code.toLowerCase()
    );

    if (!target) {
      addToast(`No product found matching SKU / Barcode: "${code}"`, 'error');
    } else if (target.stock <= 0) {
      addToast(`Product "${target.name}" is out of stock!`, 'warning');
    } else {
      addToCart(target.id);
      setBarcodeInput('');
    }
  };

  const handleApplyCoupon = (e) => {
    e?.preventDefault();
    if (couponInput.trim()) {
      applyCoupon(couponInput);
      setCouponInput('');
    }
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter' && filteredProducts.length > 0) {
      e.preventDefault();
      const target = filteredProducts.find(p => p.stock > 0);
      if (target) {
        addToCart(target.id);
      }
    }
  };

  // Hold bill submission
  const handleConfirmHoldBill = (e) => {
    e?.preventDefault();
    const ok = holdCurrentBill(holdNote);
    if (ok) {
      setHoldNote('');
      setIsHoldModalOpen(false);
    }
  };

  // Customer registration
  const handleRegisterCustomerSubmit = (e) => {
    e?.preventDefault();
    const ok = registerCustomer({
      name: custName,
      phone: custPhone,
      email: custEmail
    });
    if (ok) {
      setCustName('');
      setCustPhone('');
      setCustEmail('');
      setIsNewCustomerOpen(false);
    }
  };

  // Manager discount submit
  const handleManagerDiscountSubmit = (e) => {
    e?.preventDefault();
    const amt = parseFloat(mgrAmount);
    if (isNaN(amt) || amt <= 0) {
      addToast('Please enter a valid discount amount.', 'error');
      return;
    }
    const ok = applyManualDiscount(amt, mgrReason, mgrPin);
    if (ok) {
      setMgrPin('');
      setMgrAmount('');
      setIsManagerModalOpen(false);
    }
  };

  const handleClearCartConfirm = () => {
    if (window.confirm('Are you sure you want to cancel and clear the active bill?')) {
      clearCart();
    }
  };

  return (
    <div className="billing-counter-page">
      {/* Top Customer Bar & Barcode Scanner */}
      <div
        className="card"
        style={{
          padding: '12px 18px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
          background: 'var(--panel)',
          border: '1px solid var(--line)'
        }}
      >
        {/* Customer Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--ink)' }}>
            <User size={16} style={{ color: 'var(--primary)' }} />
            <span style={{ fontSize: '13px', fontWeight: '700' }}>Customer:</span>
          </div>
          <select
            className="input"
            style={{ width: '220px', padding: '6px 12px', fontSize: '13px' }}
            value={currentCustomer?.id || ''}
            onChange={(e) => {
              const val = e.target.value;
              if (!val) {
                setCurrentCustomer(null);
              } else {
                const c = customers.find(item => item.id === val);
                setCurrentCustomer(c || null);
              }
            }}
          >
            <option value="">Walk-in Customer (Guest)</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.phone})
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setIsNewCustomerOpen(true)}
            title="Register a new customer"
          >
            <UserPlus size={14} /> + New
          </button>

          {currentCustomer && (
            <span
              style={{
                fontSize: '11.5px',
                background: 'var(--primary-soft)',
                color: 'var(--primary)',
                padding: '4px 10px',
                borderRadius: '99px',
                fontWeight: '600'
              }}
            >
              Points: {currentCustomer.loyaltyPoints || 0} pts
            </span>
          )}
        </div>

        {/* Barcode Scanner / SKU Wedge Input */}
        <form onSubmit={handleBarcodeSubmit} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ position: 'relative' }}>
            <Barcode
              size={16}
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--muted)'
              }}
            />
            <input
              ref={barcodeInputRef}
              className="input input-sm"
              style={{ paddingLeft: '32px', width: '240px', fontSize: '12px' }}
              placeholder="Barcode / SKU (Press Enter)"
              value={barcodeInput}
              onChange={e => setBarcodeInput(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-secondary btn-sm">
            Quick Add
          </button>
        </form>
      </div>

      <div className="billing-counter-grid">
        {/* Left Column: Product Selection Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Search, Sort & Category Filter Card */}
          <div className="card" style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
                <Search
                  size={18}
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--muted)'
                  }}
                />
                <input
                  ref={searchInputRef}
                  className="input search-input"
                  style={{ paddingLeft: '42px', paddingRight: searchQuery ? '40px' : '14px', fontSize: '14px' }}
                  placeholder="Search products by name or SKU (Press Enter to quick-add)…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--muted)',
                      cursor: 'pointer',
                      display: 'flex'
                    }}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Sort By Dropdown */}
              <select
                className="select sort-select"
                style={{ width: '170px', padding: '10px 12px', fontSize: '12.5px' }}
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                title="Sort product catalogue"
              >
                <option value="default">Sort: Default</option>
                <option value="name">Name (A–Z)</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="popularity">Popularity / Best Sellers</option>
              </select>
            </div>

            {/* Category Pills */}
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
              {PRODUCT_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  type="button"
                  className={`btn btn-sm ${selectedCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ borderRadius: '99px', fontSize: '12px', padding: '6px 14px', whiteSpace: 'nowrap' }}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '16px' }}>
            {filteredProducts.map(p => {
              const status = getStockStatus(p.stock, p.lowStockThreshold || settings.defaultLowStockThreshold || 5);
              const isOutOfStock = p.stock <= 0;
              const cartItem = cart.find(c => c.productId === p.id);
              const inCartQty = cartItem ? cartItem.quantity : 0;

              return (
                <div
                  key={p.id}
                  className="product-card product-picker-card"
                  onClick={() => !isOutOfStock && addToCart(p.id)}
                  style={{
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '210px',
                    position: 'relative',
                    cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                    opacity: isOutOfStock ? 0.6 : 1,
                    borderColor: inCartQty > 0 ? 'var(--primary-border)' : 'var(--line)'
                  }}
                >
                  {inCartQty > 0 && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        background: 'var(--primary)',
                        color: 'white',
                        fontSize: '11px',
                        fontWeight: '800',
                        padding: '2px 8px',
                        borderRadius: '99px',
                        zIndex: 2
                      }}
                    >
                      {inCartQty} in cart
                    </span>
                  )}

                  <div>
                    {/* Product Picture Thumbnail & Header */}
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                      <ProductImage src={p.image} alt={p.name} category={p.category} size={64} productId={p.id} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <span
                          className="badge"
                          style={{
                            fontSize: '10px',
                            padding: '2px 6px',
                            background: 'var(--bg)',
                            color: 'var(--ink-secondary)',
                            marginBottom: '4px',
                            display: 'inline-block'
                          }}
                        >
                          {p.category}
                        </span>
                        <strong className="picker-card-title" style={{ fontSize: '14.5px', color: 'var(--ink)', display: 'block', lineHeight: 1.25 }}>
                          {p.name}
                        </strong>
                        <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginTop: '2px', fontFamily: 'JetBrains Mono, monospace' }}>
                          {p.sku}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '12px' }}>
                      <span className="picker-card-price" style={{ fontSize: '18px', fontWeight: '800', color: 'var(--ink)' }}>
                        {formatCurrency(p.price)}
                      </span>
                      <span className={`badge badge-${status.variant}`} style={{ fontSize: '10.5px' }}>
                        {p.stock} in stock
                      </span>
                    </div>
                  </div>

                  <div style={{ marginTop: '14px', borderTop: '1px solid var(--line)', paddingTop: '12px' }}>
                    <button
                      type="button"
                      className={`btn ${isOutOfStock ? 'btn-secondary' : 'btn-soft'} btn-add-to-cart`}
                      style={{ width: '100%', fontSize: '12.5px', padding: '9px 12px' }}
                      disabled={isOutOfStock}
                      onClick={e => {
                        e.stopPropagation();
                        addToCart(p.id);
                      }}
                    >
                      {isOutOfStock ? (
                        'Out of Stock'
                      ) : (
                        <>
                          <Plus size={14} /> Add to Cart
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Active Bill / Cart & Breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card" style={{ position: 'sticky', top: '90px' }}>
            {/* Active Bill Header with Hold/Cancel buttons */}
            <div className="card-header" style={{ marginBottom: '14px', alignItems: 'flex-start' }}>
              <div>
                <h3>Active Bill</h3>
                <p>
                  {totals.totalUnits} unit{totals.totalUnits === 1 ? '' : 's'} ·{' '}
                  {currentCustomer ? currentCustomer.name : 'Walk-in Guest'}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                {heldBills.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setIsHeldBillsOpen(true)}
                    title="View and resume held bills"
                    style={{ background: 'var(--warning-soft)', color: 'var(--warning-dark, #b45309)', border: '1px solid var(--warning)' }}
                  >
                    <Clock size={13} /> Held ({heldBills.length})
                  </button>
                )}

                {cart.length > 0 && (
                  <>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setIsHoldModalOpen(true)}
                      title="Park bill temporarily"
                    >
                      <PauseCircle size={13} /> Hold
                    </button>

                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handleClearCartConfirm}
                      title="Clear active bill"
                    >
                      <Trash2 size={13} /> Clear
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Cart Items List */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                maxHeight: '320px',
                overflowY: 'auto',
                paddingRight: '4px'
              }}
            >
              {totals.itemDetails.length > 0 ? (
                totals.itemDetails.map(item => {
                  const product = products.find(p => p.id === item.id);
                  const isMaxStock = product && item.quantity >= product.stock;

                  return (
                    <div
                      key={item.id}
                      className="cart-item"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        background: 'var(--bg)',
                        borderRadius: 'var(--radius-md)',
                        gap: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                        <ProductImage
                          src={item.image || product?.image}
                          alt={item.name}
                          category={item.category}
                          size={40}
                          productId={item.id}
                        />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <strong style={{ fontSize: '13.5px', color: 'var(--ink)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.name}
                          </strong>
                          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                            {formatCurrency(item.price)} each · Avail: {product?.stock}
                          </span>
                        </div>
                      </div>

                      {/* Direct Editable Quantity + Steppers */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button
                          type="button"
                          className="btn btn-icon btn-sm"
                          style={{ width: '28px', height: '28px' }}
                          onClick={() => updateCartQty(item.id, -1)}
                          title="Decrease quantity"
                          aria-label="Decrease quantity"
                        >
                          <Minus size={13} />
                        </button>

                        <input
                          type="number"
                          min="1"
                          max={product?.stock || 999}
                          className="input"
                          style={{
                            width: '48px',
                            height: '28px',
                            padding: '2px',
                            textAlign: 'center',
                            fontSize: '13px',
                            fontWeight: '800'
                          }}
                          value={item.quantity}
                          onChange={(e) => setCartQtyDirect(item.id, e.target.value)}
                          title="Type quantity directly"
                        />

                        <button
                          type="button"
                          className="btn btn-icon btn-sm"
                          style={{ width: '28px', height: '28px' }}
                          disabled={isMaxStock}
                          onClick={() => updateCartQty(item.id, 1)}
                          title={isMaxStock ? 'Stock limit reached' : 'Increase quantity'}
                          aria-label="Increase quantity"
                        >
                          <Plus size={13} />
                        </button>
                      </div>

                      {/* Line Amount */}
                      <div style={{ textAlign: 'right', minWidth: '70px' }}>
                        <div style={{ fontWeight: '800', fontSize: '13.5px', color: 'var(--ink)' }}>
                          {formatCurrency(item.amount)}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--danger)',
                            fontSize: '11px',
                            cursor: 'pointer',
                            padding: '2px 0'
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="empty-state" style={{ padding: '36px 16px' }}>
                  <div className="empty-state-icon">
                    <ShoppingCart size={28} />
                  </div>
                  <h4>Shopping Cart is Empty</h4>
                  <p>Click "+ Add to Cart" or scan a barcode to begin billing.</p>
                </div>
              )}
            </div>

            {/* Promotional Coupon & Manager Discount Controls */}
            <div style={{ marginTop: '16px', borderTop: '1px dashed var(--line)', paddingTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                  <Tag size={14} /> Coupon / Discount
                </label>
                {!manualDiscount && (
                  <button
                    type="button"
                    onClick={() => setIsManagerModalOpen(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary)',
                      fontSize: '11.5px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontWeight: '600'
                    }}
                  >
                    <KeyRound size={12} /> Manager Discount
                  </button>
                )}
              </div>

              {coupon ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--success-soft)',
                    border: '1px solid var(--primary-border)',
                    marginBottom: '8px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={15} style={{ color: 'var(--success)' }} />
                    <span style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--success)' }}>
                      {coupon} Applied (10% Off)
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm btn-remove-coupon"
                    style={{ padding: '2px 8px', fontSize: '11px' }}
                    onClick={removeCoupon}
                    title="Remove coupon"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input
                    className="input input-sm coupon-input"
                    placeholder="Coupon code (e.g. SAVE10)"
                    value={couponInput}
                    onChange={e => setCouponInput(e.target.value)}
                  />
                  <button type="submit" className="btn btn-secondary btn-sm btn-apply-coupon">
                    Apply
                  </button>
                </form>
              )}

              {/* Manager Discount Badge if Applied */}
              {manualDiscount > 0 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: '#fef3c7',
                    border: '1px solid #fde68a',
                    marginTop: '6px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldCheck size={14} style={{ color: '#b45309' }} />
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#92400e' }}>
                      Manager Discount: −{formatCurrency(manualDiscount)}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '2px 6px', fontSize: '10.5px' }}
                    onClick={removeManualDiscount}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            {/* Savings Callout */}
            {totals.discount > 0 && (
              <div
                style={{
                  marginTop: '12px',
                  background: 'linear-gradient(135deg, #e6f7ef 0%, #d1fae5 100%)',
                  border: '1px solid #a7f3d0',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#065f46',
                  fontSize: '12px',
                  fontWeight: '700'
                }}
              >
                <Sparkles size={15} />
                <span>Total Discount Savings: {formatCurrency(totals.discount)}!</span>
              </div>
            )}

            {/* Bill Financial Summary */}
            <div
              style={{
                marginTop: '16px',
                borderTop: '1px dashed var(--line)',
                paddingTop: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                fontSize: '13px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ink-secondary)' }}>
                <span>Subtotal ({totals.totalUnits} items):</span>
                <strong className="summary-subtotal" style={{ color: 'var(--ink)' }}>{formatCurrency(totals.subtotal)}</strong>
              </div>

              {totals.couponDiscount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)' }}>
                  <span>Coupon Discount ({totals.coupon}):</span>
                  <strong className="summary-discount">− {formatCurrency(totals.couponDiscount)}</strong>
                </div>
              )}

              {totals.manualDiscount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b45309' }}>
                  <span>Manager Discount:</span>
                  <strong>− {formatCurrency(totals.manualDiscount)}</strong>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ink-secondary)' }}>
                <span>Tax ({settings.defaultTaxRate}%):</span>
                <strong>{formatCurrency(totals.tax)}</strong>
              </div>

              {/* Highlighted Amount Payable */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '20px',
                  fontWeight: '900',
                  color: 'var(--ink)',
                  background: 'var(--bg)',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  marginTop: '8px',
                  border: '1px solid var(--line)'
                }}
              >
                <span>Final Total:</span>
                <span className="grand-total-amount" style={{ color: 'var(--primary)' }}>{formatCurrency(totals.finalTotal)}</span>
              </div>
            </div>

            {/* Checkout Button */}
            <button
              type="button"
              className="btn btn-primary btn-proceed-checkout btn-checkout"
              style={{ width: '100%', marginTop: '16px', padding: '14px', fontSize: '15px' }}
              disabled={cart.length === 0 || isCheckingOut}
              onClick={() => setIsCheckoutOpen(true)}
            >
              <Receipt size={18} />
              <span>
                {isCheckingOut ? 'Processing Checkout…' : `Proceed to Payment (${formatCurrency(totals.finalTotal)}) →`}
              </span>
            </button>

            <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--muted)', marginTop: '8px' }}>
              ✓ Physical stock is deducted strictly upon completed payment.
            </p>
          </div>
        </div>
      </div>

      {/* 1. Payment / Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        totals={totals}
        customer={currentCustomer}
        onConfirmPayment={(paymentDetails) => {
          setIsCheckoutOpen(false);
          checkout(paymentDetails);
        }}
        isProcessing={isCheckingOut}
      />

      {/* 2. Hold Bill Dialog Modal */}
      {isHoldModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3>Hold Active Bill</h3>
              <button type="button" className="btn-close" onClick={() => setIsHoldModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleConfirmHoldBill}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <p style={{ fontSize: '13px', color: 'var(--ink-secondary)', margin: 0 }}>
                  This parks the active bill ({totals.totalUnits} items, {formatCurrency(totals.finalTotal)}) so you can serve the next customer. You can resume it anytime.
                </p>
                <div>
                  <label className="form-label">Note / Customer Identifier (Optional)</label>
                  <input
                    className="input"
                    placeholder="e.g. Customer stepped out for wallet"
                    value={holdNote}
                    onChange={e => setHoldNote(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsHoldModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Confirm Hold
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Held Bills List Modal */}
      {isHeldBillsOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>Parked / Held Bills ({heldBills.length})</h3>
              <button type="button" className="btn-close" onClick={() => setIsHeldBillsOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: '380px', overflowY: 'auto' }}>
              {heldBills.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--muted)', padding: '24px 0' }}>
                  No held bills in memory.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {heldBills.map(h => {
                    const heldItemsCount = h.cart.reduce((s, i) => s + i.quantity, 0);
                    return (
                      <div
                        key={h.id}
                        style={{
                          padding: '12px 16px',
                          border: '1px solid var(--line)',
                          borderRadius: 'var(--radius-md)',
                          background: 'var(--bg)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '12px'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong style={{ color: 'var(--ink)' }}>
                              Held #{h.holdNumber || 1}
                            </strong>
                            <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                              {new Date(h.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {h.customer && (
                              <span className="badge badge-success" style={{ fontSize: '10px' }}>
                                {h.customer.name}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--ink-secondary)', marginTop: '4px' }}>
                            {h.note || 'No note'} · <strong>{heldItemsCount} item(s)</strong>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => {
                              resumeHeldBill(h.id);
                              setIsHeldBillsOpen(false);
                            }}
                          >
                            Resume Bill
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => deleteHeldBill(h.id)}
                            title="Discard held bill"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="modal-footer" style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsHeldBillsOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. New Customer Registration Modal */}
      {isNewCustomerOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3>Register Customer</h3>
              <button type="button" className="btn-close" onClick={() => setIsNewCustomerOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleRegisterCustomerSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label className="form-label">Full Name *</label>
                  <input
                    className="input"
                    required
                    placeholder="e.g. Ramesh Sharma"
                    value={custName}
                    onChange={e => setCustName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="form-label">Mobile Number (10 digits)</label>
                  <input
                    className="input"
                    placeholder="e.g. 9876543210"
                    maxLength={10}
                    value={custPhone}
                    onChange={e => setCustPhone(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Email Address (Optional)</label>
                  <input
                    type="email"
                    className="input"
                    placeholder="e.g. ramesh@example.com"
                    value={custEmail}
                    onChange={e => setCustEmail(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsNewCustomerOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save & Assign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Manager PIN Discount Modal */}
      {isManagerModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3>Apply Manager Discount</h3>
              <button type="button" className="btn-close" onClick={() => setIsManagerModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleManagerDiscountSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label className="form-label">Manager Authorization PIN *</label>
                  <input
                    type="password"
                    className="input"
                    required
                    placeholder="Enter 4-digit PIN (demo: 1234)"
                    maxLength={6}
                    value={mgrPin}
                    onChange={e => setMgrPin(e.target.value)}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="form-label">Discount Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    max={totals.subtotal}
                    className="input"
                    required
                    placeholder={`Max ₹${totals.subtotal}`}
                    value={mgrAmount}
                    onChange={e => setMgrAmount(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Reason / Justification</label>
                  <input
                    className="input"
                    placeholder="e.g. Goodwill / Damaged package"
                    value={mgrReason}
                    onChange={e => setMgrReason(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsManagerModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Verify & Apply
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
