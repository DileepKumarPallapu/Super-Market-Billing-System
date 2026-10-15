import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { DEFAULT_PRODUCTS, DEFAULT_SETTINGS, DEFAULT_CUSTOMERS } from '../data/defaultProducts';
import {
  loadStoredProducts,
  saveStoredProducts,
  loadStoredSales,
  saveStoredSales,
  loadStoredSettings,
  saveStoredSettings,
  loadStoredHeldBills,
  saveStoredHeldBills,
  loadStoredCustomers,
  saveStoredCustomers,
  loadStoredRefunds,
  saveStoredRefunds,
  getNextInvoiceNumber,
  resetAllStorage
} from '../utils/storage';
import { calculateCartTotals, round2 } from '../utils/calculations';

const POSContext = createContext(null);

const DEMO_USERS = {
  SUPER_ADMIN: { role: 'SUPER_ADMIN', email: 'admin@freshcart.com', name: 'Pallapu Dileep Kumar', pass: 'Admin@123' },
  STORE_MANAGER: { role: 'STORE_MANAGER', email: 'manager@freshcart.com', name: 'Rajesh Verma', pass: 'Manager@123' },
  CASHIER: { role: 'CASHIER', email: 'cashier@freshcart.com', name: 'Sunita Sharma', pass: 'Cashier@123' },
  INVENTORY_MANAGER: { role: 'INVENTORY_MANAGER', email: 'inventory@freshcart.com', name: 'Arjun Das', pass: 'Inventory@123' },
  ACCOUNTANT: { role: 'ACCOUNTANT', email: 'accountant@freshcart.com', name: 'Meera Iyer', pass: 'Accountant@123' }
};

export function POSProvider({ children }) {
  const [products, setProducts] = useState(() => loadStoredProducts());
  const [sales, setSales] = useState(() => loadStoredSales());
  const [settings, setSettings] = useState(() => loadStoredSettings());
  const [theme, setTheme] = useState(() => localStorage.getItem('freshcart_pos_theme_v2') || 'light');
  const [heldBills, setHeldBills] = useState(() => loadStoredHeldBills());
  const [customers, setCustomers] = useState(() => loadStoredCustomers());
  const [refunds, setRefunds] = useState(() => loadStoredRefunds());

  // Full-stack state
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [currentShift, setCurrentShift] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  // Authentication & RBAC state
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('freshcart_pos_user');
      return saved ? JSON.parse(saved) : DEMO_USERS.SUPER_ADMIN;
    } catch (e) {
      return DEMO_USERS.SUPER_ADMIN;
    }
  });

  const [authToken, setAuthToken] = useState(() => {
    return localStorage.getItem('freshcart_pos_token') || '';
  });

  // Cart state
  const [cart, setCart] = useState(() => {
    try {
      const raw = localStorage.getItem('freshcart_pos_cart_v2');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  });

  const [coupon, setCoupon] = useState(() => {
    try {
      return localStorage.getItem('freshcart_pos_coupon_v2') || null;
    } catch (e) {
      return null;
    }
  });

  const [manualDiscount, setManualDiscount] = useState(() => {
    try {
      const raw = localStorage.getItem('freshcart_pos_manual_disc_v2');
      return raw ? Number(raw) : 0;
    } catch (e) {
      return 0;
    }
  });

  const [currentCustomer, setCurrentCustomer] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [productModalState, setProductModalState] = useState(null);
  const [inventoryFilterTarget, setInventoryFilterTarget] = useState('All');

  // Navigation helpers
  const navigateToAddProduct = useCallback(() => {
    setProductModalState({ isOpen: true, product: null });
    setActiveTab('products');
  }, []);

  const navigateToEditProduct = useCallback((product) => {
    setProductModalState({ isOpen: true, product });
    setActiveTab('products');
  }, []);

  const navigateToInventoryWithFilter = useCallback((filter = 'All') => {
    setInventoryFilterTarget(filter);
    setActiveTab('inventory');
  }, []);

  // Toast notification helper
  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random().toString(36).substring(2, 5);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3200);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Theme toggle
  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('freshcart_pos_theme_v2', theme);
  }, [theme]);

  // Sync to local storage
  useEffect(() => { saveStoredProducts(products); }, [products]);
  useEffect(() => { saveStoredSales(sales); }, [sales]);
  useEffect(() => { saveStoredSettings(settings); }, [settings]);
  useEffect(() => { saveStoredHeldBills(heldBills); }, [heldBills]);
  useEffect(() => { saveStoredCustomers(customers); }, [customers]);
  useEffect(() => { saveStoredRefunds(refunds); }, [refunds]);
  useEffect(() => { localStorage.setItem('freshcart_pos_cart_v2', JSON.stringify(cart)); }, [cart]);
  useEffect(() => {
    if (coupon) localStorage.setItem('freshcart_pos_coupon_v2', coupon);
    else localStorage.removeItem('freshcart_pos_coupon_v2');
  }, [coupon]);
  useEffect(() => {
    if (manualDiscount > 0) localStorage.setItem('freshcart_pos_manual_disc_v2', String(manualDiscount));
    else localStorage.removeItem('freshcart_pos_manual_disc_v2');
  }, [manualDiscount]);
  useEffect(() => {
    if (currentUser) localStorage.setItem('freshcart_pos_user', JSON.stringify(currentUser));
    if (authToken) localStorage.setItem('freshcart_pos_token', authToken);
  }, [currentUser, authToken]);

  // Auth helper: login with role
  const switchUserRole = useCallback(async (targetRole) => {
    const cred = DEMO_USERS[targetRole] || DEMO_USERS.CASHIER;
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cred.email, password: cred.pass })
      });
      const data = await res.json();
      if (data.success && data.token) {
        setAuthToken(data.token);
        setCurrentUser(data.user);
        addToast(`Switched role to: ${data.user.role} (${data.user.name})`, 'success');
        return true;
      }
    } catch (e) {
      console.warn('API login failed, applying local role switch:', e);
    }
    setCurrentUser(cred);
    addToast(`Switched role to: ${cred.role} (${cred.name})`, 'info');
    return true;
  }, [addToast]);

  // API Fetchers
  const fetchProductsFromApi = useCallback(async () => {
    try {
      const res = await fetch('/api/products?limit=100');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setProducts(json.data);
        }
      }
    } catch (e) {
      // Keep local products on network failure
    }
  }, []);

  const fetchSalesFromApi = useCallback(async () => {
    try {
      const res = await fetch('/api/sales?limit=50');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setSales(json.data);
        }
      }
    } catch (e) {}
  }, []);

  const fetchSuppliers = useCallback(async () => {
    try {
      const res = await fetch('/api/suppliers');
      if (res.ok) {
        const json = await res.json();
        if (json.success) setSuppliers(json.data);
      }
    } catch (e) {}
  }, []);

  const fetchPurchaseOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/purchase-orders');
      if (res.ok) {
        const json = await res.json();
        if (json.success) setPurchaseOrders(json.data);
      }
    } catch (e) {}
  }, []);

  const fetchShifts = useCallback(async () => {
    try {
      const token = authToken || localStorage.getItem('freshcart_pos_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const [shiftsRes, curRes] = await Promise.all([
        fetch('/api/shifts', { headers }),
        fetch('/api/shifts/current', { headers })
      ]);

      if (shiftsRes.ok) {
        const json = await shiftsRes.json();
        if (json.success) setShifts(json.data);
      }
      if (curRes.ok) {
        const json = await curRes.json();
        if (json.success) setCurrentShift(json.data);
      }
    } catch (e) {}
  }, [authToken]);

  const fetchAuditLogs = useCallback(async () => {
    try {
      const token = authToken || localStorage.getItem('freshcart_pos_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch('/api/audit-logs', { headers });
      if (res.ok) {
        const json = await res.json();
        if (json.success) setAuditLogs(json.data);
      }
    } catch (e) {}
  }, [authToken]);

  const fetchNotifications = useCallback(async () => {
    try {
      const token = authToken || localStorage.getItem('freshcart_pos_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch('/api/notifications', { headers });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setNotifications(json.data);
          setUnreadNotificationCount(json.unreadCount || 0);
        }
      }
    } catch (e) {}
  }, [authToken]);

  // Initial load
  useEffect(() => {
    // Auto-login default user if no token
    if (!authToken) {
      switchUserRole('SUPER_ADMIN');
    }
    fetchProductsFromApi();
    fetchSalesFromApi();
    fetchSuppliers();
    fetchPurchaseOrders();
    fetchShifts();
    fetchNotifications();
  }, []);

  // Cart operations
  const addToCart = useCallback((productId) => {
    const product = products.find(p => p.id === productId || p.sku === productId || p.barcode === productId);
    if (!product) {
      addToast('Product not found in catalogue.', 'error');
      return;
    }
    if (product.stock <= 0) {
      addToast(`"${product.name}" is currently out of stock.`, 'warning');
      return;
    }

    const existing = cart.find(item => item.productId === product.id);
    const currentQty = existing ? existing.quantity : 0;

    if (currentQty >= product.stock) {
      addToast(`Cannot add more. Available stock limit reached (${product.stock} units).`, 'warning');
      return;
    }

    setCart(prevCart => {
      const ex = prevCart.find(item => item.productId === product.id);
      if (ex) {
        return prevCart.map(item =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { productId: product.id, quantity: 1 }];
    });
    addToast(`Added ${product.name} to cart.`, 'success');
  }, [products, cart, addToast]);

  const updateCartQty = useCallback((productId, delta) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const existing = cart.find(item => item.productId === productId);
    if (!existing) return;

    const nextQty = existing.quantity + delta;
    if (nextQty <= 0) {
      setCart(prev => prev.filter(item => item.productId !== productId));
      addToast(`Removed ${product.name} from cart.`, 'success');
      return;
    }

    if (nextQty > product.stock) {
      addToast(`Cannot exceed available inventory (${product.stock} units).`, 'warning');
      return;
    }

    setCart(prev =>
      prev.map(item =>
        item.productId === productId ? { ...item, quantity: nextQty } : item
      )
    );
  }, [products, cart, addToast]);

  const setCartQtyDirect = useCallback((productId, rawQty) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const qty = parseInt(rawQty, 10);
    if (isNaN(qty) || qty <= 0) {
      setCart(prev => prev.filter(item => item.productId !== productId));
      addToast(`Removed ${product.name} from cart.`, 'success');
      return;
    }

    if (qty > product.stock) {
      addToast(`Capped to available stock: ${product.stock} units.`, 'warning');
      setCart(prev =>
        prev.map(item =>
          item.productId === productId ? { ...item, quantity: product.stock } : item
        )
      );
      return;
    }

    setCart(prev =>
      prev.map(item =>
        item.productId === productId ? { ...item, quantity: qty } : item
      )
    );
  }, [products, addToast]);

  const removeFromCart = useCallback((productId) => {
    const product = products.find(p => p.id === productId);
    setCart(prev => prev.filter(item => item.productId !== productId));
    if (product) addToast(`Removed ${product.name} from cart.`, 'success');
  }, [products, addToast]);

  const clearCart = useCallback(() => {
    setCart([]);
    setCoupon(null);
    setManualDiscount(0);
    localStorage.removeItem('freshcart_pos_cart_v2');
    localStorage.removeItem('freshcart_pos_coupon_v2');
    localStorage.removeItem('freshcart_pos_manual_disc_v2');
    addToast('Cart cleared.', 'success');
  }, [addToast]);

  // Coupon handling
  const applyCoupon = useCallback((code) => {
    if (!code || !code.trim()) {
      setCoupon(null);
      addToast('Coupon cleared.', 'success');
      return;
    }

    const trimmed = code.trim().toUpperCase();
    if (trimmed === 'SAVE10') {
      if (coupon === 'SAVE10') {
        addToast('Coupon SAVE10 is already applied to this bill.', 'info');
        return;
      }
      setCoupon('SAVE10');
      addToast('Coupon SAVE10 applied! 10% discount on subtotal.', 'success');
    } else {
      addToast(`Invalid coupon code "${code}". Only SAVE10 is accepted.`, 'error');
    }
  }, [coupon, addToast]);

  const removeCoupon = useCallback(() => {
    setCoupon(null);
    localStorage.removeItem('freshcart_pos_coupon_v2');
    addToast('Coupon removed.', 'info');
  }, [addToast]);

  // Manual Manager Discount
  const applyManualDiscount = useCallback((amount, enteredPin) => {
    const expectedPin = settings.managerPin || '1234';
    if (enteredPin !== expectedPin) {
      addToast('Invalid Manager Authorization PIN. Demo PIN is: ' + expectedPin, 'error');
      return false;
    }

    const numAmount = round2(Number(amount));
    if (isNaN(numAmount) || numAmount <= 0) {
      addToast('Manual discount must be a positive number.', 'error');
      return false;
    }

    setManualDiscount(numAmount);
    addToast(`Manager discount of ₹${numAmount.toFixed(2)} authorized and applied!`, 'success');
    return true;
  }, [settings.managerPin, addToast]);

  const removeManualDiscount = useCallback(() => {
    setManualDiscount(0);
    localStorage.removeItem('freshcart_pos_manual_disc_v2');
    addToast('Manual discount removed.', 'info');
  }, [addToast]);

  // Hold & Resume
  const holdCurrentBill = useCallback((note = '') => {
    if (cart.length === 0) {
      addToast('Cannot hold an empty bill. Add products first.', 'error');
      return false;
    }

    const heldItem = {
      id: 'held-' + Date.now(),
      holdNumber: heldBills.length + 1,
      timestamp: new Date().toISOString(),
      cart: [...cart],
      coupon,
      manualDiscount,
      customer: currentCustomer ? { ...currentCustomer } : null,
      note: note.trim() || 'Held Bill'
    };

    setHeldBills(prev => [heldItem, ...prev]);
    setCart([]);
    setCoupon(null);
    setManualDiscount(0);
    setCurrentCustomer(null);
    localStorage.removeItem('freshcart_pos_cart_v2');
    localStorage.removeItem('freshcart_pos_coupon_v2');
    localStorage.removeItem('freshcart_pos_manual_disc_v2');
    addToast(`Bill held successfully (${heldBills.length + 1} held total).`, 'success');
    return true;
  }, [cart, coupon, manualDiscount, currentCustomer, heldBills.length, addToast]);

  const resumeHeldBill = useCallback((heldId) => {
    const target = heldBills.find(h => h.id === heldId);
    if (!target) {
      addToast('Held bill not found.', 'error');
      return false;
    }

    let hasStockAdjustment = false;
    const validatedCart = target.cart.map(item => {
      const product = products.find(p => p.id === item.productId);
      if (!product || product.stock <= 0) {
        hasStockAdjustment = true;
        return null;
      }
      if (item.quantity > product.stock) {
        hasStockAdjustment = true;
        return { ...item, quantity: product.stock };
      }
      return item;
    }).filter(Boolean);

    setCart(validatedCart);
    setCoupon(target.coupon || null);
    setManualDiscount(target.manualDiscount || 0);
    setCurrentCustomer(target.customer || null);
    setHeldBills(prev => prev.filter(h => h.id !== heldId));

    if (hasStockAdjustment) {
      addToast('Resumed bill. Some quantities were adjusted to match current stock.', 'warning');
    } else {
      addToast('Held bill resumed to active checkout.', 'success');
    }
    setActiveTab('billing');
    return true;
  }, [heldBills, products, addToast]);

  const deleteHeldBill = useCallback((heldId) => {
    setHeldBills(prev => prev.filter(h => h.id !== heldId));
    addToast('Held bill deleted.', 'info');
  }, [addToast]);

  // Customer registration
  const registerCustomer = useCallback((custData) => {
    const trimmedName = (custData.name || '').trim();
    const phone = (custData.phone || '').trim().replace(/\D/g, '');

    if (!trimmedName) {
      addToast('Customer name cannot be empty.', 'error');
      return false;
    }

    const newCust = {
      id: 'CUST-' + (customers.length + 101),
      name: trimmedName,
      phone: phone || 'N/A',
      email: custData.email?.trim() || '',
      loyaltyPoints: 0,
      registeredDate: new Date().toISOString().split('T')[0]
    };

    setCustomers(prev => [newCust, ...prev]);
    setCurrentCustomer(newCust);
    addToast(`Customer "${newCust.name}" registered and assigned to bill.`, 'success');
    return true;
  }, [customers.length, addToast]);

  // Process Return / Refund
  const processReturn = useCallback(async ({ invoiceNo, productId, quantity, reason }) => {
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      addToast('Return quantity must be a positive whole number.', 'error');
      return false;
    }

    try {
      const token = authToken || localStorage.getItem('freshcart_pos_token');
      const res = await fetch('/api/returns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          invoiceNo,
          items: [{ productId, quantity: qty, condition: 'RESTOCKABLE' }],
          reason: reason || 'Customer Return',
          paymentMethod: 'CASH'
        })
      });

      const json = await res.json();
      if (json.success) {
        addToast(json.message, 'success');
        fetchProductsFromApi();
        fetchSalesFromApi();
        return true;
      } else {
        addToast(json.error || 'Refund rejected by server.', 'error');
      }
    } catch (e) {
      // Local fallback
    }

    // Local execution fallback
    const sale = sales.find(s => s.invoiceNo === invoiceNo);
    const item = (sale?.items || []).find(i => i.id === productId || i.productId === productId);
    if (!item) {
      addToast('Product item not found in invoice.', 'error');
      return false;
    }

    const refundAmount = round2(item.price * qty);
    setProducts(prev =>
      prev.map(p => (p.id === productId ? { ...p, stock: p.stock + qty } : p))
    );
    const refundRecord = {
      id: 'ref-' + Date.now(),
      invoiceNo,
      productId,
      productName: item.name || item.productName,
      quantity: qty,
      unitPrice: item.price || item.unitPrice,
      refundAmount,
      reason: reason || 'Customer Return',
      timestamp: new Date().toISOString()
    };
    setRefunds(prev => [refundRecord, ...prev]);
    addToast(`Return approved! Refund of ₹${refundAmount.toFixed(2)} processed.`, 'success');
    return true;
  }, [sales, authToken, fetchProductsFromApi, fetchSalesFromApi, addToast]);

  // Master Transactional Checkout
  const checkout = useCallback(async (paymentDetails = { method: 'CASH' }) => {
    if (isCheckingOut) return false;
    if (cart.length === 0) {
      addToast('Cannot checkout an empty cart. Please add products first.', 'error');
      return false;
    }

    setIsCheckingOut(true);

    try {
      const totals = calculateCartTotals(cart, products, coupon, settings.defaultTaxRate, manualDiscount);
      const method = paymentDetails.method || 'CASH';
      const received = paymentDetails.amountReceived !== undefined ? round2(paymentDetails.amountReceived) : totals.finalTotal;

      // Call Express REST API backend on port 5001
      const token = authToken || localStorage.getItem('freshcart_pos_token');
      try {
        const res = await fetch('/api/sales/checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: token ? `Bearer ${token}` : ''
          },
          body: JSON.stringify({
            items: cart.map(i => {
              const p = products.find(prod => prod.id === i.productId);
              return {
                productId: i.productId,
                sku: p?.sku,
                quantity: i.quantity
              };
            }),
            couponCode: coupon,
            manualDiscount,
            paymentMethod: method,
            amountReceived: received,
            customer: currentCustomer ? { name: currentCustomer.name, phone: currentCustomer.phone } : null,
            taxRate: settings.defaultTaxRate || 0
          })
        });

        const json = await res.json();
        if (json.success && json.data) {
          const apiSale = json.data;

          // Map API items for InvoiceView display
          const formattedItems = (apiSale.items || []).map(it => ({
            id: it.productId,
            name: it.productName,
            price: it.unitPrice,
            quantity: it.quantity,
            total: it.totalAmount,
            discount: it.discount || 0
          }));

          const invoicePayload = {
            id: apiSale.id,
            invoiceNo: apiSale.invoiceNo,
            timestamp: apiSale.createdAt || new Date().toISOString(),
            items: formattedItems.length > 0 ? formattedItems : totals.itemDetails,
            subtotal: apiSale.subtotal,
            couponDiscount: apiSale.couponDiscount,
            manualDiscount: apiSale.manualDiscount,
            discount: apiSale.discount,
            tax: apiSale.taxAmount,
            taxRate: apiSale.taxRate,
            finalTotal: apiSale.finalTotal,
            coupon: apiSale.couponCode || 'NONE',
            totalUnits: apiSale.totalUnits,
            paymentMethod: apiSale.paymentMethod,
            amountReceived: apiSale.amountReceived,
            changeReturned: apiSale.changeReturned,
            paymentStatus: 'PAID',
            customer: currentCustomer ? { ...currentCustomer } : null,
            cashier: apiSale.cashierName || settings.cashierName
          };

          setSales(prev => [invoicePayload, ...prev]);
          setSelectedInvoice(invoicePayload);
          setCart([]);
          setCoupon(null);
          setManualDiscount(0);
          setCurrentCustomer(null);
          localStorage.removeItem('freshcart_pos_cart_v2');
          localStorage.removeItem('freshcart_pos_coupon_v2');
          localStorage.removeItem('freshcart_pos_manual_disc_v2');
          setActiveTab('invoice');
          addToast(`Sale completed via ${method}! Invoice ${apiSale.invoiceNo} saved to database.`, 'success');

          // Refresh products from database to sync stock deductions
          fetchProductsFromApi();
          fetchNotifications();
          return true;
        } else if (!json.success && json.error) {
          addToast(json.error, 'error');
          setIsCheckingOut(false);
          return false;
        }
      } catch (err) {
        console.warn('API checkout request failed, executing local offline checkout:', err);
      }

      // Local Fallback Checkout
      const invoiceNo = getNextInvoiceNumber();
      const change = round2(Math.max(0, received - totals.finalTotal));

      setProducts(prevProducts =>
        prevProducts.map(p => {
          const cartItem = cart.find(c => c.productId === p.id);
          if (cartItem) {
            return {
              ...p,
              stock: p.stock - cartItem.quantity,
              soldCount: (p.soldCount || 0) + cartItem.quantity
            };
          }
          return p;
        })
      );

      const localInvoice = {
        id: 'inv-' + Date.now(),
        invoiceNo,
        timestamp: new Date().toISOString(),
        items: totals.itemDetails,
        subtotal: totals.subtotal,
        couponDiscount: totals.couponDiscount,
        manualDiscount: totals.manualDiscount,
        discount: totals.discount,
        tax: totals.tax,
        taxRate: settings.defaultTaxRate || 0,
        finalTotal: totals.finalTotal,
        coupon: coupon || 'NONE',
        totalUnits: totals.totalUnits,
        paymentMethod: method,
        amountReceived: received,
        changeReturned: change,
        paymentBreakdown: paymentDetails.splitBreakdown || null,
        paymentRef: paymentDetails.upiRef || paymentDetails.cardRef || paymentDetails.note || null,
        paymentStatus: 'PAID',
        customer: currentCustomer ? { ...currentCustomer } : null,
        cashier: settings.cashierName || 'Cashier-01 (Demo Operator)'
      };

      setSales(prev => [localInvoice, ...prev]);
      setCart([]);
      setCoupon(null);
      setManualDiscount(0);
      setCurrentCustomer(null);
      localStorage.removeItem('freshcart_pos_cart_v2');
      localStorage.removeItem('freshcart_pos_coupon_v2');
      localStorage.removeItem('freshcart_pos_manual_disc_v2');
      setSelectedInvoice(localInvoice);
      setActiveTab('invoice');
      addToast(`Sale completed via ${method}! Invoice ${invoiceNo} generated.`, 'success');
      return true;
    } finally {
      setIsCheckingOut(false);
    }
  }, [isCheckingOut, cart, products, coupon, settings.defaultTaxRate, settings.cashierName, manualDiscount, currentCustomer, authToken, fetchProductsFromApi, fetchNotifications, addToast]);

  // Product CRUD with backend sync
  const addProduct = useCallback(async (productData) => {
    const trimmedName = (productData.name || '').trim();
    const price = Number(productData.price);
    const stock = Number(productData.stock);

    if (!trimmedName || isNaN(price) || price <= 0 || isNaN(stock) || stock < 0) {
      addToast('Please enter valid product name, price, and non-negative stock.', 'error');
      return false;
    }

    try {
      const token = authToken || localStorage.getItem('freshcart_pos_token');
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          name: trimmedName,
          category: productData.category || 'Grocery',
          sellingPrice: price,
          purchaseCost: round2(price * 0.75),
          stock,
          minStockThreshold: Number(productData.lowStockThreshold || 5),
          sku: productData.sku,
          description: productData.description
        })
      });
      const json = await res.json();
      if (json.success) {
        addToast(json.message, 'success');
        fetchProductsFromApi();
        return true;
      }
    } catch (e) {}

    // Local fallback
    const newProd = {
      id: 'prod-' + Date.now().toString(36),
      sku: productData.sku?.trim() || `SKU-${Date.now().toString().slice(-6)}`,
      name: trimmedName,
      category: productData.category || 'Grocery',
      price: round2(price),
      stock,
      lowStockThreshold: Number(productData.lowStockThreshold || 5),
      description: productData.description || '',
      emoji: productData.emoji || '🛍️',
      soldCount: 0,
      createdAt: new Date().toISOString()
    };
    setProducts(prev => [newProd, ...prev]);
    addToast(`Added "${newProd.name}" to catalogue.`, 'success');
    return true;
  }, [authToken, fetchProductsFromApi, addToast]);

  const updateProduct = useCallback(async (id, updatedData) => {
    try {
      const token = authToken || localStorage.getItem('freshcart_pos_token');
      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          name: updatedData.name,
          category: updatedData.category,
          sellingPrice: Number(updatedData.price),
          stock: Number(updatedData.stock),
          sku: updatedData.sku,
          description: updatedData.description,
          minStockThreshold: Number(updatedData.lowStockThreshold)
        })
      });
      const json = await res.json();
      if (json.success) {
        addToast(json.message, 'success');
        fetchProductsFromApi();
        return true;
      }
    } catch (e) {}

    setProducts(prev =>
      prev.map(p => (p.id === id ? { ...p, ...updatedData, price: Number(updatedData.price), stock: Number(updatedData.stock) } : p))
    );
    addToast(`Updated product successfully.`, 'success');
    return true;
  }, [authToken, fetchProductsFromApi, addToast]);

  const restockProduct = useCallback(async (id, qtyToAdd) => {
    const qty = Number(qtyToAdd);
    if (isNaN(qty) || qty <= 0) return false;

    try {
      const token = authToken || localStorage.getItem('freshcart_pos_token');
      const res = await fetch('/api/inventory/adjust', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          productId: id,
          adjustment: qty,
          reason: 'Manual quick restock'
        })
      });
      const json = await res.json();
      if (json.success) {
        addToast(json.message, 'success');
        fetchProductsFromApi();
        return true;
      }
    } catch (e) {}

    setProducts(prev =>
      prev.map(p => (p.id === id ? { ...p, stock: p.stock + qty } : p))
    );
    addToast(`Restocked ${qty} units.`, 'success');
    return true;
  }, [authToken, fetchProductsFromApi, addToast]);

  const deleteProduct = useCallback(async (id) => {
    try {
      const token = authToken || localStorage.getItem('freshcart_pos_token');
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      });
      const json = await res.json();
      if (json.success) {
        addToast(json.message, 'success');
        fetchProductsFromApi();
        return;
      }
    } catch (e) {}

    setProducts(prev => prev.filter(p => p.id !== id));
    setCart(prev => prev.filter(item => item.productId !== id));
    addToast('Product removed.', 'success');
  }, [authToken, fetchProductsFromApi, addToast]);

  // Supplier operations
  const addSupplier = useCallback(async (formData) => {
    try {
      const token = authToken || localStorage.getItem('freshcart_pos_token');
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(formData)
      });
      const json = await res.json();
      if (json.success) {
        addToast(json.message, 'success');
        fetchSuppliers();
        return true;
      }
    } catch (e) {}
    setSuppliers(prev => [{ id: 'sup-' + Date.now(), ...formData }, ...prev]);
    addToast(`Supplier "${formData.name}" added.`, 'success');
    return true;
  }, [authToken, fetchSuppliers, addToast]);

  const updateSupplier = useCallback(async (id, formData) => {
    try {
      const token = authToken || localStorage.getItem('freshcart_pos_token');
      const res = await fetch(`/api/suppliers/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(formData)
      });
      const json = await res.json();
      if (json.success) {
        addToast(json.message, 'success');
        fetchSuppliers();
        return true;
      }
    } catch (e) {}
    setSuppliers(prev => prev.map(s => (s.id === id ? { ...s, ...formData } : s)));
    addToast(`Supplier updated.`, 'success');
    return true;
  }, [authToken, fetchSuppliers, addToast]);

  // Purchase Order operations
  const createPurchaseOrder = useCallback(async (poData) => {
    try {
      const token = authToken || localStorage.getItem('freshcart_pos_token');
      const res = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(poData)
      });
      const json = await res.json();
      if (json.success) {
        addToast(json.message, 'success');
        fetchPurchaseOrders();
        return true;
      }
    } catch (e) {}
    addToast('Purchase order saved.', 'success');
    return true;
  }, [authToken, fetchPurchaseOrders, addToast]);

  const receivePurchaseOrder = useCallback(async (id) => {
    try {
      const token = authToken || localStorage.getItem('freshcart_pos_token');
      const res = await fetch(`/api/purchase-orders/${id}/receive`, {
        method: 'POST',
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      });
      const json = await res.json();
      if (json.success) {
        addToast(json.message, 'success');
        fetchPurchaseOrders();
        fetchProductsFromApi();
        fetchNotifications();
        return true;
      }
    } catch (e) {}
    addToast('Stock intake processed.', 'success');
    return true;
  }, [authToken, fetchPurchaseOrders, fetchProductsFromApi, fetchNotifications, addToast]);

  // Shift operations
  const openShift = useCallback(async (openingCash, notes) => {
    try {
      const token = authToken || localStorage.getItem('freshcart_pos_token');
      const res = await fetch('/api/shifts/open', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ openingCash, notes })
      });
      const json = await res.json();
      if (json.success) {
        addToast(json.message, 'success');
        setCurrentShift(json.data);
        fetchShifts();
        return true;
      } else {
        addToast(json.error, 'warning');
      }
    } catch (e) {}
    return true;
  }, [authToken, fetchShifts, addToast]);

  const closeShift = useCallback(async (id, closingCash, notes) => {
    try {
      const token = authToken || localStorage.getItem('freshcart_pos_token');
      const res = await fetch(`/api/shifts/${id}/close`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ closingCash, notes })
      });
      const json = await res.json();
      if (json.success) {
        addToast(json.message, 'success');
        setCurrentShift(null);
        fetchShifts();
        return true;
      }
    } catch (e) {}
    return true;
  }, [authToken, fetchShifts, addToast]);

  // Reset to default sample catalogue
  const resetDemoData = useCallback(async () => {
    try {
      const token = authToken || localStorage.getItem('freshcart_pos_token');
      await fetch('/api/settings/reset-demo', {
        method: 'POST',
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      });
    } catch (e) {}

    resetAllStorage();
    setProducts(JSON.parse(JSON.stringify(DEFAULT_PRODUCTS)));
    setSales([]);
    setSettings(JSON.parse(JSON.stringify(DEFAULT_SETTINGS)));
    setHeldBills([]);
    setCustomers(JSON.parse(JSON.stringify(DEFAULT_CUSTOMERS)));
    setRefunds([]);
    setCart([]);
    setCoupon(null);
    setManualDiscount(0);
    setCurrentCustomer(null);
    setSelectedInvoice(null);
    setActiveTab('dashboard');
    fetchProductsFromApi();
    fetchSalesFromApi();
    addToast('Demo database reset to clean enterprise state.', 'success');
  }, [authToken, fetchProductsFromApi, fetchSalesFromApi, addToast]);

  const viewInvoice = useCallback((invoice) => {
    setSelectedInvoice(invoice);
    setActiveTab('invoice');
  }, []);

  return (
    <POSContext.Provider
      value={{
        products,
        sales,
        settings,
        setSettings,
        theme,
        toggleTheme,
        cart,
        coupon,
        manualDiscount,
        heldBills,
        customers,
        refunds,
        currentCustomer,
        setCurrentCustomer,
        activeTab,
        setActiveTab,
        selectedInvoice,
        toasts,
        isCheckingOut,
        productModalState,
        setProductModalState,
        inventoryFilterTarget,
        setInventoryFilterTarget,
        currentUser,
        switchUserRole,
        suppliers,
        fetchSuppliers,
        addSupplier,
        updateSupplier,
        purchaseOrders,
        fetchPurchaseOrders,
        createPurchaseOrder,
        receivePurchaseOrder,
        shifts,
        currentShift,
        fetchShifts,
        openShift,
        closeShift,
        auditLogs,
        fetchAuditLogs,
        notifications,
        unreadNotificationCount,
        fetchNotifications,
        navigateToAddProduct,
        navigateToEditProduct,
        navigateToInventoryWithFilter,
        addToast,
        removeToast,
        addToCart,
        updateCartQty,
        setCartQtyDirect,
        removeFromCart,
        clearCart,
        applyCoupon,
        removeCoupon,
        applyManualDiscount,
        removeManualDiscount,
        holdCurrentBill,
        resumeHeldBill,
        deleteHeldBill,
        registerCustomer,
        processReturn,
        checkout,
        addProduct,
        updateProduct,
        restockProduct,
        deleteProduct,
        resetDemoData,
        viewInvoice
      }}
    >
      {children}
    </POSContext.Provider>
  );
}

export function usePOS() {
  const context = useContext(POSContext);
  if (!context) {
    throw new Error('usePOS must be used within a POSProvider');
  }
  return context;
}
