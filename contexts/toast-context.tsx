"use client";

import {
    createContext,
    useCallback,
    useContext,
    useRef,
    useState,
} from "react";

// ── Types ──────────────────────────────────────────────────────────────────
export type ToastVariant = "success" | "error" | "warning" | "info";

export interface Toast {
    id: string;
    variant: ToastVariant;
    title: string;
    description?: string;
    /** Duration in ms before auto-dismiss. Pass 0 to disable. Default: 4000 */
    duration?: number;
}

type ToastInput = Omit<Toast, "id">;

interface ToastContextValue {
    toasts: Toast[];
    add: (toast: ToastInput) => string;
    dismiss: (id: string) => void;
    success: (title: string, description?: string) => string;
    error: (title: string, description?: string) => string;
    warning: (title: string, description?: string) => string;
    info: (title: string, description?: string) => string;
}

// ── Context ────────────────────────────────────────────────────────────────
const ToastContext = createContext<ToastContextValue | null>(null);

// ── Provider ───────────────────────────────────────────────────────────────
export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

    const dismiss = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        const timer = timers.current.get(id);
        if (timer) {
            clearTimeout(timer);
            timers.current.delete(id);
        }
    }, []);

    const add = useCallback(
        (toast: ToastInput): string => {
            const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
            const duration = toast.duration ?? 4000;

            setToasts((prev) => [...prev, { ...toast, id, duration }]);

            if (duration > 0) {
                const timer = setTimeout(() => dismiss(id), duration);
                timers.current.set(id, timer);
            }

            return id;
        },
        [dismiss],
    );

    const success = useCallback(
        (title: string, description?: string) => add({ variant: "success", title, description }),
        [add],
    );
    const error = useCallback(
        (title: string, description?: string) => add({ variant: "error", title, description }),
        [add],
    );
    const warning = useCallback(
        (title: string, description?: string) => add({ variant: "warning", title, description }),
        [add],
    );
    const info = useCallback(
        (title: string, description?: string) => add({ variant: "info", title, description }),
        [add],
    );

    return (
        <ToastContext.Provider value={{ toasts, add, dismiss, success, error, warning, info }}>
            {children}
        </ToastContext.Provider>
    );
}

// ── Hook ───────────────────────────────────────────────────────────────────
export function useToast(): ToastContextValue {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
    return ctx;
}
