"use client";

import { useAuth } from "@/contexts";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

// ── Icons ──────────────────────────────────────────────────────
function BellIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
    );
}

function LogOutIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" x2="9" y1="12" y2="12" />
        </svg>
    );
}

function SearchIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
        </svg>
    );
}

// ── Page label map ─────────────────────────────────────────────
const PAGE_LABELS: Record<string, string> = {
    "/dashboard": "Overview",
    "/dashboard/admin": "Admin Overview",
    "/dashboard/admin/users": "Users",
    "/dashboard/admin/organizations": "Organizations",
    "/dashboard/admin/organizations/create": "Register Group",
    "/dashboard/admin/reports": "Reports",
    "/dashboard/admin/security": "System Security",
    "/dashboard/admin/performance": "System Performance",
    "/dashboard/admin/audit": "Audit Logs",
    "/dashboard/admin/settings": "Settings",
    "/dashboard/chairperson": "Chairperson Dashboard",
    "/dashboard/chairperson/users": "Group Users",
    "/dashboard/chairperson/members/create": "Add Member",
    "/dashboard/chairperson/settings": "Group Settings",
    "/dashboard/chairperson/finance": "Finance Reports",
    "/dashboard/chairperson/loans": "Loan Requests",
    "/dashboard/chairperson/contributions": "Contributions",
    "/dashboard/finance": "Finance",
};

// ── Props ──────────────────────────────────────────────────────
type AdminTopBarProps = {
    pathname: string;
};

// ── Component ──────────────────────────────────────────────────
export default function AdminTopBar({ pathname }: AdminTopBarProps) {
    const router = useRouter();
    const { user, logout } = useAuth();
    const isAdmin = user?.role === "admin";
    const isChairperson = user?.role === "chairperson";
    const pageLabel = PAGE_LABELS[pathname] ?? "Dashboard";

    useEffect(() => {
        if (!user) {
            router.replace("/auth");
        } else if (pathname.startsWith("/dashboard/admin") && !isAdmin) {
            router.replace("/dashboard");
        } else if (pathname.startsWith("/dashboard/chairperson") && !isChairperson && !isAdmin) {
            router.replace("/dashboard");
        }
    }, [user, isAdmin, isChairperson, pathname, router]);

    const handleSignOut = () => {
        logout();
        router.replace("/auth");
    };

    return (
        <div className="flex h-16 w-full shrink-0 items-center justify-between gap-3 border-b border-[#d9e2f1] bg-white px-4 md:px-6 lg:px-8">

            {/* ── Left: brand + page context ─────────────────── */}
            <div className="flex min-w-0 items-center gap-3">
                {/* Mobile brand mark */}
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0b3978] text-xs font-bold text-white lg:hidden">
                    IB
                </div>

                {/* Divider */}
                <div className="hidden h-5 w-px bg-[#d9e2f1] lg:block" />

                {/* Context text */}
                <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#1f4c9f]">
                        {isAdmin ? "Admin Console" : isChairperson ? "Chairperson Console" : "IBIBINA Platform"}
                    </p>
                    <h1 className="headline truncate text-base leading-tight text-[#081936] lg:text-lg">
                        {pageLabel}
                    </h1>
                </div>
            </div>

            {/* ── Centre: search (desktop only) ──────────────── */}
            <div className="hidden max-w-xs flex-1 lg:flex">
                <div className="flex w-full items-center gap-2 rounded-xl border border-[#d9e2f1] bg-[#f4f7fc] px-3 py-2 text-sm text-[#375176]">
                    <SearchIcon />
                    <span className="text-[#375176]/60">Search…</span>
                </div>
            </div>

            {/* ── Right: status, notifications, sign-out ─────── */}
            <div className="flex shrink-0 items-center gap-2">
                {/* Live badge */}
                <span className="hidden items-center gap-1.5 rounded-full border border-[#d9e2f1] bg-[#f4f7fc] px-3 py-1.5 text-[11px] font-semibold text-[#375176] sm:inline-flex">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Live System
                </span>

                {/* Bell */}
                <button
                    className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-[#d9e2f1] bg-white text-[#375176] transition-colors hover:bg-[#f4f7fc]"
                    aria-label="Notifications"
                >
                    <BellIcon />
                    <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-2 border-white bg-blue-500" />
                </button>

                {/* Avatar */}
                <div className="hidden h-9 w-9 items-center justify-center rounded-xl border border-[#d9e2f1] bg-[#0b3978] text-xs font-bold text-white sm:flex">
                    {isAdmin ? "AD" : "MB"}
                </div>

                {/* Sign out */}
                <Link
                    href="/auth"
                    className="flex items-center gap-2 rounded-xl border border-[#d9e2f1] bg-white px-3 py-2 text-sm font-semibold text-[#0b3978] transition-colors hover:bg-[#f4f7fc]"
                    onClick={handleSignOut}
                >
                    <LogOutIcon />
                    <span className="hidden sm:inline">Sign Out</span>
                </Link>
            </div>
        </div>
    );
}
