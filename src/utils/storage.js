import { DEFAULT_PRODUCTS, DEFAULT_SETTINGS, DEFAULT_CUSTOMERS } from '../data/defaultProducts';

const STORAGE_KEYS = {
  PRODUCTS: 'freshcart_pos_products_v2',
  SALES: 'freshcart_pos_sales_v2',
  SETTINGS: 'freshcart_pos_settings_v2',
  INVOICE_COUNTER: 'freshcart_pos_inv_counter_v2',
  THEME: 'freshcart_pos_theme_v2',
  HELD_BILLS: 'freshcart_pos_held_bills_v2',
  CUSTOMERS: 'freshcart_pos_customers_v2',
  REFUNDS: 'freshcart_pos_refunds_v2'
};

export function loadStoredProducts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(p => {
          if (!p.image) {
            const def = DEFAULT_PRODUCTS.find(d => d.id === p.id || d.name.toLowerCase() === p.name.toLowerCase());
            if (def && def.image) {
              return { ...p, image: def.image };
            }
          }
          return p;
        });
      }
    }
  } catch (err) {
    console.error('Failed to load products from localStorage:', err);
  }
  // Initialize with default sample products
  saveStoredProducts(DEFAULT_PRODUCTS);
  return JSON.parse(JSON.stringify(DEFAULT_PRODUCTS));
}

export function saveStoredProducts(products) {
  try {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  } catch (err) {
    console.error('Failed to save products to localStorage:', err);
  }
}

export function loadStoredSales() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SALES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map(s => ({
          ...s,
          items: (s.items || []).map(i => {
            if (!i.image) {
              const def = DEFAULT_PRODUCTS.find(d => d.id === i.id || d.name.toLowerCase() === i.name.toLowerCase());
              if (def && def.image) {
                return { ...i, image: def.image };
              }
            }
            return i;
          })
        }));
      }
    }
  } catch (err) {
    console.error('Failed to load sales from localStorage:', err);
  }
  return [];
}

export function saveStoredSales(sales) {
  try {
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
  } catch (err) {
    console.error('Failed to save sales to localStorage:', err);
  }
}

export function loadStoredSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (err) {
    console.error('Failed to load settings from localStorage:', err);
  }
  return { ...DEFAULT_SETTINGS };
}

export function saveStoredSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save settings to localStorage:', err);
  }
}

export function loadStoredHeldBills() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HELD_BILLS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Failed to load held bills from localStorage:', err);
  }
  return [];
}

export function saveStoredHeldBills(heldBills) {
  try {
    localStorage.setItem(STORAGE_KEYS.HELD_BILLS, JSON.stringify(heldBills));
  } catch (err) {
    console.error('Failed to save held bills to localStorage:', err);
  }
}

export function loadStoredCustomers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.error('Failed to load customers from localStorage:', err);
  }
  saveStoredCustomers(DEFAULT_CUSTOMERS);
  return JSON.parse(JSON.stringify(DEFAULT_CUSTOMERS));
}

export function saveStoredCustomers(customers) {
  try {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
  } catch (err) {
    console.error('Failed to save customers to localStorage:', err);
  }
}

export function loadStoredRefunds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.REFUNDS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Failed to load refunds from localStorage:', err);
  }
  return [];
}

export function saveStoredRefunds(refunds) {
  try {
    localStorage.setItem(STORAGE_KEYS.REFUNDS, JSON.stringify(refunds));
  } catch (err) {
    console.error('Failed to save refunds to localStorage:', err);
  }
}

export function getNextInvoiceNumber() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.INVOICE_COUNTER);
    let count = raw ? parseInt(raw, 10) : 1001;
    if (isNaN(count)) count = 1001;
    localStorage.setItem(STORAGE_KEYS.INVOICE_COUNTER, String(count + 1));
    return `FC-${count}`;
  } catch (err) {
    return `FC-${Date.now().toString().slice(-4)}`;
  }
}

export function resetAllStorage() {
  try {
    localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
    localStorage.removeItem(STORAGE_KEYS.SALES);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    localStorage.removeItem(STORAGE_KEYS.INVOICE_COUNTER);
    localStorage.removeItem(STORAGE_KEYS.HELD_BILLS);
    localStorage.removeItem(STORAGE_KEYS.CUSTOMERS);
    localStorage.removeItem(STORAGE_KEYS.REFUNDS);
    localStorage.removeItem('freshcart_pos_cart_v2');
    localStorage.removeItem('freshcart_pos_coupon_v2');
    localStorage.removeItem('freshcart-pos-state');

    saveStoredProducts(DEFAULT_PRODUCTS);
    saveStoredSettings(DEFAULT_SETTINGS);
    saveStoredCustomers(DEFAULT_CUSTOMERS);
  } catch (err) {
    console.error('Failed to reset localStorage:', err);
  }
}
