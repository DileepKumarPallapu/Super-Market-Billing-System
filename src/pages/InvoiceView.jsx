import React, { useState } from 'react';
import { usePOS } from '../context/POSContext';
import { formatCurrency, numberToWordsINR } from '../utils/calculations';
import ProductImage from '../components/ProductImage';
import {
  Printer,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  UserCheck,
  CreditCard,
  Banknote,
  QrCode,
  Layers,
  FileText,
  RotateCcw
} from 'lucide-react';

export default function InvoiceView() {
  const { selectedInvoice, sales, setActiveTab, settings } = usePOS();
  const [printMode, setPrintMode] = useState('a4'); // 'a4' or 'thermal'

  // If no specific invoice was selected, fallback to the latest completed sale
  const invoice = selectedInvoice || sales[0];

  if (!invoice) {
    return (
      <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
        <div style={{ maxWidth: '400px', margin: '0 auto' }}>
          <FileText size={48} style={{ color: 'var(--brand-primary)', margin: '0 auto 1rem', opacity: 0.5 }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.5rem 0' }}>No Invoice to Display</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Complete a sale at the billing counter to generate a customer receipt.
          </p>
          <button className="btn btn-coral" onClick={() => setActiveTab('billing')}>
            Go to Billing Counter
          </button>
        </div>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  const isThermal = printMode === 'thermal';

  return (
    <div className="invoice-page">
      {/* Action Bar (Hidden during window.print) */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}
      >
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={() => setActiveTab('billing')}>
            <ArrowLeft size={15} /> Back to Billing
          </button>
          <button className="btn btn-secondary" onClick={() => setActiveTab('history')}>
            Order Archive
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {/* Print format switch */}
          <div style={{ display: 'flex', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', padding: '2px', border: '1px solid var(--border-soft)' }}>
            <button
              type="button"
              className={`btn btn-sm ${printMode === 'a4' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.75rem', padding: '4px 10px' }}
              onClick={() => setPrintMode('a4')}
            >
              Standard A4
            </button>
            <button
              type="button"
              className={`btn btn-sm ${printMode === 'thermal' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.75rem', padding: '4px 10px' }}
              onClick={() => setPrintMode('thermal')}
            >
              Thermal 80mm
            </button>
          </div>

          <button className="btn btn-coral" onClick={handlePrint}>
            <Printer size={16} />
            <span>Print Receipt</span>
          </button>
        </div>
      </div>

      {/* Printable Receipt / Tax Invoice */}
      <div
        className={`invoice-container invoice-paper card ${isThermal ? 'thermal-receipt thermal-paper' : ''}`}
        style={{
          maxWidth: isThermal ? '400px' : '780px',
          margin: '0 auto',
          padding: isThermal ? '1.5rem 1.25rem' : '2.5rem',
          background: '#FFFFFF',
          border: '1px solid var(--border-soft)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-md)',
          color: '#25232A'
        }}
      >
        {/* Receipt Header */}
        <div
          style={{
            display: 'flex',
            flexDirection: isThermal ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: isThermal ? 'center' : 'flex-start',
            textAlign: isThermal ? 'center' : 'left',
            borderBottom: '2px solid var(--border-soft)',
            paddingBottom: '1.25rem',
            marginBottom: '1.25rem',
            gap: '1rem'
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: isThermal ? 'center' : 'flex-start',
                gap: '0.75rem',
                marginBottom: '0.4rem'
              }}
            >
              <img src="/orbit-icon.svg" alt="ORBIT MARKET" style={{ width: '36px', height: '36px' }} />
              <div>
                <h2 style={{ fontSize: isThermal ? '1.25rem' : '1.5rem', fontWeight: 900, color: 'var(--brand-primary)', margin: 0, letterSpacing: '-0.3px' }}>
                  {settings.storeName || 'ORBIT MARKET'}
                </h2>
                <div style={{ fontSize: '0.72rem', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--brand-secondary)', fontWeight: 700 }}>
                  {settings.storeTagline || 'Intelligent Retail Studio'}
                </div>
              </div>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
              {settings.storeAddress || 'Hub 4, Orbit Avenue, Tech Retail Park, City - 560001'} · Ph: {settings.storePhone || '+91 98765 43210'}
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>
              <strong>GSTIN:</strong> 29ABCDE1234F1Z5 · <strong>FSSAI:</strong> 11223344556677
            </p>
          </div>

          <div style={{ textAlign: isThermal ? 'center' : 'right' }}>
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: isThermal ? '1.1rem' : '1.3rem',
                fontWeight: 900,
                color: 'var(--brand-primary)',
                display: 'block'
              }}
            >
              {invoice.invoiceNo}
            </span>
            <span className="badge badge-primary" style={{ marginTop: '4px', fontSize: '0.72rem' }}>
              <ShieldCheck size={12} /> TAX INVOICE
            </span>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {new Date(invoice.timestamp).toLocaleString('en-IN', {
                dateStyle: 'medium',
                timeStyle: 'short'
              })}
            </div>
          </div>
        </div>

        {/* Invoice Meta Bar: Cashier, Customer, Status */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isThermal ? '1fr' : 'repeat(3, 1fr)',
            gap: '0.75rem',
            background: 'var(--bg-porcelain)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.75rem 1rem',
            marginBottom: '1.25rem',
            fontSize: '0.82rem'
          }}
        >
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700 }}>Cashier Station</div>
            <strong style={{ color: 'var(--text-main)' }}>{invoice.cashier || settings.cashierName || 'Cashier-01'}</strong>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700 }}>Customer Details</div>
            <strong style={{ color: 'var(--text-main)' }}>
              {invoice.customer?.name ? `${invoice.customer.name} (${invoice.customer.phone || 'Phone N/A'})` : 'Walk-in Retail Shopper'}
            </strong>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700 }}>Payment Status</div>
            <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>
              <CheckCircle2 size={11} /> {invoice.paymentStatus || 'PAID'} ({invoice.paymentMethod || 'CASH'})
            </span>
          </div>
        </div>

        {/* Line Items Table */}
        <div style={{ marginBottom: '1.25rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-soft)', textAlign: 'left', background: 'var(--bg-subtle)' }}>
                <th style={{ padding: '8px 10px', fontSize: '0.74rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Item</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: '0.74rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Rate</th>
                <th style={{ padding: '8px 10px', textAlign: 'center', fontSize: '0.74rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Qty</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: '0.74rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {(invoice.items || []).map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                  <td style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ProductImage src={item.imageUrl} alt={item.name} size={30} productId={item.id} />
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{item.name}</div>
                      {item.discount > 0 && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-success)', fontWeight: 600 }}>
                          Save ₹{item.discount.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                    ₹{item.price.toFixed(2)}
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: 'var(--text-main)' }}>
                    {item.quantity}
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: 'var(--text-main)' }}>
                    ₹{(item.total || (item.price * item.quantity)).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bill Financial Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', borderTop: '2px dashed var(--border-soft)', paddingTop: '1rem', marginBottom: '1.25rem', fontSize: '0.88rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
            <span>Subtotal ({invoice.totalUnits || (invoice.items || []).reduce((s, i) => s + i.quantity, 0)} units):</span>
            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>₹{(invoice.subtotal || 0).toFixed(2)}</span>
          </div>

          {(invoice.discount > 0 || invoice.couponDiscount > 0) && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-success)', fontWeight: 600 }}>
              <span>Coupon Discount ({invoice.coupon || 'SAVE10'}):</span>
              <span>-₹{(invoice.discount || invoice.couponDiscount || 0).toFixed(2)}</span>
            </div>
          )}

          {invoice.manualDiscount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-success)', fontWeight: 600 }}>
              <span>Manager Loyalty Special:</span>
              <span>-₹{invoice.manualDiscount.toFixed(2)}</span>
            </div>
          )}

          {(invoice.tax > 0 || invoice.taxAmount > 0) && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
              <span>GST Tax ({invoice.taxRate || 0}%):</span>
              <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>₹{(invoice.tax || invoice.taxAmount || 0).toFixed(2)}</span>
            </div>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '2px solid var(--brand-primary)',
              paddingTop: '0.65rem',
              marginTop: '0.35rem',
              fontSize: '1.15rem',
              fontWeight: 900,
              color: 'var(--brand-primary)'
            }}
          >
            <span>Final Total Payable:</span>
            <span>₹{(invoice.finalTotal || 0).toFixed(2)}</span>
          </div>

          {/* Payment Method Breakdown */}
          {invoice.paymentMethod === 'CASH' && invoice.amountReceived !== undefined && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              <span>Cash Tendered: ₹{invoice.amountReceived.toFixed(2)}</span>
              <span style={{ fontWeight: 700, color: 'var(--color-success)' }}>
                Change Returned: ₹{(invoice.changeReturned || 0).toFixed(2)}
              </span>
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div style={{ textAlign: 'center', borderTop: '1px solid var(--border-soft)', paddingTop: '1rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          <p style={{ margin: 0, fontWeight: 600, color: 'var(--brand-primary)' }}>
            {settings.receiptFooter || 'Thank you for shopping at ORBIT MARKET! Experience Intelligent Retail.'}
          </p>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            This is a computer-generated tax invoice issued by ORBIT MARKET Intelligent Retail Studio.
          </p>
        </div>
      </div>
    </div>
  );
}
