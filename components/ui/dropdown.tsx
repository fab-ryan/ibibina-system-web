"use client";

import { cn } from "@/utils";
import { Check, ChevronDown, type LucideIcon } from "lucide-react";
import { forwardRef, KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from "react";

export type DropdownOption = {
    label: string;
    value: string;
    disabled?: boolean;
};

type DropdownSize = "sm" | "md" | "lg";

type DropdownProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange" | "value"> & {
    label?: string;
    error?: string;
    helperText?: string;
    options: DropdownOption[];
    placeholder?: string;
    leftIcon?: LucideIcon;
    value?: string;
    defaultValue?: string;
    onValueChange?: (value: string) => void;
    name?: string;
    required?: boolean;
    size?: DropdownSize;
    containerClassName?: string;
};

const sizeClasses: Record<DropdownSize, string> = {
    sm: "min-h-9 px-2.5 text-sm",
    md: "min-h-11 px-3 text-sm",
    lg: "min-h-12 px-4 text-base",
};

const Dropdown = forwardRef<HTMLButtonElement, DropdownProps>(
    (
        {
            label,
            error,
            helperText,
            options,
            placeholder = "Select an option",
            leftIcon: LeftIcon,
            value,
            defaultValue = "",
            onValueChange,
            name,
            size = "md",
            containerClassName,
            className,
            required,
            disabled,
            id,
            onKeyDown,
            ...props
        },
        ref,
    ) => {
        const generatedId = useId();
        const dropdownId = id || `dropdown-${generatedId}`;
        const listboxId = `${dropdownId}-listbox`;
        const wrapperRef = useRef<HTMLDivElement>(null);
        const [isOpen, setIsOpen] = useState(false);
        const [internalValue, setInternalValue] = useState(defaultValue);
        const selectedValue = value ?? internalValue;
        const selectedOption = useMemo(
            () => options.find((option) => option.value === selectedValue),
            [options, selectedValue],
        );

        useEffect(() => {
            function closeOnOutsideClick(event: MouseEvent) {
                if (!wrapperRef.current?.contains(event.target as Node)) {
                    setIsOpen(false);
                }
            }

            document.addEventListener("mousedown", closeOnOutsideClick);
            return () => document.removeEventListener("mousedown", closeOnOutsideClick);
        }, []);

        function commitValue(nextValue: string) {
            if (value === undefined) {
                setInternalValue(nextValue);
            }
            onValueChange?.(nextValue);
            setIsOpen(false);
        }

        function moveSelection(direction: 1 | -1) {
            const enabledOptions = options.filter((option) => !option.disabled);
            if (enabledOptions.length === 0) return;

            const currentIndex = enabledOptions.findIndex((option) => option.value === selectedValue);
            const nextIndex =
                currentIndex === -1
                    ? 0
                    : (currentIndex + direction + enabledOptions.length) % enabledOptions.length;

            commitValue(enabledOptions[nextIndex].value);
        }

        function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
            onKeyDown?.(event);
            if (event.defaultPrevented) return;

            if (event.key === "ArrowDown") {
                event.preventDefault();
                if (!isOpen) setIsOpen(true);
                moveSelection(1);
            }

            if (event.key === "ArrowUp") {
                event.preventDefault();
                if (!isOpen) setIsOpen(true);
                moveSelection(-1);
            }

            if (event.key === "Escape") {
                setIsOpen(false);
            }
        }

        return (
            <div ref={wrapperRef} className={cn("grid gap-1.5", containerClassName)}>
                {label && (
                    <label htmlFor={dropdownId} className="text-sm font-semibold text-(--ib-ink)">
                        {label}
                        {required && <span className="ml-1 text-red-500">*</span>}
                    </label>
                )}

                {name && (
                    <input
                        tabIndex={-1}
                        aria-hidden="true"
                        className="sr-only"
                        name={name}
                        required={required}
                        value={selectedValue}
                        onChange={() => undefined}
                    />
                )}

                <div className="relative">
                    {LeftIcon && (
                        <LeftIcon className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-(--ib-muted)" />
                    )}
                    <button
                        ref={ref}
                        id={dropdownId}
                        type="button"
                        disabled={disabled}
                        aria-haspopup="listbox"
                        aria-expanded={isOpen}
                        aria-controls={listboxId}
                        className={cn(
                            "flex w-full items-center rounded-xl border bg-white font-normal text-(--ib-ink) outline-none transition-colors",
                            "focus:border-(--ib-accent) focus:ring-2 focus:ring-[#0b3978]/15",
                            "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400",
                            error ? "border-red-500 focus:border-red-500 focus:ring-red-500/15" : "border-(--ib-line)",
                            LeftIcon ? "pl-10" : "",
                            "pr-10 text-left",
                            sizeClasses[size],
                            className,
                        )}
                        onClick={() => setIsOpen((current) => !current)}
                        onKeyDown={handleKeyDown}
                        {...props}
                    >
                        <span className={cn("block truncate", !selectedOption && "text-[#375176]/55")}>
                            {selectedOption?.label ?? placeholder}
                        </span>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-(--ib-muted)" />
                    </button>

                    {isOpen && (
                        <div
                            id={listboxId}
                            role="listbox"
                            aria-labelledby={dropdownId}
                            className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-50 max-h-64 overflow-y-auto rounded-xl border border-(--ib-line) bg-white p-1.5 shadow-xl"
                        >
                            {options.map((option) => {
                                const isSelected = option.value === selectedValue;

                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        role="option"
                                        aria-selected={isSelected}
                                        disabled={option.disabled}
                                        className={cn(
                                            "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                                            isSelected
                                                ? "bg-blue-50 font-semibold text-(--ib-accent)"
                                                : "text-(--ib-muted) hover:bg-[#f4f7fc] hover:text-(--ib-ink)",
                                            "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent",
                                        )}
                                        onClick={() => commitValue(option.value)}
                                    >
                                        <span className="truncate">{option.label}</span>
                                        {isSelected && <Check className="h-4 w-4 shrink-0" />}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {error ? (
                    <p className="text-sm text-red-600">{error}</p>
                ) : helperText ? (
                    <p className="text-sm text-gray-500">{helperText}</p>
                ) : null}
            </div>
        );
    },
);

Dropdown.displayName = "Dropdown";

export default Dropdown;
