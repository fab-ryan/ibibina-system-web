"use client";

import { useAuth } from "@/contexts";
import Link from "next/link";
import { useEffect, useState } from "react";
import { images } from '@/constants'
// ── Types ──────────────────────────────────────────────────────
type SidebarItem = {
    href: string;
    label: string;
    icon: () => React.JSX.Element;
};

type NavSection = {
    heading: string;
    items: SidebarItem[];
};

function LayoutDashboardIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="7" height="9" x="3" y="3" rx="1" />
            <rect width="7" height="5" x="14" y="3" rx="1" />
            <rect width="7" height="9" x="14" y="12" rx="1" />
            <rect width="7" height="5" x="3" y="16" rx="1" />
        </svg>
    );
}

function UsersIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    );
}

function BuildingIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
            <path d="M9 22v-4h6v4" />
            <path d="M8 6h.01" />
            <path d="M16 6h.01" />
            <path d="M12 6h.01" />
            <path d="M12 10h.01" />
            <path d="M12 14h.01" />
            <path d="M16 10h.01" />
            <path d="M16 14h.01" />
            <path d="M8 10h.01" />
            <path d="M8 14h.01" />
        </svg>
    );
}

function ActivityIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.48 12H2" />
        </svg>
    );
}

function ReportIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v18h18" />
            <path d="M7 15l3-3 3 2 5-7" />
        </svg>
    );
}

function ShieldIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
            <path d="m9 12 2 2 4-4" />
        </svg>
    );
}

function GaugeIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 14l4-4" />
            <path d="M3.34 19a10 10 0 1 1 17.32 0" />
        </svg>
    );
}

function MoneyIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
            <path d="M12 18V6" />
        </svg>
    );
}

function ClipboardIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="8" height="4" x="8" y="2" rx="1" />
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            <path d="M8 14h8" />
            <path d="M8 18h5" />
            <path d="M8 10h8" />
        </svg>
    );
}

function SettingsIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    );
}


const adminSections: NavSection[] = [
    {
        heading: "Main Menu",
        items: [
            { href: "/dashboard/admin", label: "Overview", icon: LayoutDashboardIcon },
            { href: "/dashboard/admin/users", label: "Users", icon: UsersIcon },
            { href: "/dashboard/admin/organizations", label: "Organizations", icon: BuildingIcon },
            { href: "/dashboard/admin/reports", label: "Reports", icon: ReportIcon },
        ],
    },
    // {
    //     heading: "System",
    //     items: [
    //         { href: "/dashboard/admin/security", label: "Security", icon: ShieldIcon },
    //         { href: "/dashboard/admin/performance", label: "Performance", icon: GaugeIcon },
    //         { href: "/dashboard/admin/audit", label: "Audit Logs", icon: ActivityIcon },
    //         { href: "/dashboard/admin/settings", label: "Settings", icon: SettingsIcon },
    //     ],
    // },
];

const chairpersonSections: NavSection[] = [
    {
        heading: "Group Operations",
        items: [
            { href: "/dashboard/chairperson", label: "Dashboard", icon: LayoutDashboardIcon },
            { href: "/dashboard/chairperson/users", label: "Group Users", icon: UsersIcon },
            { href: "/dashboard/chairperson/members/create", label: "Add Member", icon: UsersIcon },
            { href: "/dashboard/chairperson/settings", label: "Group Settings", icon: SettingsIcon },
        ],
    },
    {
        heading: "Finance & Loans",
        items: [
            { href: "/dashboard/chairperson/finance", label: "Finance Reports", icon: ReportIcon },
            { href: "/dashboard/chairperson/transactions", label: "Transactions", icon: ActivityIcon },
            { href: "/dashboard/chairperson/penalties", label: "Penalties", icon: ShieldIcon },
            { href: "/dashboard/chairperson/loans", label: "Loan Requests", icon: MoneyIcon },
            { href: "/dashboard/chairperson/contributions", label: "Contributions", icon: ClipboardIcon },
        ],
    },
];

const financeSections: NavSection[] = [
    {
        heading: "Overview",
        items: [
            { href: "/dashboard/finance", label: "Dashboard", icon: LayoutDashboardIcon },
        ],
    },
    {
        heading: "Finance",
        items: [
            { href: "/dashboard/finance/contributions", label: "Contributions", icon: ClipboardIcon },
            { href: "/dashboard/finance/loans", label: "Loans", icon: MoneyIcon },
            { href: "/dashboard/finance/transactions", label: "Transactions", icon: ActivityIcon },
            { href: "/dashboard/finance/reports", label: "Reports", icon: ReportIcon },
        ],
    },
];

type DashboardSidebarProps = {
    pathname: string;
};

export default function DashboardSidebar({ pathname }: DashboardSidebarProps) {

    const [isAdmin, setIsAdmin] = useState<boolean>(false);
    const { user } = useAuth();
    const isChairperson = pathname.startsWith("/dashboard/chairperson");
    const isFinance = pathname.startsWith("/dashboard/finance");
    const sections = isAdmin ? adminSections : isChairperson ? chairpersonSections : isFinance ? financeSections : [];

    useEffect(() => {
        if (user) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setIsAdmin(user.role === "admin");
        }
    }, [user]);

    return (
        <aside
            className="flex h-full w-64 shrink-0 flex-col overflow-y-auto"
            style={{ background: "linear-gradient(170deg, #0b1f3a 0%, #0d2855 50%, #0b3978 100%)" }}
        >
            {/* Brand ───────────────────────────────────────── */}
            <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 text-sm font-bold text-white">
                    IB
                </div>
                <div className="min-w-0">
                    <p className="truncate text-sm font-bold tracking-tight text-white">IBIBINA</p>
                    <p className="truncate text-[11px] text-white/50">
                        {isAdmin ? "Administration" : isChairperson ? "Chairperson" : isFinance ? "Finance" : "Member Portal"}
                    </p>
                </div>
            </div>

            {/* Role badge ──────────────────────────────────── */}
            <div className="mx-4 mt-4 rounded-xl border border-white/10 bg-white/8 px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40">Active Role</p>
                <p className="mt-1 text-sm font-semibold text-white">
                    {isAdmin ? "System Administrator" : isChairperson ? "Group Chairperson" : isFinance ? "Finance Officer" : "Workspace Member"}
                </p>
                <div className="mt-2 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span className="text-[11px] text-white/45">Connected</span>
                </div>
            </div>

            {/* Navigation ──────────────────────────────────── */}
            <nav className="mt-5 flex-1 space-y-5 px-3 pb-4" aria-label="Dashboard navigation">
                {sections.map((section) => (
                    <div key={section.heading}>
                        <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-widest text-white/30">
                            {section.heading}
                        </p>
                        <ul className="space-y-0.5">
                            {section.items.map((item) => {
                                const isActive =
                                    item.href === "/dashboard" || item.href === "/dashboard/admin"
                                        ? pathname === item.href
                                        : pathname.startsWith(item.href);
                                const Icon = item.icon;

                                return (
                                    <li key={item.href}>
                                        <Link
                                            href={item.href}
                                            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${isActive
                                                ? "bg-white/15 text-white"
                                                : "text-white/55 hover:bg-white/8 hover:text-white"
                                                }`}
                                        >
                                            {/* Active bar */}
                                            <span
                                                className={`h-4 w-0.5 shrink-0 rounded-full transition-all ${isActive ? "bg-blue-300" : "bg-transparent group-hover:bg-white/20"
                                                    }`}
                                            />
                                            <span className={isActive ? "text-blue-200" : ""}>
                                                <Icon />
                                            </span>
                                            <span className="truncate">{item.label}</span>
                                            {isActive && (
                                                <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-blue-300" />
                                            )}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ))}
            </nav>

            {/* User footer ─────────────────────────────────── */}
            <div className="border-t border-white/10 px-3 py-3">
                <div className="flex items-center gap-3 rounded-xl bg-white/6 px-3 py-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-bold text-white">
                        {isAdmin ? "AD" : isChairperson ? "CH" : isFinance ? "FO" : "MB"}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-white">
                            {isAdmin ? "Administrator" : isChairperson ? "Chairperson" : isFinance ? "Finance Officer" : "Member"}
                        </p>
                        <p className="truncate text-[10px] text-white/40">ibibina.system</p>
                    </div>
                    <SettingsIcon />
                </div>
            </div>
        </aside>
    );
}
