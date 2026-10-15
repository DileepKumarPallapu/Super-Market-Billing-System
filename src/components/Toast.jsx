import React from 'react';
import { usePOS } from '../context/POSContext';
import { CheckCircle2, AlertTriangle, XCircle, X } from 'lucide-react';

export default function Toast() {
  const { toasts, removeToast } = usePOS();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container no-print">
      {toasts.map(toast => {
        let Icon = CheckCircle2;
        if (toast.type === 'warning') Icon = AlertTriangle;
        if (toast.type === 'error') Icon = XCircle;

        return (
          <div key={toast.id} className={`toast ${toast.type}`}>
            <Icon size={18} />
            <span style={{ flex: 1 }}>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'none',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex'
              }}
            >
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
