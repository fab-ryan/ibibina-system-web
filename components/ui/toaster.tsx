"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";
import { useToast, type Toast, type ToastVariant } from "@/contexts/toast-context";

// ── Variant config ─────────────────────────────────────────────────────────
const config: Record<
    ToastVariant,
    { icon: React.ElementType; bar: string; iconClass: string; bg: string; border: string }
> = {
    success: {
        icon: CheckCircle2,
        bar: "bg-emerald-500",
        iconClass: "text-emerald-500",
        bg: "bg-white",
        border: "border-emerald-200",
    },
    error: {
        icon: XCircle,
        bar: "bg-rose-500",
        iconClass: "text-rose-500",
        bg: "bg-white",
        border: "border-rose-200",
    },
    warning: {
        icon: AlertTriangle,
        bar: "bg-amber-400",
        iconClass: "text-amber-500",
        bg: "bg-white",
        border: "border-amber-200",
    },
    info: {
        icon: Info,
        bar: "bg-[#0b3978]",
        iconClass: "text-[#0b3978]",
        bg: "bg-white",
        border: "border-[#d9e2f1]",
    },
};

// ── Single toast item ──────────────────────────────────────────────────────
function ToastItem({ toast }: { toast: Toast }) {
    const { dismiss } = useToast();
    const { icon: Icon, bar, iconClass, bg, border } = config[toast.variant];
    const [visible, setVisible] = useState(false);
    const [leaving, setLeaving] = useState(false);
    const progressRef = useRef<HTMLDivElement>(null);

    // Slide-in on mount
    useEffect(() => {
        const raf = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(raf);
    }, []);

    // Animate progress bar
    useEffect(() => {
        const duration = toast.duration ?? 4000;
        if (!duration || !progressRef.current) return;
        const el = progressRef.current;
        el.style.transition = "none";
        el.style.width = "100%";
        // Force reflow
        void el.offsetWidth;
        el.style.transition = `width ${duration}ms linear`;
        el.style.width = "0%";
    }, [toast.duration]);

    function handleDismiss() {
        setLeaving(true);
        setTimeout(() => dismiss(toast.id), 280);
    }

    return (
        <div
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
            style={{
                transform: visible && !leaving ? "translateX(0)" : "translateX(calc(100% + 24px))",
                opacity: visible && !leaving ? 1 : 0,
                transition: "transform 280ms cubic-bezier(0.22, 1, 0.36, 1), opacity 280ms ease",
            }}
            className={`relative flex w-full max-w-sm overflow-hidden rounded-xl border shadow-lg ${bg} ${border}`}
        >
            {/* Left colour bar */}
            <span className={`w-1 shrink-0 rounded-l-xl ${bar}`} />

            {/* Body */}
            <div className="flex flex-1 items-start gap-3 px-4 py-3.5">
                <Icon size={18} className={`mt-0.5 shrink-0 ${iconClass}`} />
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#081936]">{toast.title}</p>
                    {toast.description && (
                        <p className="mt-0.5 text-xs leading-5 text-[#375176]">{toast.description}</p>
                    )}
                </div>
                <button
                    onClick={handleDismiss}
                    aria-label="Dismiss notification"
                    className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded text-[#375176] transition-colors hover:bg-[#f4f7fc] hover:text-[#081936]"
                >
                    <X size={13} />
                </button>
            </div>

            {/* Progress bar */}
            {(toast.duration ?? 4000) > 0 && (
                <div className="absolute bottom-0 left-1 right-0 h-0.5 bg-[#f4f7fc]">
                    <div ref={progressRef} className={`h-full ${bar} opacity-50`} />
                </div>
            )}
        </div>
    );
}

// ── Toaster container ──────────────────────────────────────────────────────
export default function Toaster() {
    const { toasts } = useToast();

    return (
        <div
            aria-label="Notifications"
            className="pointer-events-none fixed top-6 right-6 z-9999 flex flex-col gap-3"
        >
            {toasts.map((toast) => (
                <div key={toast.id} className="pointer-events-auto">
                    <ToastItem toast={toast} />
                </div>
            ))}
        </div>
    );
}
