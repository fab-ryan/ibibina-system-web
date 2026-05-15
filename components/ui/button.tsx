import React from "react";
import Spinner from "@/components/ui/spinner";

// ── Variant / size maps ────────────────────────────────────────────────────
const variantClasses = {
    primary:
        "bg-[#0b3978] text-white border border-transparent hover:bg-[#1f4c9f] focus-visible:ring-[#0b3978]/40",
    secondary:
        "bg-white text-[#0b3978] border border-[#d9e2f1] hover:bg-[#f4f7fc] focus-visible:ring-[#0b3978]/20",
    ghost:
        "bg-transparent text-[#375176] border border-transparent hover:bg-[#f4f7fc] focus-visible:ring-[#0b3978]/20",
    danger:
        "bg-red-600 text-white border border-transparent hover:bg-red-700 focus-visible:ring-red-500/40",
};

const sizeClasses = {
    sm: "h-8 px-3 text-xs gap-1.5",
    md: "h-10 px-4 text-sm gap-2",
    lg: "h-11 px-5 text-base gap-2.5",
};

// ── Props ──────────────────────────────────────────────────────────────────
type ButtonVariant = keyof typeof variantClasses;
type ButtonSize = keyof typeof sizeClasses;

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
    loadingText?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
};

// ── Component ──────────────────────────────────────────────────────────────
export default function Button({
    variant = "primary",
    size = "md",
    loading = false,
    loadingText,
    leftIcon,
    rightIcon,
    disabled,
    children,
    className = "",
    ...props
}: ButtonProps) {
    const isDisabled = disabled || loading;

    return (
        <button
            {...props}
            disabled={isDisabled}
            aria-busy={loading}
            className={[
                "inline-flex items-center justify-center rounded-xl font-semibold",
                "transition-all duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-50",
                variantClasses[variant],
                sizeClasses[size],
                className,
            ].join(" ")}
        >
            {/* Leading icon or spinner */}
            {loading ? (
                <Spinner
                    size={size === "lg" ? "md" : "sm"}
                    className="shrink-0"
                />
            ) : leftIcon ? (
                <span className="shrink-0">{leftIcon}</span>
            ) : null}

            {/* Label */}
            <span className="truncate">
                {loading && loadingText ? loadingText : children}
            </span>

            {/* Trailing icon (hidden while loading) */}
            {!loading && rightIcon && (
                <span className="shrink-0">{rightIcon}</span>
            )}
        </button>
    );
}
