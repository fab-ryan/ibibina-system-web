/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/contexts/toast-context";
import {
    useGetLoansQuery,
    useDisburseLoanMutation,
    useGetSummaryQuery,
    useRecordRepaymentMutation,
    useLazyGetRepaymentScheduleQuery,
} from "@/api/loan";
import { ItemsItem, LoanRepayment } from "@/types/res/loan";
import Modal from "@/components/ui/modal";
import Pagination from "@/components/ui/pagination";
import Spinner from "@/components/ui/spinner";
import {
    RefreshCw, Download, Eye, Banknote, ChevronDown,
    CheckCircle2, TrendingUp, Clock, AlertCircle, BarChart3, Search, CalendarClock, CreditCard,
} from "lucide-react";

// ── helpers ──────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
    pending: "bg-yellow-50 text-yellow-700 border border-yellow-200",
    approved: "bg-blue-50 text-blue-700 border border-blue-200",
    disbursed: "bg-green-50 text-green-700 border border-green-200",
    rejected: "bg-red-50 text-red-700 border border-red-200",
    closed: "bg-gray-100 text-gray-600 border border-gray-200",
    overdue: "bg-orange-50 text-orange-700 border border-orange-200",
};

function fmt(val: number | string | null | undefined, currency = "RWF") {
    if (val === null || val === undefined || val === "") return "—";
    const n = typeof val === "string" ? parseFloat(val) : val;
    if (isNaN(n)) return String(val);
    return `${currency} ${n.toLocaleString()}`;
}

function fmtDate(val: string | null | undefined) {
    if (!val) return "—";
    return new Date(val).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function memberName(loan: ItemsItem) {
    if (!loan.user) return loan.userId.slice(0, 8);
    return `${(loan.user as any).firstName ?? ""} ${(loan.user as any).lastName ?? ""}`.trim();
}

function exportCSV(rows: ItemsItem[]) {
    const header = ["Member", "Requested", "Disbursed", "Currency", "Term", "Status", "Purpose", "Created"];
    const lines = rows.map((l) => [
        memberName(l), String(l.requestedAmount), String(l.disbursedAmount ?? ""),
        l.currency, String(l.termMonths), l.status, l.purpose, fmtDate(l.createdAt),
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `loans-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

type ModalMode = "view" | "disburse" | "repay" | "schedule" | null;

// ── Page ─────────────────────────────────────────────────────────────────────

export default function FinanceLoansPage() {
    const { user } = useAuth();
    const toast = useToast();
    const groupId = (user as any)?.group?.id ?? (user as any)?.groupId ?? "";

    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState("");
    const [search, setSearch] = useState("");
    const limit = 20;

    const [activeModal, setActiveModal] = useState<ModalMode>(null);
    const [selected, setSelected] = useState<ItemsItem | null>(null);

    // Disburse form
    const [disburseAmount, setDisburseAmount] = useState("");
    const [disburseNotes, setDisburseNotes] = useState("");

    // Repayment form
    const [repayAmount, setRepayAmount] = useState("");
    const [repayMethod, setRepayMethod] = useState("cash");
    const [repayMomoRef, setRepayMomoRef] = useState("");
    const [repayBankRef, setRepayBankRef] = useState("");
    const [repayNotes, setRepayNotes] = useState("");

    const { data, isLoading, isFetching, refetch } = useGetLoansQuery(
        { groupId, status: statusFilter || undefined, page, limit },
        { skip: !groupId }
    );
    const { data: summaryData } = useGetSummaryQuery(
        { groupId }, { skip: !groupId }
    );
    const [disburseLoan, { isLoading: isDisbursing }] = useDisburseLoanMutation();
    const [recordRepayment, { isLoading: isRepaying }] = useRecordRepaymentMutation();
    const [getRepaymentSchedule, { data: scheduleData, isLoading: isScheduleLoading }] = useLazyGetRepaymentScheduleQuery();

    const loans: ItemsItem[] = data?.data?.items ?? [];
    const meta = data?.data?.meta;
    const summary = (summaryData as any)?.data;

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return loans;
        return loans.filter(
            (l) =>
                memberName(l).toLowerCase().includes(q) ||
                l.purpose?.toLowerCase().includes(q) ||
                l.status.toLowerCase().includes(q)
        );
    }, [loans, search]);

    function openAction(mode: ModalMode, loan: ItemsItem) {
        setSelected(loan);
        if (mode === "disburse") {
            setDisburseAmount(String(loan.requestedAmount));
            setDisburseNotes("");
        }
        if (mode === "repay") {
            setRepayAmount(""); setRepayMethod("cash");
            setRepayMomoRef(""); setRepayBankRef(""); setRepayNotes("");
        }
        if (mode === "schedule") {
            getRepaymentSchedule({ loanId: loan.id });
        }
        setActiveModal(mode);
    }

    function close() { setActiveModal(null); setSelected(null); }

    async function handleDisburse() {
        if (!selected) return;
        try {
            await disburseLoan({ id: selected.id, disbursedAmount: parseFloat(disburseAmount) || undefined, notes: disburseNotes || undefined }).unwrap();
            toast.success("Disbursed", `Loan for ${memberName(selected)} has been disbursed.`);
            close();
        } catch (err: any) {
            toast.error("Error", err?.data?.message ?? "Could not disburse loan.");
        }
    }

    async function handleRepayment() {
        if (!selected) return;
        if (!repayAmount || isNaN(parseFloat(repayAmount))) {
            toast.error("Validation", "Enter a valid repayment amount."); return;
        }
        try {
            await recordRepayment({
                loanId: selected.id,
                amount: parseFloat(repayAmount),
                paymentMethod: repayMethod,
                momoRef: repayMomoRef || undefined,
                bankRef: repayBankRef || undefined,
                notes: repayNotes || undefined,
            }).unwrap();
            toast.success("Repayment recorded", `Repayment from ${memberName(selected)} has been saved.`);
            close();
        } catch (err: any) {
            toast.error("Error", err?.data?.message ?? "Could not record repayment.");
        }
    }

    const schedule: LoanRepayment[] = (scheduleData as any)?.data?.items ?? [];

    return (
        <>
            <div className="grid gap-6">
                {/* Header */}
                <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="panel-tag">Finance Officer</p>
                        <h2 className="headline mt-2 text-2xl text-(--ib-ink) sm:text-3xl">Loans</h2>
                        <p className="mt-1 max-w-2xl text-sm leading-6 text-(--ib-muted)">
                            Disburse approved loans and record repayments.
                        </p>
                    </div>
                    <div className="flex shrink-0 gap-3">
                        <button onClick={() => refetch()} className="ib-btn-secondary gap-2" title="Refresh">
                            <RefreshCw size={15} className={isFetching ? "animate-spin" : ""} />
                            Refresh
                        </button>
                        <button onClick={() => exportCSV(filtered)} className="ib-btn-primary gap-2">
                            <Download size={15} /> Export CSV
                        </button>
                    </div>
                </header>

                {/* Summary */}
                {summary && (
                    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                            { label: "Total Issued", value: fmt(summary.totalLoansIssued ?? summary.totalDisbursed), icon: BarChart3, color: "text-blue-600", bg: "bg-blue-50" },
                            { label: "Active Loans", value: summary.activeLoans ?? summary.activeLoanCount ?? "—", icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
                            { label: "Pending Approval", value: summary.pendingLoans ?? "—", icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
                            { label: "Overdue", value: summary.overdueLoans ?? "—", icon: AlertCircle, color: "text-red-600", bg: "bg-red-50" },
                        ].map(({ label, value, icon: Icon, color, bg }) => (
                            <article key={label} className="rounded-xl border border-(--ib-line) bg-white p-5 shadow-sm">
                                <div className={`inline-flex items-center justify-center rounded-xl p-2.5 ${bg}`}>
                                    <Icon size={18} className={color} />
                                </div>
                                <p className="mt-3 text-xl font-extrabold text-(--ib-ink)">{String(value)}</p>
                                <p className="mt-0.5 text-xs font-medium text-(--ib-muted)">{label}</p>
                            </article>
                        ))}
                    </section>
                )}

                {/* Filters */}
                <section className="flex flex-wrap gap-3">
                    <div className="relative flex-1 min-w-52">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-(--ib-muted)" />
                        <input
                            className="h-9 w-full rounded-lg border border-(--ib-line) bg-white pl-8 pr-3 text-sm outline-none focus:border-(--ib-accent) focus:ring-2 focus:ring-(--ib-accent)/20"
                            placeholder="Search member or purpose…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <select
                        className="h-9 rounded-lg border border-(--ib-line) bg-white px-3 text-sm text-(--ib-ink) outline-none focus:border-(--ib-accent)"
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                    >
                        <option value="">All statuses</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="disbursed">Disbursed</option>
                        <option value="closed">Closed</option>
                        <option value="rejected">Rejected</option>
                    </select>
                </section>

                {/* Table */}
                <section className="rounded-xl border border-(--ib-line) bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-200 text-left text-sm">
                            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-(--ib-muted)">
                                <tr>
                                    <th className="px-5 py-3">Member</th>
                                    <th className="px-5 py-3">Requested</th>
                                    <th className="px-5 py-3">Disbursed</th>
                                    <th className="px-5 py-3">Term</th>
                                    <th className="px-5 py-3">Purpose</th>
                                    <th className="px-5 py-3">Status</th>
                                    <th className="px-5 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-(--ib-line)">
                                {isLoading ? (
                                    <tr><td colSpan={7} className="py-10 text-center text-sm text-(--ib-muted)">Loading…</td></tr>
                                ) : filtered.length === 0 ? (
                                    <tr><td colSpan={7} className="py-10 text-center text-sm text-(--ib-muted)">No loans found.</td></tr>
                                ) : filtered.map((loan) => (
                                    <LoanRow
                                        key={loan.id}
                                        loan={loan}
                                        onView={() => openAction("view", loan)}
                                        onDisburse={() => openAction("disburse", loan)}
                                        onRepay={() => openAction("repay", loan)}
                                        onSchedule={() => openAction("schedule", loan)}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {meta && meta.totalPages > 1 && (
                        <div className="border-t border-(--ib-line) px-5 py-4">
                            <Pagination currentPage={page} totalPages={meta.totalPages} onPageChange={setPage} />
                        </div>
                    )}
                </section>
            </div>

            {/* View Modal */}
            {selected && (
                <Modal isOpen={activeModal === "view"} onClose={close} title="Loan Details" description={`${memberName(selected)} — ${selected.status}`}>
                    <div className="grid gap-4 p-5">
                        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                            {([
                                ["Member", memberName(selected)],
                                ["Requested", fmt(selected.requestedAmount, selected.currency)],
                                ["Disbursed", fmt(selected.disbursedAmount, selected.currency)],
                                ["Term", `${selected.termMonths} months`],
                                ["Interest Rate", selected.interestRate ? `${selected.interestRate}%` : "—"],
                                ["Total Due", fmt(selected.totalDue, selected.currency)],
                                ["Installment", fmt(selected.installmentAmount, selected.currency)],
                                ["Status", selected.status],
                                ["Purpose", selected.purpose],
                                ["Disbursed At", fmtDate(selected.disbursedAt)],
                                ["First Repayment", fmtDate(selected.firstRepaymentDate)],
                                ["Applied At", fmtDate(selected.createdAt)],
                            ] as [string, string][]).map(([label, value]) => (
                                <div key={label}>
                                    <dt className="text-xs font-semibold uppercase tracking-wide text-(--ib-muted)">{label}</dt>
                                    <dd className="mt-0.5 font-medium text-(--ib-ink)">{value}</dd>
                                </div>
                            ))}
                        </dl>
                        <div className="flex flex-wrap justify-end gap-3 border-t border-(--ib-line) pt-4">
                            {selected.status === "approved" && (
                                <button className="ib-btn-primary gap-2" onClick={() => { close(); setTimeout(() => openAction("disburse", selected!), 50); }}>
                                    <Banknote size={14} /> Disburse
                                </button>
                            )}
                            {selected.status === "disbursed" && (
                                <>
                                    <button className="ib-btn-secondary gap-2" onClick={() => { close(); setTimeout(() => openAction("schedule", selected!), 50); }}>
                                        <CalendarClock size={14} /> Schedule
                                    </button>
                                    <button className="ib-btn-primary gap-2" onClick={() => { close(); setTimeout(() => openAction("repay", selected!), 50); }}>
                                        <CreditCard size={14} /> Record Repayment
                                    </button>
                                </>
                            )}
                            <button className="ib-btn-secondary" onClick={close}>Close</button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Disburse Modal */}
            {selected && (
                <Modal isOpen={activeModal === "disburse"} onClose={close} title="Disburse Loan" description={`Disburse approved loan for ${memberName(selected)}`}>
                    <div className="grid gap-4 p-5">
                        <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
                            <Banknote size={16} className="mt-0.5 shrink-0 text-blue-600" />
                            <p className="text-xs text-blue-800">
                                Approved amount: <strong>{fmt(selected.requestedAmount, selected.currency)}</strong>. Enter the actual disbursed amount below.
                            </p>
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-(--ib-muted)">Disbursed Amount</label>
                            <input
                                type="number" min={0}
                                className="h-9 w-full rounded-lg border border-(--ib-line) bg-white px-3 text-sm outline-none focus:border-(--ib-accent)"
                                value={disburseAmount}
                                onChange={(e) => setDisburseAmount(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-(--ib-muted)">Notes</label>
                            <textarea rows={2} className="w-full rounded-lg border border-(--ib-line) p-3 text-sm outline-none focus:border-(--ib-accent) resize-none" value={disburseNotes} onChange={(e) => setDisburseNotes(e.target.value)} />
                        </div>
                        <div className="flex justify-end gap-3 border-t border-(--ib-line) pt-4">
                            <button className="ib-btn-secondary" onClick={close}>Cancel</button>
                            <button className="ib-btn-primary gap-2" onClick={handleDisburse} disabled={isDisbursing}>
                                {isDisbursing ? <Spinner size="sm" /> : <CheckCircle2 size={14} />}
                                {isDisbursing ? "Disbursing…" : "Confirm Disburse"}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Record Repayment Modal */}
            {selected && (
                <Modal isOpen={activeModal === "repay"} onClose={close} title="Record Repayment" description={`Repayment from ${memberName(selected)}`}>
                    <div className="grid gap-4 p-5">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-(--ib-muted)">Payment Method</label>
                                <select
                                    className="h-9 w-full rounded-lg border border-(--ib-line) bg-white px-3 text-sm outline-none focus:border-(--ib-accent)"
                                    value={repayMethod}
                                    onChange={(e) => setRepayMethod(e.target.value)}
                                >
                                    <option value="cash">Cash</option>
                                    <option value="momo">MoMo</option>
                                    <option value="bank">Bank Transfer</option>
                                    <option value="cheque">Cheque</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-(--ib-muted)">Amount</label>
                                <input type="number" min={0} className="h-9 w-full rounded-lg border border-(--ib-line) bg-white px-3 text-sm outline-none focus:border-(--ib-accent)" value={repayAmount} onChange={(e) => setRepayAmount(e.target.value)} />
                            </div>
                            {repayMethod === "momo" && (
                                <div>
                                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-(--ib-muted)">MoMo Reference</label>
                                    <input className="h-9 w-full rounded-lg border border-(--ib-line) bg-white px-3 text-sm outline-none focus:border-(--ib-accent)" value={repayMomoRef} onChange={(e) => setRepayMomoRef(e.target.value)} />
                                </div>
                            )}
                            {repayMethod === "bank" && (
                                <div>
                                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-(--ib-muted)">Bank Reference</label>
                                    <input className="h-9 w-full rounded-lg border border-(--ib-line) bg-white px-3 text-sm outline-none focus:border-(--ib-accent)" value={repayBankRef} onChange={(e) => setRepayBankRef(e.target.value)} />
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-(--ib-muted)">Notes</label>
                            <textarea rows={2} className="w-full rounded-lg border border-(--ib-line) p-3 text-sm outline-none focus:border-(--ib-accent) resize-none" value={repayNotes} onChange={(e) => setRepayNotes(e.target.value)} />
                        </div>
                        <div className="flex justify-end gap-3 border-t border-(--ib-line) pt-4">
                            <button className="ib-btn-secondary" onClick={close}>Cancel</button>
                            <button className="ib-btn-primary gap-2" onClick={handleRepayment} disabled={isRepaying}>
                                {isRepaying ? <Spinner size="sm" /> : <CheckCircle2 size={14} />}
                                {isRepaying ? "Saving…" : "Confirm Repayment"}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Repayment Schedule Modal */}
            {selected && (
                <Modal isOpen={activeModal === "schedule"} onClose={close} title="Repayment Schedule" description={`${memberName(selected)} — ${fmt(selected.disbursedAmount ?? selected.requestedAmount, selected.currency)}`}>
                    <div className="grid gap-4 p-5">
                        {isScheduleLoading ? (
                            <div className="py-8 text-center"><Spinner /></div>
                        ) : schedule.length === 0 ? (
                            <p className="py-8 text-center text-sm text-(--ib-muted)">No schedule available.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 text-xs uppercase text-(--ib-muted)">
                                        <tr>
                                            <th className="px-4 py-2">#</th>
                                            <th className="px-4 py-2">Due Date</th>
                                            <th className="px-4 py-2">Principal</th>
                                            <th className="px-4 py-2">Interest</th>
                                            <th className="px-4 py-2">Total</th>
                                            <th className="px-4 py-2">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-(--ib-line)">
                                        {schedule.map((r) => (
                                            <tr key={r.id} className="hover:bg-gray-50/60">
                                                <td className="px-4 py-2 text-(--ib-muted)">{r.installmentNumber}</td>
                                                <td className="px-4 py-2">{fmtDate(r.dueDate)}</td>
                                                <td className="px-4 py-2">{fmt(r.principalAmount)}</td>
                                                <td className="px-4 py-2">{fmt(r.interestAmount)}</td>
                                                <td className="px-4 py-2 font-semibold">{fmt(r.totalAmount)}</td>
                                                <td className="px-4 py-2">
                                                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_BADGE[r.status] ?? "bg-gray-100 text-gray-600"}`}>
                                                        {r.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        <div className="flex justify-end border-t border-(--ib-line) pt-4">
                            <button className="ib-btn-secondary" onClick={close}>Close</button>
                        </div>
                    </div>
                </Modal>
            )}
        </>
    );
}

// ── Row component ─────────────────────────────────────────────────────────────

function LoanRow({ loan, onView, onDisburse, onRepay, onSchedule }: {
    loan: ItemsItem;
    onView: () => void;
    onDisburse: () => void;
    onRepay: () => void;
    onSchedule: () => void;
}) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [menuRect, setMenuRect] = useState<DOMRect | null>(null);
    const btnRef = useRef<HTMLButtonElement>(null);

    function handleToggle() {
        if (!menuOpen && btnRef.current) setMenuRect(btnRef.current.getBoundingClientRect());
        setMenuOpen((o) => !o);
    }

    return (
        <tr className="hover:bg-gray-50/60">
            <td className="px-5 py-3">
                <p className="font-semibold text-(--ib-ink)">{memberName(loan)}</p>
                <p className="text-xs text-(--ib-muted)">{(loan.user as any)?.email ?? ""}</p>
            </td>
            <td className="px-5 py-3 font-semibold text-(--ib-ink)">{fmt(loan.requestedAmount, loan.currency)}</td>
            <td className="px-5 py-3 text-(--ib-muted)">{fmt(loan.disbursedAmount, loan.currency)}</td>
            <td className="px-5 py-3 text-(--ib-muted)">{loan.termMonths} mo</td>
            <td className="px-5 py-3 max-w-36 truncate text-(--ib-muted)" title={loan.purpose}>{loan.purpose}</td>
            <td className="px-5 py-3">
                <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_BADGE[loan.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {loan.status}
                </span>
            </td>
            <td className="px-5 py-3 text-right">
                <button
                    ref={btnRef}
                    onClick={handleToggle}
                    className="inline-flex items-center gap-1 rounded-md border border-(--ib-line) bg-white px-2.5 py-1.5 text-xs font-medium text-(--ib-ink) shadow-sm hover:bg-gray-50"
                >
                    Actions <ChevronDown size={12} />
                </button>
                {menuOpen && menuRect && createPortal(
                    <>
                        <div className="fixed inset-0 z-9990" onClick={() => setMenuOpen(false)} />
                        <div
                            className="fixed z-9991 min-w-44 overflow-hidden rounded-xl border border-(--ib-line) bg-white py-1 shadow-lg"
                            style={{
                                top: window.innerHeight - menuRect.bottom > 140 ? menuRect.bottom + 6 : menuRect.top - 170,
                                right: window.innerWidth - menuRect.right,
                            }}
                        >
                            <button onClick={() => { setMenuOpen(false); onView(); }} className="flex w-full items-center gap-2.5 px-4 py-2 text-sm hover:bg-gray-50 text-(--ib-ink)">
                                <Eye size={14} /> View Details
                            </button>
                            {loan.status === "approved" && (
                                <button onClick={() => { setMenuOpen(false); onDisburse(); }} className="flex w-full items-center gap-2.5 px-4 py-2 text-sm hover:bg-gray-50 text-blue-700">
                                    <Banknote size={14} /> Disburse
                                </button>
                            )}
                            {loan.status === "disbursed" && (
                                <>
                                    <button onClick={() => { setMenuOpen(false); onRepay(); }} className="flex w-full items-center gap-2.5 px-4 py-2 text-sm hover:bg-gray-50 text-green-700">
                                        <CreditCard size={14} /> Record Repayment
                                    </button>
                                    <button onClick={() => { setMenuOpen(false); onSchedule(); }} className="flex w-full items-center gap-2.5 px-4 py-2 text-sm hover:bg-gray-50 text-(--ib-muted)">
                                        <CalendarClock size={14} /> View Schedule
                                    </button>
                                </>
                            )}
                        </div>
                    </>,
                    document.body
                )}
            </td>
        </tr>
    );
}
