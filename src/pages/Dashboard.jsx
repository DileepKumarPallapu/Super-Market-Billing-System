import React, { useState, useMemo } from 'react';
import { usePOS } from '../context/POSContext';
import { formatCurrency, round2, getStockStatus } from '../utils/calculations';
import MetricCard from '../components/MetricCard';
import ProductImage from '../components/ProductImage';
import {
  Package,
  Boxes,
  IndianRupee,
  TrendingUp,
  Receipt,
  AlertTriangle,
  ShoppingCart,
  Calendar,
  ArrowRight,
  Eye,
  PlusCircle,
  PackagePlus,
  History,
  BarChart3,
  ExternalLink,
  Sparkles,
  ShoppingBag
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

export default function Dashboard() {
  const {
    products,
    sales,
    settings,
    setActiveTab,
    viewInvoice,
    navigateToAddProduct,
    navigateToEditProduct,
    navigateToInventoryWithFilter
  } = usePOS();

  const [dateFilter, setDateFilter] = useState('all'); // 'all', 'today', 'week', 'month'

  // Filter sales based on selected date filter
  const filteredSales = useMemo(() => {
    if (dateFilter === 'all') return sales;
    const now = new Date();
    return sales.filter(s => {
      const d = new Date(s.timestamp || s.createdAt);
      if (dateFilter === 'today') {
        return d.toDateString() === now.toDateString();
      }
      if (dateFilter === 'week') {
        return d >= new Date(now.getTime() - 7 * 86400000);
      }
      if (dateFilter === 'month') {
        return d >= new Date(now.getTime() - 30 * 86400000);
      }
      return true;
    });
  }, [sales, dateFilter]);

  // Metrics calculations from live database records
  const totalProducts = products.length;
  const totalUnits = products.reduce((acc, p) => acc + (p.stock || 0), 0);
  const totalStockValue = products.reduce((acc, p) => acc + (p.price * (p.stock || 0)), 0);
  const totalRevenue = filteredSales.reduce((acc, s) => acc + (s.finalTotal || 0), 0);
  const totalCompletedSales = filteredSales.length;
  const averageBill = totalCompletedSales > 0 ? totalRevenue / totalCompletedSales : 0;

  // Today's sales
  const todayStr = new Date().toDateString();
  const todaySales = sales.filter(s => new Date(s.timestamp || s.createdAt).toDateString() === todayStr);
  const todayRevenue = todaySales.reduce((acc, s) => acc + (s.finalTotal || 0), 0);

  // Low stock products
  const threshold = settings.defaultLowStockThreshold || 5;
  const lowStockProducts = products.filter(p => p.stock <= (p.lowStockThreshold || p.minStockThreshold || threshold));
  const lowStockCount = lowStockProducts.length;

  // Chart data from actual sales (grouped by invoice/date)
  const chartData = filteredSales
    .slice(0, 10)
    .reverse()
    .map(s => ({
      name: s.invoiceNo,
      revenue: s.finalTotal,
      subtotal: s.subtotal,
      units: s.totalUnits
    }));

  // Best sellers calculated from completed transactions
  const productSalesMap = {};
  filteredSales.forEach(sale => {
    (sale.items || []).forEach(item => {
      const key = item.name || item.productName;
      productSalesMap[key] = (productSalesMap[key] || 0) + item.quantity;
    });
  });

  const bestSellersList = products
    .map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
      image: p.image || p.imageUrl,
      sold: productSalesMap[p.name] || (dateFilter === 'all' ? p.soldCount || 0 : 0)
    }))
    .sort((a, b) => b.sold - a.sold);

  const maxSold = Math.max(1, ...bestSellersList.map(p => p.sold));

  return (
    <div className="dashboard-page">
      {/* Editorial Hero Banner — ORBIT MARKET Shopping Basket Motif */}
      <div
        className="card"
        style={{
          marginBottom: '1.5rem',
          padding: '1.75rem 2rem',
          background: 'linear-gradient(135deg, #4B2142 0%, #301429 100%)',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-md)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Subtle Decorative Orbit Ring Graphic */}
        <div style={{ position: 'absolute', right: '-40px', top: '-50px', width: '240px', height: '240px', border: '1.5px dashed rgba(233, 180, 76, 0.25)', borderRadius: '50%', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', right: '30px', bottom: '-60px', width: '180px', height: '180px', border: '1px solid rgba(231, 111, 81, 0.2)', borderRadius: '50%', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: '640px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
              <span style={{ background: 'var(--brand-secondary)', color: '#FFFFFF', fontSize: '0.72rem', fontWeight: 800, padding: '3px 8px', borderRadius: '12px', letterSpacing: '0.5px' }}>
                STUDIO v2.5
              </span>
              <span style={{ color: 'var(--brand-accent)', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>
                ORBIT MARKET INTELLIGENCE
              </span>
            </div>
            <h2 style={{ fontSize: '1.65rem', fontWeight: 900, color: '#FFFFFF', margin: '0 0 0.5rem 0', letterSpacing: '-0.4px' }}>
              Intelligent Retail & Point-of-Sale Studio
            </h2>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'rgba(247, 244, 239, 0.85)', lineHeight: 1.5 }}>
              Live synchronized inventory, itemized checkout calculations, multi-payment reconciliation, and verified vector product imaging.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              className="btn btn-coral"
              onClick={() => setActiveTab('billing')}
              style={{ padding: '0.65rem 1.25rem', fontSize: '0.95rem', fontWeight: 700 }}
            >
              <PlusCircle size={16} />
              <span>Launch POS Billing</span>
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setActiveTab('products')}
              style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#FFFFFF', borderColor: 'rgba(255, 255, 255, 0.2)' }}
            >
              <Package size={16} />
              <span>Browse 155+ Catalogue</span>
            </button>
          </div>
        </div>
      </div>

      {/* Date-Range Selector Bar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '0.85rem 1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={16} style={{ color: 'var(--text-secondary)' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>Analytics Timeframe:</span>
          </div>

          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {[
              { id: 'all', label: 'All Time' },
              { id: 'today', label: 'Today' },
              { id: 'week', label: 'Past 7 Days' },
              { id: 'month', label: 'Past 30 Days' }
            ].map(tab => (
              <button
                key={tab.id}
                className={`btn btn-sm ${dateFilter === tab.id ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setDateFilter(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Primary KPI Metrics */}
      <div className="metrics-grid">
        <MetricCard
          title="Master Catalogue"
          value={totalProducts}
          subtitle="Click to view all items"
          icon={Package}
          color="#4B2142"
          onClick={() => setActiveTab('products')}
        />
        <MetricCard
          title="Stock on Hand"
          value={totalUnits.toLocaleString('en-IN')}
          subtitle="Click to view inventory"
          icon={Boxes}
          color="#E76F51"
          onClick={() => setActiveTab('inventory')}
        />
        <MetricCard
          title="Inventory Valuation"
          value={formatCurrency(totalStockValue)}
          subtitle="Stock asset value at retail"
          icon={IndianRupee}
          color="#E9B44C"
          onClick={() => setActiveTab('inventory')}
        />
        <MetricCard
          title={dateFilter === 'all' ? 'Lifetime Revenue' : 'Period Revenue'}
          value={formatCurrency(totalRevenue)}
          subtitle={`${totalCompletedSales} completed bill${totalCompletedSales === 1 ? '' : 's'}`}
          icon={TrendingUp}
          color="#287D5A"
          onClick={() => setActiveTab('reports')}
        />
      </div>

      {/* Secondary Metrics */}
      <div className="metrics-grid">
        <MetricCard
          title="Today's Sales"
          value={formatCurrency(todayRevenue)}
          subtitle={`${todaySales.length} transaction${todaySales.length === 1 ? '' : 's'} today`}
          icon={Calendar}
          color="#4B2142"
          onClick={() => setActiveTab('reports')}
        />
        <MetricCard
          title="Transactions"
          value={totalCompletedSales}
          subtitle="Click to open ledger"
          icon={Receipt}
          color="#E76F51"
          onClick={() => setActiveTab('history')}
        />
        <MetricCard
          title="Average Order Value"
          value={formatCurrency(averageBill)}
          subtitle="Per completed invoice"
          icon={ShoppingCart}
          color="#6B6872"
          onClick={() => setActiveTab('reports')}
        />
        <MetricCard
          title="Safety Stock Alerts"
          value={lowStockCount}
          subtitle={`Threshold: ≤ ${threshold} units`}
          icon={AlertTriangle}
          color={lowStockCount > 0 ? '#B42332' : '#287D5A'}
          onClick={() => navigateToInventoryWithFilter('low_stock')}
        />
      </div>

      <div className="dashboard-charts-grid">
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--brand-primary)' }}>Turnover Performance</h3>
              <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Revenue trajectory · {dateFilter.toUpperCase()}</p>
            </div>
            {filteredSales.length > 0 && (
              <span className="badge badge-success">
                {filteredSales.length} record{filteredSales.length === 1 ? '' : 's'}
              </span>
            )}
          </div>

          {chartData.length > 0 ? (
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4B2142" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#E76F51" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} tickFormatter={v => `₹${v}`} />
                  <Tooltip
                    formatter={val => [formatCurrency(val), 'Net Total']}
                    contentStyle={{
                      backgroundColor: 'var(--bg-card)',
                      borderColor: 'var(--border-soft)',
                      borderRadius: '10px',
                      color: 'var(--text-main)',
                      boxShadow: 'var(--shadow-md)'
                    }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#4B2142" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <TrendingUp size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
              <h4 style={{ margin: '0 0 0.25rem 0' }}>No Completed Transactions in Period</h4>
              <p style={{ margin: 0, fontSize: '0.85rem' }}>Complete sales at the billing counter to view real-time revenue analytics.</p>
            </div>
          )}
        </div>

        {/* Best Sellers */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--brand-primary)' }}>Best-Selling Items</h3>
              <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Cumulative units settled from database checkout</p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('reports')}>
              Details <ArrowRight size={13} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {bestSellersList.slice(0, 5).map(prod => {
              const pct = Math.round((prod.sold / maxSold) * 100);
              return (
                <div key={prod.name}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
                    <ProductImage src={prod.image} alt={prod.name} category={prod.category} size={38} productId={prod.id} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {prod.name}
                        </span>
                        <span style={{ color: 'var(--brand-secondary)', fontWeight: 700, flexShrink: 0, marginLeft: '0.5rem' }}>
                          {prod.sold} sold
                        </span>
                      </div>
                    </div>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'var(--bg-subtle)', borderRadius: '99px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${pct}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #4B2142, #E76F51)',
                        borderRadius: '99px',
                        transition: 'width 0.4s ease'
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
