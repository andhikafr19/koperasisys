'use client';

import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  id?: string;
  variant?: ToastVariant;
  title?: string;
  message: string;
  isOpen: boolean;
  onClose: () => void;
  autoCloseDuration?: number; // ms, 0 to disable auto close
}

export function Toast({
  variant = 'error',
  title,
  message,
  isOpen,
  onClose,
  autoCloseDuration = 5000,
}: ToastProps) {
  useEffect(() => {
    if (!isOpen || autoCloseDuration <= 0) return;
    const timer = setTimeout(() => {
      onClose();
    }, autoCloseDuration);
    return () => clearTimeout(timer);
  }, [isOpen, autoCloseDuration, onClose]);

  if (!isOpen) return null;

  const config = {
    error: {
      border: 'border-rose-200 bg-rose-50/95 text-rose-900',
      iconBg: 'bg-rose-100 text-rose-600',
      icon: AlertCircle,
      accent: 'bg-rose-500',
      defaultTitle: 'Terjadi Kesalahan',
    },
    success: {
      border: 'border-emerald-200 bg-emerald-50/95 text-emerald-900',
      iconBg: 'bg-emerald-100 text-emerald-600',
      icon: CheckCircle2,
      accent: 'bg-emerald-500',
      defaultTitle: 'Berhasil',
    },
    warning: {
      border: 'border-amber-200 bg-amber-50/95 text-amber-900',
      iconBg: 'bg-amber-100 text-amber-600',
      icon: AlertTriangle,
      accent: 'bg-amber-500',
      defaultTitle: 'Perhatian',
    },
    info: {
      border: 'border-blue-200 bg-blue-50/95 text-blue-900',
      iconBg: 'bg-blue-100 text-blue-600',
      icon: Info,
      accent: 'bg-blue-500',
      defaultTitle: 'Informasi',
    },
  }[variant];

  const Icon = config.icon;

  return (
    <div
      role="alert"
      className={`fixed top-5 right-5 z-[9999] max-w-md w-[calc(100vw-2.5rem)] rounded-2xl border shadow-2xl backdrop-blur-md transition-all duration-300 transform translate-y-0 opacity-100 p-4 ${config.border}`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-xl shrink-0 ${config.iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 pt-0.5 min-w-0">
          <h4 className="text-sm font-bold leading-tight">
            {title || config.defaultTitle}
          </h4>
          <p className="text-xs mt-1 leading-relaxed opacity-90 break-words font-medium">
            {message}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors shrink-0"
          aria-label="Tutup"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {autoCloseDuration > 0 && (
        <div className="mt-3 h-1 w-full bg-slate-200/60 rounded-full overflow-hidden">
          <div
            className={`h-full ${config.accent} animate-[shrink_linear_forwards]`}
            style={{ animationDuration: `${autoCloseDuration}ms` }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Inline Alert Card for forms and modal dialogues
 */
export function AlertCard({
  variant = 'error',
  title,
  message,
  onDismiss,
}: {
  variant?: ToastVariant;
  title?: string;
  message: string;
  onDismiss?: () => void;
}) {
  const config = {
    error: {
      card: 'bg-rose-50 border-rose-200 text-rose-800',
      icon: AlertCircle,
      iconColor: 'text-rose-600',
      titleColor: 'text-rose-900',
    },
    success: {
      card: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      icon: CheckCircle2,
      iconColor: 'text-emerald-600',
      titleColor: 'text-emerald-900',
    },
    warning: {
      card: 'bg-amber-50 border-amber-200 text-amber-800',
      icon: AlertTriangle,
      iconColor: 'text-amber-600',
      titleColor: 'text-amber-900',
    },
    info: {
      card: 'bg-blue-50 border-blue-200 text-blue-800',
      icon: Info,
      iconColor: 'text-blue-600',
      titleColor: 'text-blue-900',
    },
  }[variant];

  const Icon = config.icon;

  return (
    <div
      role="alert"
      className={`p-3.5 rounded-xl border flex items-start gap-3 shadow-xs ${config.card}`}
    >
      <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${config.iconColor}`} />
      <div className="flex-1 min-w-0">
        {title && <h5 className={`text-xs font-bold mb-0.5 ${config.titleColor}`}>{title}</h5>}
        <p className="text-xs leading-relaxed font-medium">{message}</p>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="p-1 rounded-lg hover:bg-black/5 text-slate-400 hover:text-slate-700 transition-colors shrink-0"
          aria-label="Tutup alert"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
