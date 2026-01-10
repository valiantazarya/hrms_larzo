import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastProps {
  toast: Toast;
  onClose: (id: string) => void;
}

export function ToastItem({ toast, onClose }: ToastProps) {
  useEffect(() => {
    // Don't auto-dismiss if duration is 0
    if (toast.duration === 0) {
      return;
    }
    
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, toast.duration || 3000);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onClose]);

  const bgColor = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    warning: 'bg-yellow-500',
  }[toast.type];

  return (
    <div
      className={`${bgColor} text-white px-4 py-3 rounded-lg shadow-lg mb-2 flex items-center justify-between min-w-[280px] max-w-[90vw]`}
      role="alert"
    >
      <span className="text-sm font-medium">{toast.message}</span>
      <button
        onClick={() => onClose(toast.id)}
        className="ml-4 text-white hover:text-gray-200"
        aria-label="Close"
      >
        ×
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onClose: (id: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div 
      className="fixed top-4 right-4 flex flex-col items-end space-y-2 pointer-events-none"
      style={{ zIndex: 99999 }}
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onClose={onClose} />
        </div>
      ))}
    </div>
  );
}

