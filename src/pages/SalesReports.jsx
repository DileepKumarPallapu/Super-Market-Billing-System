import React, { useState } from 'react';
import { usePOS } from '../context/POSContext';
import { formatCurrency, round2 } from '../utils/calculations';
import { exportSalesToCsv } from '../utils/exportCsv';
import MetricCard from '../components/MetricCard';
import ProductImage from '../components/ProductImage';
import {
  TrendingUp,
  Percent,
  IndianRupee,
  Receipt,
  ShoppingCart,
  Download,
  Calendar,
  PackageCheck,
  Banknote,
  QrCode,
  CreditCard,
  Layers,
  RotateCcw
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

export default function SalesReports() {
  const { products, sales, refunds, addToast, setActiveTab } = usePOS();
  const [timeFilter, setTimeFilter] = useState('All');

  // Filter sales by date
  const filteredSales = sales.filter(s => {
    if (timeFilter === 'All') return true;
    const saleDate = new Date(s.timestamp);
    const now = new Date();
    if (timeFilter === 'today') {
      return saleDate.toDateString() === now.toDateString();
    }
    if (timeFilter === '7days') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return saleDate >= sevenDaysAgo;
    }
    if (timeFilter === '30days') {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return saleDate >= thirtyDaysAgo;
    }
    return true;
  });

  // Financial aggregates
  const grossSales = filteredSales.reduce((acc, s) => acc + (s.subtotal || 0), 0);
  const discountsGiven = filteredSales.reduce((acc, s) => acc + (s.discount || 0), 0);
  const rawNetSales = filteredSales.reduce((acc, s) => acc + (s.finalTotal || 0), 0);
  const totalRefundAmount = (refunds || []).reduce((acc, r) => acc + (r.refundAmount || 0), 0);
  const netRevenue = Math.max(0, rawNetSales - totalRefundAmount);

  const completedCount = filteredSales.length;
  const averageTransaction = completedCount > 0 ? rawNetSales / completedCount : 0;
  const totalUnitsSold = filteredSales.reduce((acc, s) => acc + (s.totalUnits || 0), 0);

  // Payment Breakdown
  const paymentStats = {
    CASH: { count: 0, total: 0 },
    UPI: { count: 0, total: 0 },
    CARD: { count: 0, total: 0 },
    SPLIT: { count: 0, total: 0 }
  };

  filteredSales.forEach(s => {
    const method = s.paymentMethod || 'CASH';
    if (!paymentStats[method]) {
      paymentStats[method] = { count: 0, total: 0 };
    }
    paymentStats[method].count += 1;
    paymentStats[method].total += (s.finalTotal || 0);
  });

  // Best selling products calculation
  const productAggregates = {};
  filteredSales.forEach(s => {
    (s.items || []).forEach(item => {
      if (!productAggregates[item.name]) {
        const prod = products?.find(p => p.id === item.productId || p.name === item.name);
        productAggregates[item.name] = {
          name: item.name,
          category: item.category || prod?.category || 'Grocery',
          image: item.image || prod?.image || null,
          productId: item.productId || prod?.id || null,
          units: 0,
          revenue: 0
        };
      }
      productAggregates[item.name].units += item.quantity;
      productAggregates[item.name].revenue += item.amount;
    });
  });

  const bestSellers = Object.values(productAggregates).sort((a, b) => b.units - a.units);

  // Chart data per invoice
  const chartData = filteredSales
    .slice(0, 10)
    .reverse()
    .map(s => ({
      name: s.invoiceNo,
      Subtotal: s.subtotal,
      Discount: s.discount,
      NetTotal: s.finalTotal
    }));

  const handleExportCsv = () => {
    if (sales.length === 0) {
      addToast('No completed sales available to export.', 'warning');
      return;
    }
    const success = exportSalesToCsv(filteredSales);
    if (success) {
      addToast('Sales report exported to CSV successfully.', 'success');
    }
  };

  return (
    <div className="reports-page">
      {/* Top Filter and Export Bar */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Calendar size={18} style={{ color: 'var(--muted)' }} />
            <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--ink)' }}>Date Filter:</span>
            <div style={{ display: 'flex', gap: '6px' }}>
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
              {timeFilter !== 'All' && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setTimeFilter('All')}
                  title="Reset date filter to All Time"
                >
                  Reset Filter
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary" onClick={() => setActiveTab('history')}>
              <Receipt size={15} />
              <span>View Transactions</span>
            </button>
            <button className="btn btn-primary" onClick={handleExportCsv}>
              <Download size={15} />
              <span>Export to CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Aggregate Metrics Grid */}
      <div className="metrics-grid">
        <MetricCard
          title="Gross Sales"
          value={formatCurrency(grossSales)}
          subtitle="Revenue before discounts"
          icon={IndianRupee}
          color="#3b82f6"
        />
        <MetricCard
          title="Discounts Given"
          value={formatCurrency(discountsGiven)}
          subtitle="Coupons & manager discounts"
          icon={Percent}
          color="#d97706"
        />
        <MetricCard
          title="Net Revenue"
          value={formatCurrency(netRevenue)}
          subtitle={totalRefundAmount > 0 ? `After ₹${totalRefundAmount.toFixed(2)} returns` : "Final settled sales revenue"}
          icon={TrendingUp}
          color="#087f5b"
        />
        <MetricCard
          title="Average Bill Value"
          value={formatCurrency(averageTransaction)}
          subtitle="Mean amount per invoice"
          icon={Receipt}
          color="#8b5cf6"
        />
      </div>

      {/* Secondary Metrics & Payment Breakdown */}
      <div className="metrics-grid" style={{ marginBottom: '28px' }}>
        <MetricCard
          title="Completed Transactions"
          value={completedCount}
          subtitle="Customer receipts issued"
          icon={Receipt}
          color="#0ea5e9"
        />
        <MetricCard
          title="Total Units Sold"
          value={totalUnitsSold.toLocaleString('en-IN')}
          subtitle="Physical products cleared"
          icon={PackageCheck}
          color="#10b981"
        />
        <MetricCard
          title="Processed Returns"
          value={(refunds || []).length}
          subtitle={`₹${totalRefundAmount.toFixed(2)} refunded total`}
          icon={RotateCcw}
          color="#ef4444"
        />
      </div>

      {/* Payment Channel Breakdown Cards */}
      <div className="card" style={{ marginBottom: '28px' }}>
        <div className="card-header">
          <div>
            <h3>Payment Method Breakdown</h3>
            <p>Collections split across Cash, UPI QR, Card EDC, and Multi-tender Split</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
          <div style={{ padding: '14px', background: 'var(--bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success)' }}>
              <Banknote size={18} />
              <strong style={{ fontSize: '13px' }}>Cash Payments</strong>
            </div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--ink)', marginTop: '8px' }}>
              {formatCurrency(paymentStats.CASH.total)}
            </div>
            <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
              {paymentStats.CASH.count} transaction{paymentStats.CASH.count === 1 ? '' : 's'}
            </span>
          </div>

          <div style={{ padding: '14px', background: 'var(--bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0ea5e9' }}>
              <QrCode size={18} />
              <strong style={{ fontSize: '13px' }}>UPI QR</strong>
            </div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--ink)', marginTop: '8px' }}>
              {formatCurrency(paymentStats.UPI.total)}
            </div>
            <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
              {paymentStats.UPI.count} transaction{paymentStats.UPI.count === 1 ? '' : 's'}
            </span>
          </div>

          <div style={{ padding: '14px', background: 'var(--bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#8b5cf6' }}>
              <CreditCard size={18} />
              <strong style={{ fontSize: '13px' }}>Card EDC</strong>
            </div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--ink)', marginTop: '8px' }}>
              {formatCurrency(paymentStats.CARD.total)}
            </div>
            <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
              {paymentStats.CARD.count} transaction{paymentStats.CARD.count === 1 ? '' : 's'}
            </span>
          </div>

          <div style={{ padding: '14px', background: 'var(--bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b' }}>
              <Layers size={18} />
              <strong style={{ fontSize: '13px' }}>Split Pay</strong>
            </div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--ink)', marginTop: '8px' }}>
              {formatCurrency(paymentStats.SPLIT.total)}
            </div>
            <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
              {paymentStats.SPLIT.count} transaction{paymentStats.SPLIT.count === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      </div>

      {/* Analytics Chart */}
      <div className="card" style={{ marginBottom: '28px' }}>
        <div className="card-header">
          <div>
            <h3>Financial Breakdown per Transaction</h3>
            <p>Subtotal vs. Discount vs. Net Total (INR)</p>
          </div>
        </div>

        {chartData.length > 0 ? (
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                <XAxis dataKey="name" stroke="var(--muted)" fontSize={11} />
                <YAxis stroke="var(--muted)" fontSize={11} tickFormatter={v => `₹${v}`} />
                <Tooltip
                  formatter={val => formatCurrency(val)}
                  contentStyle={{
                    backgroundColor: 'var(--panel)',
                    borderColor: 'var(--line)',
                    borderRadius: '12px',
                    color: 'var(--ink)'
                  }}
                />
                <Legend />
                <Bar dataKey="Subtotal" fill="#4B2142" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Discount" fill="#E9B44C" radius={[4, 4, 0, 0]} />
                <Bar dataKey="NetTotal" fill="#E76F51" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">
              <ShoppingCart size={28} />
            </div>
            <h4>No Financial Data to Display</h4>
            <p>Complete sales to generate analytical graphs.</p>
            <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('billing')}>
              Go to Billing Counter
            </button>
          </div>
        )}
      </div>

      {/* Best Sellers Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3>Product Performance Summary</h3>
            <p>Units sold and gross revenue contribution by item</p>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Category</th>
                <th>Units Sold</th>
                <th>Revenue Generated</th>
                <th>Contribution</th>
              </tr>
            </thead>
            <tbody>
              {bestSellers.length > 0 ? (
                bestSellers.map(item => {
                  const contribution = grossSales > 0 ? Math.round((item.revenue / grossSales) * 100) : 0;
                  return (
                    <tr key={item.name}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <ProductImage src={item.image} alt={item.name} category={item.category} size={36} productId={item.productId} />
                          <span style={{ fontWeight: '700', color: 'var(--ink)' }}>{item.name}</span>
                        </div>
                      </td>
                      <td>
                        <span className="badge" style={{ background: 'var(--bg)', color: 'var(--ink-secondary)' }}>
                          {item.category}
                        </span>
                      </td>
                      <td style={{ fontWeight: '700' }}>{item.units} unit(s)</td>
                      <td style={{ fontWeight: '700' }}>{formatCurrency(item.revenue)}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '100px', height: '6px', background: 'var(--line)', borderRadius: '99px', overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${contribution}%`,
                                height: '100%',
                                background: 'var(--primary)',
                                borderRadius: '99px'
                              }}
                            />
                          </div>
                          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{contribution}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: 'var(--muted)' }}>
                    No sales data available for the selected timeframe.
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
