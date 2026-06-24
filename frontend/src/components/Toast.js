/* eslint-disable */
// ============================================================
//  Toast.js — Lightweight toast notification system
//  No external library needed.
//
//  HOW IT WORKS:
//  1. Wrap your app in <ToastProvider> (done in App.js)
//  2. ToastProvider overrides window.alert() globally —
//     so ALL existing alert('...') calls across every page
//     automatically become toasts. No other files need changes.
//  3. Print/popup alerts are detected by message content and
//     stay as real system dialogs (user must allow popups).
//  4. You can also call window.toast(msg, type) directly from
//     any file for typed toasts (success / error / info).
// ============================================================
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const ToastContext = createContext(null);

// Messages that must stay as a real blocking alert
// (print popup warnings need user interaction before the window opens)
const KEEP_AS_ALERT = ['popup', 'allow pop'];

function shouldKeepAsAlert(msg) {
  if (typeof msg !== 'string') return false;
  const lower = msg.toLowerCase();
  return KEEP_AS_ALERT.some(kw => lower.includes(kw));
}

// ── Individual toast ──────────────────────────────────────────
function ToastItem({ toast, onDismiss }) {
  const styles = {
    success: { bg: '#dcfce7', border: '#86efac', icon: '✓', text: '#166534' },
    error:   { bg: '#fee2e2', border: '#fca5a5', icon: '✕', text: '#991b1b' },
    info:    { bg: '#f0f9ff', border: '#7dd3fc', icon: 'ℹ', text: '#0c4a6e' },
    warning: { bg: '#fef9c3', border: '#fde047', icon: '⚠', text: '#713f12' },
  };
  const s = styles[toast.type] || styles.info;

  return (
    <div
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        background: s.bg, border: `1px solid ${s.border}`,
        borderRadius: 10, padding: '12px 14px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
        maxWidth: 340, width: '100%',
        animation: 'slideIn 0.2s ease-out',
      }}
    >
      <span style={{ fontSize: 16, color: s.text, flexShrink: 0, fontWeight: 700, marginTop: 1 }}>
        {s.icon}
      </span>
      <span style={{ fontSize: 13, color: s.text, flex: 1, lineHeight: 1.5, wordBreak: 'break-word' }}>
        {toast.message}
      </span>
      <button
        onClick={() => onDismiss(toast.id)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: s.text, fontSize: 16, padding: '0 2px',
          opacity: 0.6, flexShrink: 0, lineHeight: 1,
        }}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}

// ── Provider ─────────────────────────────────────────────────
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers  = useRef({});

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev.slice(-4), { id, message: String(message), type }]);
    timers.current[id] = setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  // ── Override window.alert globally ───────────────────────
  // All existing alert() calls across every page become toasts.
  // Print-related alerts keep their blocking behavior.
  useEffect(() => {
    const originalAlert = window.alert;

    window.alert = (msg) => {
      if (shouldKeepAsAlert(msg)) {
        originalAlert.call(window, msg);
      } else {
        addToast(String(msg), 'info');
      }
    };

    // Also expose window.toast for typed toasts
    window.toast = addToast;

    return () => {
      window.alert = originalAlert;
      delete window.toast;
    };
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toast: addToast, dismiss }}>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(20px); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
      {children}
      {toasts.length > 0 && (
        <div
          style={{
            position: 'fixed', bottom: 20, right: 20,
            zIndex: 99999, display: 'flex',
            flexDirection: 'column', gap: 8, alignItems: 'flex-end',
          }}
          aria-live="polite"
          aria-label="Notifications"
        >
          {toasts.map(t => (
            <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

// ── Hook for use inside React components ─────────────────────
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

// ── Convenience helpers (importable anywhere) ─────────────────
// These call window.toast if available, fall back to alert
export const toast = {
  success: (msg) => window.toast ? window.toast(msg, 'success') : alert(msg),
  error:   (msg) => window.toast ? window.toast(msg, 'error',   5000) : alert(msg),
  info:    (msg) => window.toast ? window.toast(msg, 'info')    : alert(msg),
  warning: (msg) => window.toast ? window.toast(msg, 'warning') : alert(msg),
};