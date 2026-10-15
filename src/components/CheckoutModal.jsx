import React, { useState, useEffect, useMemo } from 'react';
import { formatCurrency, round2 } from '../utils/calculations';
import ProductImage from './ProductImage';
import {
  X,
  Banknote,
  QrCode,
  CreditCard,
  Layers,
  CheckCircle2,
  AlertCircle,
  Coins,
  ArrowRight,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

export default function CheckoutModal({
  isOpen,
  onClose,
  totals,
  customer,
  onConfirmPayment,
  isProcessing
}) {
  if (!isOpen) return null;

  const finalTotal = totals?.finalTotal || 0;
  const [paymentMethod, setPaymentMethod] = useState('CASH'); // 'CASH', 'UPI', 'CARD', 'SPLIT'

  // Cash state
  const [cashReceived, setCashReceived] = useState(String(finalTotal));
  
  // UPI state
  const [upiRef, setUpiRef] = useState('');
  const [isUpiConfirmed, setIsUpiConfirmed] = useState(false);

  // Card state
  const [cardType, setCardType] = useState('Visa');
  const [cardLast4, setCardLast4] = useState('');
  const [isCardConfirmed, setIsCardConfirmed] = useState(false);

  // Split payment state
  const [splitCash, setSplitCash] = useState('');
  const [splitUpi, setSplitUpi] = useState('');
  const [splitCard, setSplitCard] = useState('');

  // Reset initial inputs whenever modal opens or total changes
  useEffect(() => {
    setCashReceived(String(finalTotal));
    setUpiRef(`UPI-${Date.now().toString().slice(-6)}`);
    setIsUpiConfirmed(false);
    setCardLast4('4242');
    setIsCardConfirmed(false);
    setSplitCash(String(Math.floor(finalTotal / 2)));
    setSplitUpi(String(round2(finalTotal - Math.floor(finalTotal / 2))));
    setSplitCard('0');
  }, [finalTotal, isOpen]);

  // Cash Calculations
  const receivedNum = Number(cashReceived) || 0;
  const changeReturned = round2(Math.max(0, receivedNum - finalTotal));
  const cashBalanceDue = round2(Math.max(0, finalTotal - receivedNum));
  const isCashSufficient = receivedNum >= finalTotal;

  // Split Calculations
  const numSplitCash = Number(splitCash) || 0;
  const numSplitUpi = Number(splitUpi) || 0;
  const numSplitCard = Number(splitCard) || 0;
  const totalAllocated = round2(numSplitCash + numSplitUpi + numSplitCard);
  const splitRemaining = round2(finalTotal - totalAllocated);
  const isSplitValid = totalAllocated === finalTotal;

  // Round-up suggestions for cash
  const roundUpSuggestions = useMemo(() => {
    const suggestions = [finalTotal];
    const next10 = Math.ceil(finalTotal / 10) * 10;
    const next50 = Math.ceil(finalTotal / 50) * 50;
    const next100 = Math.ceil(finalTotal / 100) * 100;
    const next500 = Math.ceil(finalTotal / 500) * 500;
    const next1000 = Math.ceil(finalTotal / 1000) * 1000;

    [next10, next50, next100, next500, next1000].forEach(val => {
      if (val > finalTotal && !suggestions.includes(val)) {
        suggestions.push(val);
      }
    });
    return suggestions.slice(0, 5);
  }, [finalTotal]);

  const handleCashKeypadAdd = (amount) => {
    setCashReceived(prev => String(round2((Number(prev) || 0) + amount)));
  };

  const handleFinalize = () => {
    if (paymentMethod === 'CASH') {
      if (!isCashSufficient) return;
      onConfirmPayment({
        method: 'CASH',
        amountReceived: receivedNum,
        changeReturned
      });
    } else if (paymentMethod === 'UPI') {
      if (!isUpiConfirmed) return;
      onConfirmPayment({
        method: 'UPI',
        amountReceived: finalTotal,
        changeReturned: 0,
        upiRef: upiRef.trim() || 'UPI-STORE-DEMO'
      });
    } else if (paymentMethod === 'CARD') {
      if (!isCardConfirmed) return;
      onConfirmPayment({
        method: 'CARD',
        amountReceived: finalTotal,
        changeReturned: 0,
        cardType,
        cardRef: `CARD-${cardType}-${cardLast4 || 'XXXX'}`
      });
    } else if (paymentMethod === 'SPLIT') {
      if (!isSplitValid) return;
      onConfirmPayment({
        method: 'SPLIT',
        amountReceived: finalTotal,
        changeReturned: 0,
        splitBreakdown: {
          cash: numSplitCash,
          upi: numSplitUpi,
          card: numSplitCard
        }
      });
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1200 }}>
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '640px', width: '95%', padding: '24px' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '19px', fontWeight: '800', color: 'var(--ink)' }}>
              POS Checkout & Payment
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
              Select payment method, collect funds, and finalize invoice
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}
            title="Cancel Checkout"
          >
            <X size={20} />
          </button>
        </div>

        {/* Bill Summary Banner */}
        <div
          style={{
            background: 'var(--bg)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 18px',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: '700' }}>
              TOTAL AMOUNT PAYABLE
            </span>
            <div style={{ fontSize: '26px', fontWeight: '900', color: 'var(--primary)', lineHeight: 1.2 }}>
              {formatCurrency(finalTotal)}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: '2px' }}>
              Subtotal: {formatCurrency(totals.subtotal)}
              {totals.discount > 0 && ` • Discount: −${formatCurrency(totals.discount)}`}
              {totals.tax > 0 && ` • Tax: ${formatCurrency(totals.tax)}`}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span className="badge" style={{ background: 'var(--panel)', color: 'var(--ink-secondary)', border: '1px solid var(--line)' }}>
              <UserCheck size={12} /> {customer ? customer.name : 'Walk-in Customer'}
            </span>
            {customer?.phone && customer.phone !== 'N/A' && (
              <small style={{ display: 'block', color: 'var(--muted)', marginTop: '4px' }}>
                +91 {customer.phone}
              </small>
            )}
          </div>
        </div>

        {/* Order Items Preview */}
        {totals.itemDetails && totals.itemDetails.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '16px' }}>
            {totals.itemDetails.map(item => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'var(--panel)',
                  border: '1px solid var(--line)',
                  borderRadius: '99px',
                  padding: '3px 10px 3px 4px',
                  flexShrink: 0
                }}
              >
                <ProductImage src={item.image} alt={item.name} category={item.category} size={22} productId={item.id} />
                <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--ink)' }}>
                  {item.name} <span style={{ color: 'var(--muted)' }}>×{item.quantity}</span>
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Payment Method Selector Tabs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '20px' }}>
          <button
            type="button"
            className={`btn btn-sm btn-tab-cash ${paymentMethod === 'CASH' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '10px 4px', flexDirection: 'column', gap: '4px', height: 'auto' }}
            onClick={() => setPaymentMethod('CASH')}
          >
            <Banknote size={18} />
            <span style={{ fontSize: '12px' }}>Cash</span>
          </button>

          <button
            type="button"
            className={`btn btn-sm btn-tab-upi ${paymentMethod === 'UPI' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '10px 4px', flexDirection: 'column', gap: '4px', height: 'auto' }}
            onClick={() => setPaymentMethod('UPI')}
          >
            <QrCode size={18} />
            <span style={{ fontSize: '12px' }}>UPI QR</span>
          </button>

          <button
            type="button"
            className={`btn btn-sm btn-tab-card ${paymentMethod === 'CARD' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '10px 4px', flexDirection: 'column', gap: '4px', height: 'auto' }}
            onClick={() => setPaymentMethod('CARD')}
          >
            <CreditCard size={18} />
            <span style={{ fontSize: '12px' }}>Card</span>
          </button>

          <button
            type="button"
            className={`btn btn-sm btn-tab-split ${paymentMethod === 'SPLIT' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '10px 4px', flexDirection: 'column', gap: '4px', height: 'auto' }}
            onClick={() => setPaymentMethod('SPLIT')}
          >
            <Layers size={18} />
            <span style={{ fontSize: '12px' }}>Split Pay</span>
          </button>
        </div>

        {/* TAB 1: CASH PAYMENT */}
        {paymentMethod === 'CASH' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '12.5px' }}>
                Cash Amount Received from Customer (₹) *
              </label>
              <input
                className="input input-cash-received"
                type="number"
                min="0"
                step="1"
                style={{ fontSize: '18px', fontWeight: '800', color: 'var(--ink)' }}
                value={cashReceived}
                onChange={e => setCashReceived(e.target.value)}
                placeholder="0.00"
                autoFocus
              />
            </div>

            {/* Quick Suggested Amounts */}
            <div>
              <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                QUICK SUGGESTIONS (EXACT & ROUNDED)
              </span>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {roundUpSuggestions.map(amt => (
                  <button
                    key={amt}
                    type="button"
                    className={`btn btn-sm ${receivedNum === amt ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '12px', padding: '5px 12px' }}
                    onClick={() => setCashReceived(String(amt))}
                  >
                    {amt === finalTotal ? `Exact: ${formatCurrency(amt)}` : formatCurrency(amt)}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Add Keypad (+10, +50, +100, +500) */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {[10, 50, 100, 500].map(addVal => (
                <button
                  key={addVal}
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ flex: 1, padding: '5px 0', fontSize: '11.5px' }}
                  onClick={() => handleCashKeypadAdd(addVal)}
                >
                  +{addVal}
                </button>
              ))}
            </div>

            {/* Balance Due vs Change Returned Indicator */}
            {isCashSufficient ? (
              <div
                style={{
                  background: 'var(--success-soft)',
                  border: '1px solid var(--primary-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--success)', fontWeight: '700' }}>CHANGE TO RETURN</span>
                  <div style={{ fontSize: '20px', fontWeight: '900', color: 'var(--success)' }}>
                    {formatCurrency(changeReturned)}
                  </div>
                </div>
                <Coins size={28} style={{ color: 'var(--success)' }} />
              </div>
            ) : (
              <div
                style={{
                  background: 'var(--danger-soft)',
                  border: '1px solid var(--danger-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--danger)', fontWeight: '700' }}>OUTSTANDING BALANCE DUE</span>
                  <div style={{ fontSize: '18px', fontWeight: '900', color: 'var(--danger)' }}>
                    {formatCurrency(cashBalanceDue)}
                  </div>
                  <small style={{ color: 'var(--danger)' }}>Received amount must equal or exceed bill total.</small>
                </div>
                <AlertCircle size={24} style={{ color: 'var(--danger)' }} />
              </div>
            )}
          </div>
        )}

        {/* TAB 2: UPI PAYMENT */}
        {paymentMethod === 'UPI' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div
              style={{
                background: 'var(--bg)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                textAlign: 'center'
              }}
            >
              <QrCode size={64} style={{ color: 'var(--primary)', margin: '0 auto 8px' }} />
              <strong style={{ display: 'block', fontSize: '15px', color: 'var(--ink)' }}>
                Scan Store UPI QR Code
              </strong>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                orbitmarket.pos@retailbank · Amount: {formatCurrency(finalTotal)}
              </span>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '12.5px' }}>
                Bank UPI UTR / Transaction Reference ID *
              </label>
              <input
                className="input"
                value={upiRef}
                onChange={e => setUpiRef(e.target.value)}
                placeholder="e.g. UPI-948201948201"
              />
            </div>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '600',
                color: 'var(--ink)',
                padding: '10px',
                borderRadius: 'var(--radius-md)',
                background: isUpiConfirmed ? 'var(--success-soft)' : 'var(--bg)'
              }}
            >
              <input
                type="checkbox"
                checked={isUpiConfirmed}
                onChange={e => setIsUpiConfirmed(e.target.checked)}
                style={{ width: '16px', height: '16px' }}
              />
              <span>Operator confirms payment receipt on store UPI terminal (Demo Mode)</span>
            </label>
          </div>
        )}

        {/* TAB 3: DEBIT / CREDIT CARD */}
        {paymentMethod === 'CARD' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Card Network</label>
                <select className="select" value={cardType} onChange={e => setCardType(e.target.value)}>
                  <option value="Visa">Visa</option>
                  <option value="Mastercard">Mastercard</option>
                  <option value="RuPay">RuPay</option>
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Card Last 4 Digits</label>
                <input
                  className="input"
                  maxLength={4}
                  value={cardLast4}
                  onChange={e => setCardLast4(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 4242"
                />
              </div>
            </div>

            <div
              style={{
                background: 'var(--warning-soft)',
                border: '1px solid var(--warning-border)',
                borderRadius: 'var(--radius-md)',
                padding: '10px 14px',
                fontSize: '12px',
                color: 'var(--ink)'
              }}
            >
              <strong>Security Assurance:</strong> Only manual confirmation is recorded for this demo. Never enter sensitive full card numbers, CVVs, or bank PINs.
            </div>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '600',
                color: 'var(--ink)',
                padding: '10px',
                borderRadius: 'var(--radius-md)',
                background: isCardConfirmed ? 'var(--success-soft)' : 'var(--bg)'
              }}
            >
              <input
                type="checkbox"
                checked={isCardConfirmed}
                onChange={e => setIsCardConfirmed(e.target.checked)}
                style={{ width: '16px', height: '16px' }}
              />
              <span>Operator confirms swipe / dip approved on external card EDC machine</span>
            </label>
          </div>
        )}

        {/* TAB 4: SPLIT PAYMENT */}
        {paymentMethod === 'SPLIT' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--muted)' }}>
              Split the bill across multiple payment instruments (must sum to exact total):
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '11px' }}>Cash Amount (₹)</label>
                <input
                  className="input input-split-cash"
                  type="number"
                  min="0"
                  value={splitCash}
                  onChange={e => setSplitCash(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '11px' }}>UPI Amount (₹)</label>
                <input
                  className="input input-split-upi"
                  type="number"
                  min="0"
                  value={splitUpi}
                  onChange={e => setSplitUpi(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '11px' }}>Card Amount (₹)</label>
                <input
                  className="input input-split-card"
                  type="number"
                  min="0"
                  value={splitCard}
                  onChange={e => setSplitCard(e.target.value)}
                />
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                background: isSplitValid ? 'var(--success-soft)' : 'var(--danger-soft)',
                fontSize: '12.5px',
                fontWeight: '700',
                color: isSplitValid ? 'var(--success)' : 'var(--danger)'
              }}
            >
              <span>Allocated: {formatCurrency(totalAllocated)} / {formatCurrency(finalTotal)}</span>
              <span>
                {isSplitValid
                  ? '✓ Exact Allocation Ready'
                  : splitRemaining > 0
                  ? `Remaining: ${formatCurrency(splitRemaining)}`
                  : `Overallocated: ${formatCurrency(Math.abs(splitRemaining))}`}
              </span>
            </div>
          </div>
        )}

        {/* Modal Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '22px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isProcessing}>
            Cancel
          </button>

          <button
            type="button"
            className="btn btn-primary btn-confirm-payment btn-finalize-pay"
            style={{ minWidth: '220px' }}
            disabled={
              isProcessing ||
              (paymentMethod === 'CASH' && !isCashSufficient) ||
              (paymentMethod === 'UPI' && !isUpiConfirmed) ||
              (paymentMethod === 'CARD' && !isCardConfirmed) ||
              (paymentMethod === 'SPLIT' && !isSplitValid)
            }
            onClick={handleFinalize}
          >
            <CheckCircle2 size={16} />
            <span>
              {isProcessing
                ? 'Finalizing Transaction…'
                : paymentMethod === 'CASH'
                ? `Confirm Cash (${changeReturned > 0 ? `Change ₹${changeReturned}` : 'Exact'})`
                : `Confirm ${paymentMethod} Payment`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
