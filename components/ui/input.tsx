import { forwardRef } from "react";
import { LucideIcon } from 'lucide-react';
import { cn } from "@/utils";

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
    label?: string;
    error?: string;
    leftIcon?: LucideIcon;
    rightIcon?: LucideIcon;
    onRightIconClick?: () => void;
    helperText?: string;
    variant?: 'default' | 'outline' | 'filled';
    size?: 'sm' | 'md' | 'lg';
    containerClassName?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({
    label,
    error,
    type = "text",
    leftIcon: LeftIcon,
    rightIcon: RightIcon,
    onRightIconClick,
    helperText,
    variant = 'default',
    size = 'md',
    containerClassName = '',
    required,
    id,
    ...rest
}, ref) => {
    const variantClasses = {
        default: "border border-gray-300 focus:ring-2 focus:ring-blue-500",
        outline: "border-2 border-gray-400 focus:ring-2 focus:ring-blue-500",
        filled: "bg-gray-100 border-none focus:bg-white focus:ring-2 focus:ring-blue-500",
    };
    const sizeClasses = {
        sm: "px-2 py-1 text-sm",
        md: "px-3 py-2 text-base",
        lg: "px-4 py-3 text-lg",
    };
    const errorClasses = error ? "border-red-500 focus:ring-red-500" : "";
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
        <div className={cn("space-y-1.5", containerClassName)}>
            {label && <label htmlFor={inputId} className="auth-label flex items-center gap-2">{label}
                {required && <span className="text-red-500">*</span>}</label>}
            <div className={cn("relative flex items-center auth-input", variantClasses[variant], sizeClasses[size], errorClasses)}>
                {LeftIcon && <LeftIcon className="absolute left-3 h-5 w-5 text-ib-link" />}
                <input
                    ref={ref}
                    type={type}
                    className={cn("w-full rounded-md transition-colors focus:outline-none", LeftIcon ? 'pl-10' : '', RightIcon ? 'pr-10' : '')}
                    {...rest}
                />
                {RightIcon && (
                    <button
                        type="button"
                        onClick={onRightIconClick}
                        className="absolute right-3 h-5 w-5 text-(--ib-muted) hover:text-ib-link/70 focus:outline-none"
                    >
                        <RightIcon />
                    </button>
                )}
            </div>
            {error && (
                <p className="mt-1 text-sm text-red-600">{error}</p>

            )}
            {
                helperText && !error && (
                    <p className="mt-1 text-sm text-gray-500">{helperText}</p>
                )
            }
        </div>
    );
});

Input.displayName = 'Input';

export default Input;
