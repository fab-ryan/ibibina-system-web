/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useGetFinanceDashboardQuery } from "@/api/dashboard";
import { useAuth } from "@/contexts/auth-context";
import { DashboardAlert, FinanceDashboardStats, RecentActivityItem } from "@/types/res/dashboard";
import {
    AlertCircle,
    AlertTriangle,
    ArrowDownLeft,
    ArrowUpRight,
    BarChart3,
    Banknote,
    Bell,
    Building2,
    CheckCircle2,
    ChevronRight,
    CircleDollarSign,
    Download,
    FileText,
    Info,
    RefreshCw,
    TrendingUp,
    Users,
} from "lucide-react";
import Link from "next/link";

function fmt(n: number) {
    return `RWF ${n.toLocaleString("en-RW", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtShort(n: number) {
    if (n >= 1_000_000) return `RWF ${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `RWF ${(n / 1_000).toFixed(1)}K`;
    return `RWF ${n.toLocaleString()}`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({
    label,
    value,
    icon: Icon,
    iconColor,
    iconBg,
}: {
    label: string;
    value: string;
    icon: React.ElementType;
    iconColor: string;
    iconBg: string;
}) {
    return (
        <article className="rounded-xl border border-(--ib-line) bg-white p-5 shadow-sm">
            <div className={`inline-flex items-center justify-center rounded-xl p-2.5 ${iconBg}`}>
                <Icon size={20} className={iconColor} />
            </div>
            <p className="mt-3 text-xl font-extrabold text-(--ib-ink)">{value}</p>
            <p className="mt-0.5 text-xs font-medium text-(--ib-muted)">{label}</p>
        </article>
    );
}

function AlertRow({ alert }: { alert: DashboardAlert }) {
    const isError = alert.severity === "error";
    const isWarning = alert.severity === "warning";
    const Icon = isError ? AlertCircle : isWarning ? AlertTriangle : Info;
    const colors = isError
        ? "border-l-red-500 bg-red-50 text-red-700"
        : isWarning
        ? "border-l-amber-500 bg-amber-50 text-amber-700"
        : "border-l-blue-500 bg-blue-50 text-blue-700";
    const iconColor = isError ? "text-red-500" : isWarning ? "text-amber-500" : "text-blue-500";

    return (
        <div className={`flex items-start gap-3 rounded-xl border-l-4 p-4 ${colors}`}>
            <Icon size={17} className={`mt-0.5 shrink-0 ${iconColor}`} />
            <p className="text-sm font-medium">{alert.message}</p>
        </div>
    );
}

const TX_CONFIG: Record<string, { color: string; bg: string; icon: React.ElementType; label: string; sign: "+" | "−" }> = {
    contribution: { color: "text-green-700", bg: "bg-green-100", icon: ArrowDownLeft, label: "Contribution", sign: "+" },
    loan: { color: "text-amber-700", bg: "bg-amber-100", icon: ArrowUpRight, label: "Loan", sign: "−" },
    penalty: { color: "text-red-600", bg: "bg-red-100", icon: AlertCircle, label: "Penalty", sign: "−" },
    repayment: { color: "text-blue-700", bg: "bg-blue-100", icon: RefreshCw, label: "Repayment", sign: "+" },
};

const STATUS_STYLES: Record<string, string> = {
    paid: "bg-green-50 text-green-700 border border-green-200",
    pending: "bg-amber-50 text-amber-700 border border-amber-200",
    disbursed: "bg-blue-50 text-blue-700 border border-blue-200",
};

function TransactionRow({ item }: { item: RecentActivityItem }) {
    const cfg = TX_CONFIG[item.type] ?? TX_CONFIG.repayment;
    const Icon = cfg.icon;
    const statusStyle = STATUS_STYLES[item.status] ?? "bg-gray-50 text-gray-600 border border-gray-200";

    return (
        <div className="flex items-center gap-4 rounded-xl border border-(--ib-line) bg-white p-4 shadow-sm">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${cfg.bg}`}>
                <Icon size={18} className={cfg.color} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-(--ib-ink) truncate">{item.member}</p>
                <p className="text-xs text-(--ib-muted) mt-0.5">{cfg.label} · {item.date}</p>
            </div>
            <div className="shrink-0 text-right">
                <p className={`text-sm font-extrabold ${cfg.color}`}>
                    {cfg.sign}{item.amount.toLocaleString()} RWF
                </p>
                <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusStyle}`}>
                    {item.status}
                </span>
            </div>
        </div>
    );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function FinanceDashboardPage() {
    const { user } = useAuth();
    const { data, isLoading, isFetching, refetch } = useGetFinanceDashboardQuery();

    const d = data?.data;
    const stats: FinanceDashboardStats = d?.stats ?? {
        totalContributions: 0,
        totalLoansIssued: 0,
        pendingPenalties: 0,
        interestEarned: 0,
        cashOnHand: 0,
        activeLoanCount: 0,
    };

    const firstName = (user as any)?.firstName ?? "Finance Officer";
    const lastName = (user as any)?.lastName ?? "";
    const shortName = lastName ? `${firstName} ${lastName.charAt(0)}.` : firstName;

    return (
        <div className="grid gap-6">

            {/* ── HERO HEADER ──────────────────────────────────────────── */}
            <header className="relative overflow-hidden rounded-2xl bg-[#081936] px-7 py-8">
                <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full bg-white/5" />
                <div className="pointer-events-none absolute -bottom-8 -left-8 h-36 w-36 rounded-full bg-white/[0.03]" />

                <div className="relative flex items-start justify-between gap-4">
                    <div>
                        {d?.group && (
                            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5">
                                <Building2 size={11} className="text-blue-300" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-200">
                                    {d.group.name}
                                </span>
                            </div>
                        )}
                        <p className="text-xs font-medium text-blue-300">Finance Officer,</p>
                        <h1 className="mt-1 text-2xl font-extrabold text-white sm:text-3xl">
                            {firstName} {lastName} 💼
                        </h1>
                        <p className="mt-2 max-w-md text-xs leading-5 text-blue-200/70">
                            Automated calculations · Secure M-Money · Instant reports
                        </p>
                    </div>
                    <button
                        onClick={() => refetch()}
                        className="shrink-0 rounded-full bg-white/10 p-2.5 text-blue-300 hover:bg-white/20 transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw size={16} className={isFetching ? "animate-spin" : ""} />
                    </button>
                </div>
            </header>

            {/* ── TREASURY CARD ─────────────────────────────────────────── */}
            <section className="relative overflow-hidden rounded-2xl bg-[#0f2240] p-7 shadow-xl">
                <div className="pointer-events-none absolute -right-10 -top-14 h-52 w-52 rounded-full bg-white/[0.06]" />
                <div className="pointer-events-none absolute -bottom-12 left-4 h-40 w-40 rounded-full bg-white/[0.04]" />

                <div className="relative flex items-start justify-between gap-4">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[1.4px] text-blue-300/60">
                            {d?.group?.name ?? "GROUP"}
                        </p>
                        <p className="mt-0.5 text-xs text-blue-300/40">{d?.group?.code ?? ""}</p>
                    </div>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                        <Building2 size={18} className="text-blue-300" />
                    </div>
                </div>

                <div className="relative mt-6">
                    <p className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
                        {isLoading ? "—" : fmtShort(stats.cashOnHand)}
                    </p>
                    <p className="mt-1.5 text-xs text-blue-300/60">Total Cash on Hand</p>
                </div>

                <div className="relative mt-6 border-t border-white/10 pt-5">
                    <div className="flex items-center justify-between text-xs">
                        <div>
                            <p className="font-bold uppercase tracking-widest text-blue-300/40" style={{ fontSize: 9 }}>TREASURER</p>
                            <p className="mt-1 font-semibold text-white">{shortName}</p>
                        </div>
                        <div className="text-center">
                            <p className="font-bold uppercase tracking-widest text-blue-300/40" style={{ fontSize: 9 }}>MEMBERS</p>
                            <p className="mt-1 font-semibold text-white">{d?.group?.totalMembers ?? "—"}</p>
                        </div>
                        <div className="text-right">
                            <p className="font-bold uppercase tracking-widest text-blue-300/40" style={{ fontSize: 9 }}>NEXT MEETING</p>
                            <p className="mt-1 font-semibold text-white">
                                {d?.group?.nextMeeting ? d.group.nextMeeting.slice(5) : "—"}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── KPI STRIP ─────────────────────────────────────────────── */}
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KpiCard
                    label="Total Contributions"
                    value={isLoading ? "—" : fmtShort(stats.totalContributions)}
                    icon={TrendingUp}
                    iconColor="text-green-600"
                    iconBg="bg-green-50"
                />
                <KpiCard
                    label="Loans Issued"
                    value={isLoading ? "—" : fmtShort(stats.totalLoansIssued)}
                    icon={Banknote}
                    iconColor="text-amber-600"
                    iconBg="bg-amber-50"
                />
                <KpiCard
                    label="Interest Earned"
                    value={isLoading ? "—" : fmtShort(stats.interestEarned)}
                    icon={CircleDollarSign}
                    iconColor="text-blue-600"
                    iconBg="bg-blue-50"
                />
                <KpiCard
                    label="Penalties Due"
                    value={isLoading ? "—" : fmt(stats.pendingPenalties)}
                    icon={AlertCircle}
                    iconColor="text-red-600"
                    iconBg="bg-red-50"
                />
            </section>

            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                <div className="grid gap-6">

                    {/* ── ALERTS ───────────────────────────────────────────── */}
                    {(d?.alerts?.length ?? 0) > 0 && (
                        <section className="rounded-xl border border-(--ib-line) bg-white p-6 shadow-sm">
                            <h2 className="mb-4 text-sm font-bold text-(--ib-ink) flex items-center gap-2">
                                <Bell size={15} />
                                Alerts
                            </h2>
                            <div className="grid gap-3">
                                {d!.alerts.map((a) => (
                                    <AlertRow key={a.id} alert={a} />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* ── RECENT TRANSACTIONS ───────────────────────────────── */}
                    <section className="rounded-xl border border-(--ib-line) bg-white p-6 shadow-sm">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-sm font-bold text-(--ib-ink)">Recent Transactions</h2>
                            <Link
                                href="/dashboard/finance/transactions"
                                className="flex items-center gap-1 text-xs font-semibold text-(--ib-accent) hover:underline"
                            >
                                View All <ChevronRight size={13} />
                            </Link>
                        </div>

                        {isLoading ? (
                            <p className="py-8 text-center text-sm text-(--ib-muted)">Loading…</p>
                        ) : !d?.recentActivity?.length ? (
                            <p className="py-8 text-center text-sm text-(--ib-muted)">No recent activity.</p>
                        ) : (
                            <div className="grid gap-3">
                                {d.recentActivity.map((item) => (
                                    <TransactionRow key={item.id} item={item} />
                                ))}
                            </div>
                        )}
                    </section>
                </div>

                {/* ── QUICK ACTIONS ─────────────────────────────────────── */}
                <aside className="rounded-xl border border-(--ib-line) bg-white p-6 shadow-sm self-start">
                    <h2 className="mb-4 text-sm font-bold text-(--ib-ink)">Quick Actions</h2>
                    <div className="grid gap-3">
                        {[
                            { label: "Record Payment", href: "/dashboard/finance/contributions", icon: ArrowDownLeft, iconBg: "bg-blue-50", iconColor: "text-blue-600" },
                            { label: "Manage Loans", href: "/dashboard/finance/loans", icon: Banknote, iconBg: "bg-amber-50", iconColor: "text-amber-600" },
                            { label: "Generate Report", href: "/dashboard/finance/reports", icon: BarChart3, iconBg: "bg-green-50", iconColor: "text-green-600" },
                            { label: "Export Data", href: "/dashboard/finance/reports", icon: Download, iconBg: "bg-purple-50", iconColor: "text-purple-600" },
                            { label: "View Members", href: "/dashboard/chairperson/members", icon: Users, iconBg: "bg-indigo-50", iconColor: "text-indigo-600" },
                            { label: "Full Audit Trail", href: "/dashboard/finance/transactions", icon: FileText, iconBg: "bg-gray-50", iconColor: "text-gray-600" },
                        ].map(({ label, href, icon: Icon, iconBg, iconColor }) => (
                            <Link
                                key={label}
                                href={href}
                                className="flex items-center gap-3 rounded-xl border border-(--ib-line) p-3.5 hover:bg-gray-50 transition-colors"
                            >
                                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
                                    <Icon size={17} className={iconColor} />
                                </div>
                                <span className="text-sm font-semibold text-(--ib-ink)">{label}</span>
                                <ChevronRight size={14} className="ml-auto text-(--ib-muted)" />
                            </Link>
                        ))}
                    </div>
                </aside>
            </div>

            {/* ── SECONDARY STATS ───────────────────────────────────────── */}
            <section className="grid gap-4 sm:grid-cols-3">
                <article className="rounded-xl border border-(--ib-line) bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50">
                            <RefreshCw size={18} className="text-cyan-600" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-(--ib-muted)">Active Loans</p>
                            <p className="text-xl font-extrabold text-(--ib-ink)">{stats.activeLoanCount}</p>
                        </div>
                    </div>
                </article>
                <article className="rounded-xl border border-(--ib-line) bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                            <CheckCircle2 size={18} className="text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-(--ib-muted)">Members</p>
                            <p className="text-xl font-extrabold text-(--ib-ink)">{d?.group?.totalMembers ?? "—"}</p>
                        </div>
                    </div>
                </article>
                <article className="rounded-xl border border-(--ib-line) bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50">
                            <TrendingUp size={18} className="text-violet-600" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-(--ib-muted)">Cash on Hand</p>
                            <p className="text-xl font-extrabold text-(--ib-ink)">{fmtShort(stats.cashOnHand)}</p>
                        </div>
                    </div>
                </article>
            </section>

        </div>
    );
}
