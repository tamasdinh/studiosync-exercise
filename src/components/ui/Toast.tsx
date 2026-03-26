'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

function ToastItem({ toast, onRemove }: { toast: { id: string; message: string; type: 'success' | 'error' | 'warning' }; onRemove: (id: string) => void }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const exitTimer = setTimeout(() => setExiting(true), 3700);
    return () => clearTimeout(exitTimer);
  }, []);

  const handleRemove = () => {
    setExiting(true);
    setTimeout(() => onRemove(toast.id), 300);
  };

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border ${
        exiting ? 'animate-slide-down-out' : 'animate-slide-up-in'
      } ${
        toast.type === 'success'
          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
          : toast.type === 'error'
          ? 'bg-red-50 border-red-200 text-red-800'
          : 'bg-amber-50 border-amber-200 text-amber-800'
      }`}
    >
      {toast.type === 'success' && <CheckCircleIcon className="w-5 h-5 text-emerald-500 shrink-0" />}
      {toast.type === 'error' && <XCircleIcon className="w-5 h-5 text-red-500 shrink-0" />}
      {toast.type === 'warning' && <ExclamationTriangleIcon className="w-5 h-5 text-amber-500 shrink-0" />}
      <p className="text-sm font-medium flex-1">{toast.message}</p>
      <button onClick={handleRemove} className="shrink-0 hover:opacity-70">
        <XMarkIcon className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 max-w-sm w-full px-4">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
}
