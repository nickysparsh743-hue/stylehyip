'use client';

import { createContext, useContext, useMemo, useState } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const push = (message, type = 'info', ttl = 3500) => {
        const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        setToasts((current) => [...current, { id, message, type }]);

        window.setTimeout(() => {
            setToasts((current) => current.filter((toast) => toast.id !== id));
        }, ttl);
    };

    const value = useMemo(() => ({ push }), []);

    return (
        <ToastContext.Provider value={value}>
            {children}
            <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-3 px-4">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`w-full max-w-md rounded-2xl border px-4 py-3 text-sm shadow-lg backdrop-blur ${toast.type === 'success'
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                : toast.type === 'error'
                                    ? 'border-rose-200 bg-rose-50 text-rose-800'
                                    : 'border-stone-200 bg-white text-stone-800'
                            }`}
                    >
                        {toast.message}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);

    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }

    return context;
}
