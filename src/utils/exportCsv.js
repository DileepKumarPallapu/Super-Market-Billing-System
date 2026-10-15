/**
 * Exports completed sales records into a CSV file with full payment details
 */
export function exportSalesToCsv(sales, filename = 'freshcart-sales-report.csv') {
  if (!sales || sales.length === 0) {
    return false;
  }

  const headers = [
    'Invoice Number',
    'Date & Time',
    'Customer',
    'Items Purchased',
    'Total Units',
    'Subtotal (INR)',
    'Discount (INR)',
    'Coupon Applied',
    'Tax (INR)',
    'Final Amount (INR)',
    'Payment Method',
    'Amount Received (INR)',
    'Change Returned (INR)',
    'Status'
  ];

  const rows = sales.map(s => {
    const itemsSummary = (s.items || [])
      .map(i => `${i.name} (x${i.quantity} @ ₹${i.price})`)
      .join('; ');

    const customerDisplay = s.customer ? `${s.customer.name} (${s.customer.phone || 'N/A'})` : 'Walk-in Customer';
    const paymentMethodDisplay = s.paymentBreakdown
      ? Object.entries(s.paymentBreakdown).map(([k, v]) => `${k.toUpperCase()}: ₹${v}`).join(', ')
      : s.paymentMethod || 'CASH';

    return [
      s.invoiceNo,
      new Date(s.timestamp).toLocaleString('en-IN'),
      customerDisplay,
      itemsSummary,
      s.totalUnits || (s.items || []).reduce((sum, i) => sum + i.quantity, 0),
      s.subtotal,
      s.discount,
      s.coupon || 'NONE',
      s.tax || 0,
      s.finalTotal,
      paymentMethodDisplay,
      s.amountReceived !== undefined ? s.amountReceived : s.finalTotal,
      s.changeReturned !== undefined ? s.changeReturned : 0,
      s.paymentStatus || 'PAID'
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map(r => r.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
  ].join('\r\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
}
