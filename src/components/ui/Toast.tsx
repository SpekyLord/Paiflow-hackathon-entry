'use client';

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { AlertTriangle, CheckCircle, Info, X, XCircle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={18} className="text-[var(--ok)]" />,
  error: <XCircle size={18} className="text-[var(--bad)]" />,
  warning: <AlertTriangle size={18} className="text-[var(--warn)]" />,
  info: <Info size={18} className="text-[var(--info)]" />,
};

const colorClasses: Record<ToastType, string> = {
  success: 'border-[var(--ok-line)] bg-[var(--ok-soft)]',
  error: 'border-[var(--bad-line)] bg-[var(--bad-soft)]',
  warning: 'border-[var(--warn-line)] bg-[var(--warn-soft)]',
  info: 'border-[var(--info-line)] bg-[var(--info-soft)]',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((current) => [...current, { id, type, message }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toastItem) => toastItem.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex max-w-sm flex-col gap-2">
        {toasts.map((toastItem) => (
          <ToastItem key={toastItem.id} item={toastItem} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(item.id), 4000);
    return () => clearTimeout(timer);
  }, [item.id, onDismiss]);

  return (
    <div
      className={`animate-fade-in flex items-center gap-3 rounded-[var(--r-lg)] border px-4 py-3 shadow-[var(--shadow-3)] ${colorClasses[item.type]}`}
    >
      {icons[item.type]}
      <p className="flex-1 text-sm text-[var(--text)]">{item.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        className="text-[var(--text-mute)] hover:text-[var(--text)]"
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
    </div>
  );
}
