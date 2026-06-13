'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

type ToastType = 'success' | 'error' | 'validation';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  validation: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, [removeToast]);

  const success = useCallback((message: string) => showToast(message, 'success'), [showToast]);
  const error = useCallback((message: string) => showToast(message, 'error'), [showToast]);
  const validation = useCallback((message: string) => showToast(message, 'validation'), [showToast]);

  return (
    <ToastContext.Provider value={{ toast: showToast, success, error, validation }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full px-4 sm:px-0 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "flex items-start gap-3 rounded-xl border p-4 shadow-lg backdrop-blur-md transition-all duration-300 pointer-events-auto transform translate-y-0 opacity-100",
              t.type === 'success' && "border-emerald-100 bg-emerald-50/95 text-emerald-900 shadow-emerald-100/40",
              t.type === 'error' && "border-red-100 bg-red-50/95 text-red-900 shadow-red-100/40",
              t.type === 'validation' && "border-amber-100 bg-amber-50/95 text-amber-900 shadow-amber-100/40"
            )}
          >
            {t.type === 'success' && <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />}
            {t.type === 'error' && <XCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />}
            {t.type === 'validation' && <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />}
            
            <div className="flex-1 text-sm font-medium leading-relaxed">{t.message}</div>
            
            <button
              onClick={() => removeToast(t.id)}
              className="text-slate-400 hover:text-slate-600 shrink-0 transition-colors rounded-lg p-0.5 hover:bg-black/5"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
