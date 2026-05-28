/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo } from "react";
import { useGetFinanceReportQuery } from "@/api/dashboard";
import type { FinanceReportMonthly, FinanceReportSummary } from "@/types/res/dashboard";
import Spinner from "@/components/ui/spinner";
import {
    RefreshCw, Download, BarChart3, TrendingUp, CreditCard,
    Banknote, AlertCircle, Users, Landmark, Activity,
} from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(val: number | string | null | undefined, currency = "RWF") {
    if (val === null || val === undefined) return "—";
    const n = typeof val === "string" ? parseFloat(val) : val;
    if (isNaN(n)) return String(val);
    return `${currency} ${n.toLocaleString()}`;
}

function fmtMonth(val: string) {
    try {
        return new Date(`${val}-01`).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    } catch {
        return val;
    }
}

function exportCSV(group: string, summary: FinanceReportSummary, monthly: FinanceReportMonthly[]) {
    const summaryLines = [
        ["Group", group],
        [],
        ["Metric", "Value"],
        ["Total Contributions", fmt(summary.totalContributions)],
        ["Total Loans Issued", fmt(summary.totalLoansIssued)],
        ["Total Repaid", fmt(summary.totalRepaid)],
        ["Interest Earned", fmt(summary.interestEarned)],
        ["Pending Penalties", fmt(summary.pendingPenalties)],
        ["Cash on Hand", fmt(summary.cashOnHand)],
        ["Active Loans", String(summary.activeLoanCount)],
        ["Total Members", String(summary.memberCount)],
        [],
        ["Month", "Contributions", "Repayments", "Penalties"],
        ...monthly.map((m) => [fmtMonth(m.month), fmt(m.contributions), fmt(m.repayments), fmt(m.penalties)]),
    ].map((row) => (row as string[]).map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([summaryLines], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `finance-report-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function FinanceReportsPage() {
    const { data, isLoading, isFetching, refetch } = useGetFinanceReportQuery();
    const report = (data as any)?.data;
    const summary: FinanceReportSummary | undefined = report?.summary;
    const monthly: FinanceReportMonthly[] = report?.monthly ?? [];
    const groupName: string = report?.group?.name ?? "Group";

    // Calculate totals across all months for the bar chart widths
    const maxContributions = useMemo(() => Math.max(...monthly.map((m) => m.contributions), 1), [monthly]);

    const summaryCards = summary
        ? [
            { label: "Total Contributions", value: fmt(summary.totalContributions), icon: BarChart3, color: "text-green-600", bg: "bg-green-50" },
            { label: "Total Loans Issued", value: fmt(summary.totalLoansIssued), icon: Landmark, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Total Repaid", value: fmt(summary.totalRepaid), icon: CreditCard, color: "text-cyan-600", bg: "bg-cyan-50" },
            { label: "Interest Earned", value: fmt(summary.interestEarned), icon: TrendingUp, color: "text-indigo-600", bg: "bg-indigo-50" },
            { label: "Pending Penalties", value: fmt(summary.pendingPenalties), icon: AlertCircle, color: "text-orange-600", bg: "bg-orange-50" },
            { label: "Cash on Hand", value: fmt(summary.cashOnHand), icon: Banknote, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Active Loans", value: String(summary.activeLoanCount), icon: Activity, color: "text-purple-600", bg: "bg-purple-50" },
            { label: "Total Members", value: String(summary.memberCount), icon: Users, color: "text-gray-600", bg: "bg-gray-100" },
        ]
        : [];

    return (
        <div className="grid gap-6">
            {/* Header */}
            <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <p className="panel-tag">Finance Officer</p>
                    <h2 className="headline mt-2 text-2xl text-(--ib-ink) sm:text-3xl">Finance Report</h2>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-(--ib-muted)">
                        Overall financial health — contributions, loans, repayments, and penalties.
                    </p>
                </div>
                <div className="flex shrink-0 gap-3">
                    <button onClick={() => refetch()} className="ib-btn-secondary gap-2" title="Refresh">
                        <RefreshCw size={15} className={isFetching ? "animate-spin" : ""} />
                        Refresh
                    </button>
                    {summary && (
                        <button onClick={() => exportCSV(groupName, summary, monthly)} className="ib-btn-primary gap-2">
                            <Download size={15} /> Export CSV
                        </button>
                    )}
                </div>
            </header>

            {isLoading ? (
                <div className="flex items-center justify-center py-20"><Spinner /></div>
            ) : !report ? (
                <div className="rounded-xl border border-(--ib-line) bg-white p-10 text-center text-sm text-(--ib-muted)">
                    No report data available.
                </div>
            ) : (
                <>
                    {/* Group banner */}
                    <section className="rounded-xl border border-(--ib-line) bg-white px-6 py-4 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wide text-(--ib-muted)">Group</p>
                        <p className="mt-1 text-lg font-bold text-(--ib-ink)">{groupName}</p>
                        {report.group?.code && <p className="text-xs text-(--ib-muted)">{report.group.code}</p>}
                    </section>

                    {/* Summary KPI cards */}
                    {summaryCards.length > 0 && (
                        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            {summaryCards.map(({ label, value, icon: Icon, color, bg }) => (
                                <article key={label} className="rounded-xl border border-(--ib-line) bg-white p-5 shadow-sm">
                                    <div className={`inline-flex items-center justify-center rounded-xl p-2.5 ${bg}`}>
                                        <Icon size={18} className={color} />
                                    </div>
                                    <p className="mt-3 text-xl font-extrabold text-(--ib-ink)">{value}</p>
                                    <p className="mt-0.5 text-xs font-medium text-(--ib-muted)">{label}</p>
                                </article>
                            ))}
                        </section>
                    )}

                    {/* Monthly breakdown */}
                    {monthly.length > 0 && (
                        <section className="rounded-xl border border-(--ib-line) bg-white shadow-sm">
                            <div className="border-b border-(--ib-line) px-6 py-4">
                                <h3 className="text-base font-bold text-(--ib-ink)">Monthly Breakdown</h3>
                                <p className="text-xs text-(--ib-muted) mt-0.5">Contributions, repayments, and penalties per month.</p>
                            </div>

                            {/* Bar chart (inline, no external library) */}
                            <div className="px-6 py-4">
                                <div className="grid gap-3">
                                    {monthly.map((m) => (
                                        <div key={m.month} className="grid gap-1">
                                            <p className="text-xs font-semibold text-(--ib-muted)">{fmtMonth(m.month)}</p>
                                            <div className="flex items-center gap-2">
                                                <div className="h-4 rounded-full bg-green-500" style={{ width: `${Math.max(2, (m.contributions / maxContributions) * 100)}%`, maxWidth: "100%" }} title={`Contributions: ${fmt(m.contributions)}`} />
                                                <span className="shrink-0 text-xs text-(--ib-muted)">{fmt(m.contributions)}</span>
                                            </div>
                                            {m.repayments > 0 && (
                                                <div className="flex items-center gap-2">
                                                    <div className="h-4 rounded-full bg-cyan-500" style={{ width: `${Math.max(2, (m.repayments / maxContributions) * 100)}%`, maxWidth: "100%" }} title={`Repayments: ${fmt(m.repayments)}`} />
                                                    <span className="shrink-0 text-xs text-(--ib-muted)">{fmt(m.repayments)}</span>
                                                </div>
                                            )}
                                            {m.penalties > 0 && (
                                                <div className="flex items-center gap-2">
                                                    <div className="h-4 rounded-full bg-orange-400" style={{ width: `${Math.max(2, (m.penalties / maxContributions) * 100)}%`, maxWidth: "100%" }} title={`Penalties: ${fmt(m.penalties)}`} />
                                                    <span className="shrink-0 text-xs text-(--ib-muted)">{fmt(m.penalties)}</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-4 flex flex-wrap gap-4 text-xs text-(--ib-muted)">
                                    <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-full bg-green-500" /> Contributions</span>
                                    <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-full bg-cyan-500" /> Repayments</span>
                                    <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-full bg-orange-400" /> Penalties</span>
                                </div>
                            </div>

                            {/* Table */}
                            <div className="overflow-x-auto border-t border-(--ib-line)">
                                <table className="w-full min-w-120 text-left text-sm">
                                    <thead className="bg-gray-50 text-xs uppercase tracking-wide text-(--ib-muted)">
                                        <tr>
                                            <th className="px-5 py-3">Month</th>
                                            <th className="px-5 py-3">Contributions</th>
                                            <th className="px-5 py-3">Repayments</th>
                                            <th className="px-5 py-3">Penalties</th>
                                            <th className="px-5 py-3">Net</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-(--ib-line)">
                                        {monthly.map((m) => {
                                            const net = m.contributions + m.repayments - m.penalties;
                                            return (
                                                <tr key={m.month} className="hover:bg-gray-50/60">
                                                    <td className="px-5 py-3 font-medium text-(--ib-ink)">{fmtMonth(m.month)}</td>
                                                    <td className="px-5 py-3 font-semibold text-green-700">{fmt(m.contributions)}</td>
                                                    <td className="px-5 py-3 font-semibold text-cyan-700">{fmt(m.repayments)}</td>
                                                    <td className="px-5 py-3 font-semibold text-orange-700">{fmt(m.penalties)}</td>
                                                    <td className={`px-5 py-3 font-bold ${net >= 0 ? "text-green-700" : "text-red-700"}`}>{fmt(net)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot className="border-t-2 border-(--ib-line) bg-gray-50">
                                        <tr>
                                            <td className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-(--ib-muted)">Total</td>
                                            <td className="px-5 py-3 font-bold text-green-700">
                                                {fmt(monthly.reduce((s, m) => s + m.contributions, 0))}
                                            </td>
                                            <td className="px-5 py-3 font-bold text-cyan-700">
                                                {fmt(monthly.reduce((s, m) => s + m.repayments, 0))}
                                            </td>
                                            <td className="px-5 py-3 font-bold text-orange-700">
                                                {fmt(monthly.reduce((s, m) => s + m.penalties, 0))}
                                            </td>
                                            <td className="px-5 py-3 font-bold text-(--ib-ink)">
                                                {fmt(monthly.reduce((s, m) => s + m.contributions + m.repayments - m.penalties, 0))}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </section>
                    )}
                </>
            )}
        </div>
    );
}
