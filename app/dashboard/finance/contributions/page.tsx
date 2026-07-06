/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/contexts/toast-context";
import {
    useGetContributionsQuery,
    useGetContributionGroupSummaryQuery,
    usePayContributionMutation,
    useWaiveContributionMutation,
} from "@/api/contribution";
import type { Contribution, ContributionStatus, PaymentMethod } from "@/types/res/contribution";
import Modal from "@/components/ui/modal";
import Pagination from "@/components/ui/pagination";
import Spinner from "@/components/ui/spinner";
import {
    RefreshCw, Download, Eye, Banknote, ChevronDown,
    CheckCircle2, XCircle, TrendingUp, Clock, AlertCircle, BarChart3, Search,
} from "lucide-react";

// ── helpers ──────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
    pending: "bg-yellow-50 text-yellow-700 border border-yellow-200",
    paid: "bg-green-50 text-green-700 border border-green-200",
    partial: "bg-blue-50 text-blue-700 border border-blue-200",
    missed: "bg-red-50 text-red-700 border border-red-200",
    waived: "bg-gray-100 text-gray-600 border border-gray-200",
};

const PAYMENT_METHODS: { label: string; value: PaymentMethod }[] = [
    { label: "Cash", value: "cash" },
    { label: "MoMo", value: "momo" },
    { label: "Bank Transfer", value: "bank" },
    { label: "Cheque", value: "cheque" },
    { label: "Other", value: "other" },
];

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

function memberName(c: Contribution) {
    if (!c.user) return c.userId.slice(0, 8);
    return `${(c.user as any).firstName ?? ""} ${(c.user as any).lastName ?? ""}`.trim();
}

function exportCSV(rows: Contribution[]) {
    const header = ["Member", "Period", "Due Date", "Expected", "Paid", "Status"];
    const lines = rows.map((c) => [
        memberName(c), c.period ?? "", fmtDate(c.dueDate),
        String(c.amount), String(c.paidAmount ?? ""), c.status,
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contributions-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

type ModalMode = "view" | "pay" | "waive" | null;

// ── Page ─────────────────────────────────────────────────────────────────────

export default function FinanceContributionsPage() {
    const { user } = useAuth();
    const toast = useToast();
    const groupId = (user as any)?.group?.id ?? (user as any)?.groupId ?? "";

    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState("");
    const [search, setSearch] = useState("");
    const limit = 20;

    const [activeModal, setActiveModal] = useState<ModalMode>(null);
    const [selected, setSelected] = useState<Contribution | null>(null);

    // Pay form
    const [payMethod, setPayMethod] = useState<PaymentMethod>("cash");
    const [payAmount, setPayAmount] = useState("");
    const [payPaidAt, setPayPaidAt] = useState("");
    const [payMomoRef, setPayMomoRef] = useState("");
    const [payBankRef, setPayBankRef] = useState("");
    const [payPhone, setPayPhone] = useState("");
    const [payNotes, setPayNotes] = useState("");

    // Waive form
    const [waiveNotes, setWaiveNotes] = useState("");

    const { data, isLoading, isFetching, refetch } = useGetContributionsQuery(
        { groupId, status: statusFilter as ContributionStatus || undefined, page, limit },
        { skip: !groupId }
    );
    const { data: summary } = useGetContributionGroupSummaryQuery(
        { groupId }, { skip: !groupId }
    );
    const [payContribution, { isLoading: isPaying }] = usePayContributionMutation();
    const [waiveContribution, { isLoading: isWaiving }] = useWaiveContributionMutation();

    const contributions: Contribution[] = (data as any)?.data?.items ?? [];
    const meta = (data as any)?.data?.meta;
    const s = (summary as any)?.data;

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return contributions;
        return contributions.filter(
            (c) =>
                memberName(c).toLowerCase().includes(q) ||
                (c.period ?? "").toLowerCase().includes(q)
        );
    }, [contributions, search]);

    function openAction(mode: ModalMode, c: Contribution) {
        setSelected(c);
        if (mode === "pay") {
            setPayMethod("cash");
            setPayAmount(String(c.amount));
            setPayPaidAt(new Date().toISOString().slice(0, 16));
            setPayMomoRef(""); setPayBankRef(""); setPayPhone(""); setPayNotes("");
        }
        if (mode === "waive") setWaiveNotes("");
        setActiveModal(mode);
    }

    function close() { setActiveModal(null); setSelected(null); }

    async function handlePay() {
        if (!selected) return;
        if (!payAmount || isNaN(parseFloat(payAmount))) {
            toast.error("Validation", "Enter a valid amount."); return;
        }
        if (payMethod === "momo" && !payMomoRef) {
            toast.error("Validation", "MoMo reference is required."); return;
        }
        if (payMethod === "bank" && !payBankRef) {
            toast.error("Validation", "Bank reference is required."); return;
        }
        try {
            await payContribution({
                id: selected.id,
                data: {
                    paymentMethod: payMethod,
                    paidAmount: parseFloat(payAmount),
                    paidAt: payPaidAt || new Date().toISOString(),
                    momoRef: payMomoRef || undefined,
                    bankRef: payBankRef || undefined,
                    phoneNumber: payPhone || undefined,
                    notes: payNotes || undefined,
                },
            }).unwrap();
            toast.success("Payment recorded", `Payment for ${memberName(selected)} has been saved.`);
            close();
        } catch (err: any) {
            toast.error("Error", err?.data?.message ?? "Could not record payment.");
        }
    }

    async function handleWaive() {
        if (!selected) return;
        try {
            await waiveContribution({ id: selected.id, data: { reason: waiveNotes || '' } }).unwrap();
            toast.success("Waived", `Contribution for ${memberName(selected)} has been waived.`);
            close();
        } catch (err: any) {
            toast.error("Error", err?.data?.message ?? "Could not waive contribution.");
        }
    }

    return (
        <>
            <div className="grid gap-6">
                {/* Header */}
                <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="panel-tag">Finance Officer</p>
                        <h2 className="headline mt-2 text-2xl text-(--ib-ink) sm:text-3xl">Contributions</h2>
                        <p className="mt-1 max-w-2xl text-sm leading-6 text-(--ib-muted)">
                            Record and manage member contribution payments.
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
                {s && (
                    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                            { label: "Total Expected", value: fmt(s.totalExpected), icon: BarChart3, color: "text-blue-600", bg: "bg-blue-50" },
                            { label: "Total Collected", value: fmt(s.totalCollected), icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
                            { label: "Pending Payments", value: s.pendingCount ?? "—", icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
                            { label: "Missed / Overdue", value: s.missedCount ?? "—", icon: AlertCircle, color: "text-red-600", bg: "bg-red-50" },
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
                            placeholder="Search member or period…"
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
                        <option value="paid">Paid</option>
                        <option value="partial">Partial</option>
                        <option value="missed">Missed</option>
                        <option value="waived">Waived</option>
                    </select>
                </section>

                {/* Table */}
                <section className="rounded-xl border border-(--ib-line) bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-200 text-left text-sm">
                            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-(--ib-muted)">
                                <tr>
                                    <th className="px-5 py-3">Member</th>
                                    <th className="px-5 py-3">Period</th>
                                    <th className="px-5 py-3">Due Date</th>
                                    <th className="px-5 py-3">Expected</th>
                                    <th className="px-5 py-3">Paid</th>
                                    <th className="px-5 py-3">Status</th>
                                    <th className="px-5 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-(--ib-line)">
                                {isLoading ? (
                                    <tr><td colSpan={7} className="py-10 text-center text-sm text-(--ib-muted)">Loading…</td></tr>
                                ) : filtered.length === 0 ? (
                                    <tr><td colSpan={7} className="py-10 text-center text-sm text-(--ib-muted)">No contributions found.</td></tr>
                                ) : filtered.map((c) => (
                                    <ContributionRow key={c.id} c={c} onView={() => openAction("view", c)} onPay={() => openAction("pay", c)} onWaive={() => openAction("waive", c)} />
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
                <Modal isOpen={activeModal === "view"} onClose={close} title="Contribution Details" description={`${memberName(selected)} — ${selected.period ?? ""}`}>
                    <div className="grid gap-4 p-5">
                        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                            {([
                                ["Member", memberName(selected)],
                                ["Period", selected.period ?? "—"],
                                ["Due Date", fmtDate(selected.dueDate)],
                                ["Expected Amount", fmt(selected.amount, selected.currency)],
                                ["Paid Amount", fmt(selected.paidAmount, selected.currency)],
                                ["Status", selected.status],
                                ["Payment Method", (selected as any).paymentMethod ?? "—"],
                                ["Notes", selected.notes ?? "—"],
                            ] as [string, string][]).map(([label, value]) => (
                                <div key={label}>
                                    <dt className="text-xs font-semibold uppercase tracking-wide text-(--ib-muted)">{label}</dt>
                                    <dd className="mt-0.5 font-medium text-(--ib-ink)">{value}</dd>
                                </div>
                            ))}
                        </dl>
                        <div className="flex justify-end gap-3 border-t border-(--ib-line) pt-4">
                            {selected.status !== "paid" && selected.status !== "waived" && (
                                <button className="ib-btn-primary gap-2" onClick={() => { close(); setTimeout(() => openAction("pay", selected!), 50); }}>
                                    <Banknote size={14} /> Record Payment
                                </button>
                            )}
                            <button className="ib-btn-secondary" onClick={close}>Close</button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Pay Modal */}
            {selected && (
                <Modal isOpen={activeModal === "pay"} onClose={close} title="Record Payment" description={`${memberName(selected)} — Expected: ${fmt(selected.amount, selected.currency)}`}>
                    <div className="grid gap-4 p-5">
                        {payMethod === "cash" && (
                            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                                <Banknote size={16} className="mt-0.5 shrink-0 text-amber-600" />
                                <p className="text-xs text-amber-800">
                                    Cash receipt from <strong>{memberName(selected)}</strong> — <strong>{fmt(parseFloat(payAmount) || 0, selected.currency)}</strong>. Verify before confirming.
                                </p>
                            </div>
                        )}
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-(--ib-muted)">Payment Method</label>
                                <select
                                    className="h-9 w-full rounded-lg border border-(--ib-line) bg-white px-3 text-sm outline-none focus:border-(--ib-accent)"
                                    value={payMethod}
                                    onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                                >
                                    {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-(--ib-muted)">Amount Paid</label>
                                <input
                                    type="number" min={0}
                                    className="h-9 w-full rounded-lg border border-(--ib-line) bg-white px-3 text-sm outline-none focus:border-(--ib-accent)"
                                    value={payAmount}
                                    onChange={(e) => setPayAmount(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-(--ib-muted)">Paid At</label>
                                <input
                                    type="datetime-local"
                                    className="h-9 w-full rounded-lg border border-(--ib-line) bg-white px-3 text-sm outline-none focus:border-(--ib-accent)"
                                    value={payPaidAt}
                                    onChange={(e) => setPayPaidAt(e.target.value)}
                                />
                            </div>
                            {payMethod === "momo" && (
                                <div>
                                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-(--ib-muted)">MoMo Reference <span className="text-red-500">*</span></label>
                                    <input className="h-9 w-full rounded-lg border border-(--ib-line) bg-white px-3 text-sm outline-none focus:border-(--ib-accent)" value={payMomoRef} onChange={(e) => setPayMomoRef(e.target.value)} />
                                </div>
                            )}
                            {payMethod === "momo" && (
                                <div>
                                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-(--ib-muted)">Phone Number</label>
                                    <input className="h-9 w-full rounded-lg border border-(--ib-line) bg-white px-3 text-sm outline-none focus:border-(--ib-accent)" value={payPhone} onChange={(e) => setPayPhone(e.target.value)} />
                                </div>
                            )}
                            {payMethod === "bank" && (
                                <div>
                                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-(--ib-muted)">Bank Reference <span className="text-red-500">*</span></label>
                                    <input className="h-9 w-full rounded-lg border border-(--ib-line) bg-white px-3 text-sm outline-none focus:border-(--ib-accent)" value={payBankRef} onChange={(e) => setPayBankRef(e.target.value)} />
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-(--ib-muted)">Notes</label>
                            <textarea rows={2} className="w-full rounded-lg border border-(--ib-line) p-3 text-sm outline-none focus:border-(--ib-accent) resize-none" value={payNotes} onChange={(e) => setPayNotes(e.target.value)} />
                        </div>
                        <div className="flex justify-end gap-3 border-t border-(--ib-line) pt-4">
                            <button className="ib-btn-secondary" onClick={close}>Cancel</button>
                            <button className="ib-btn-primary gap-2" onClick={handlePay} disabled={isPaying}>
                                {isPaying ? <Spinner size="sm" /> : <CheckCircle2 size={14} />}
                                {isPaying ? "Saving…" : payMethod === "cash" ? "Approve Cash Receipt" : "Confirm Payment"}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Waive Modal */}
            {selected && (
                <Modal isOpen={activeModal === "waive"} onClose={close} title="Waive Contribution" description={`Waive contribution for ${memberName(selected)}`}>
                    <div className="grid gap-4 p-5">
                        <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                            <XCircle size={16} className="mt-0.5 shrink-0 text-gray-500" />
                            <p className="text-xs text-gray-600">Waiving marks this contribution as forgiven. The member will not owe this payment.</p>
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-(--ib-muted)">Reason / Notes</label>
                            <textarea rows={3} className="w-full rounded-lg border border-(--ib-line) p-3 text-sm outline-none focus:border-(--ib-accent) resize-none" value={waiveNotes} onChange={(e) => setWaiveNotes(e.target.value)} />
                        </div>
                        <div className="flex justify-end gap-3 border-t border-(--ib-line) pt-4">
                            <button className="ib-btn-secondary" onClick={close}>Cancel</button>
                            <button className="ib-btn-primary gap-2 bg-gray-700 hover:bg-gray-800" onClick={handleWaive} disabled={isWaiving}>
                                {isWaiving ? <Spinner size="sm" /> : <XCircle size={14} />}
                                {isWaiving ? "Waiving…" : "Confirm Waive"}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </>
    );
}

// ── Row component ─────────────────────────────────────────────────────────────

function ContributionRow({ c, onView, onPay, onWaive }: {
    c: Contribution;
    onView: () => void;
    onPay: () => void;
    onWaive: () => void;
}) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [menuRect, setMenuRect] = useState<DOMRect | null>(null);
    const btnRef = useRef<HTMLButtonElement>(null);
    const canPay = c.status !== "paid" && c.status !== "waived";

    function handleToggle() {
        if (!menuOpen && btnRef.current) setMenuRect(btnRef.current.getBoundingClientRect());
        setMenuOpen((o) => !o);
    }

    return (
        <tr className="hover:bg-gray-50/60">
            <td className="px-5 py-3">
                <p className="font-semibold text-(--ib-ink)">{memberName(c)}</p>
                <p className="text-xs text-(--ib-muted)">{(c.user as any)?.email ?? ""}</p>
            </td>
            <td className="px-5 py-3 text-(--ib-muted)">{c.period ?? "—"}</td>
            <td className="px-5 py-3 text-(--ib-muted)">{(() => {
                if (!c.dueDate) return "—";
                return new Date(c.dueDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
            })()}</td>
            <td className="px-5 py-3 font-semibold text-(--ib-ink)">{fmt(c.amount, c.currency)}</td>
            <td className="px-5 py-3 font-semibold text-green-700">{fmt(c.paidAmount, c.currency)}</td>
            <td className="px-5 py-3">
                <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_BADGE[c.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {c.status}
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
                                top: window.innerHeight - menuRect.bottom > 120 ? menuRect.bottom + 6 : menuRect.top - 130,
                                right: window.innerWidth - menuRect.right,
                            }}
                        >
                            <button onClick={() => { setMenuOpen(false); onView(); }} className="flex w-full items-center gap-2.5 px-4 py-2 text-sm hover:bg-gray-50 text-(--ib-ink)">
                                <Eye size={14} /> View Details
                            </button>
                            {canPay && (
                                <button onClick={() => { setMenuOpen(false); onPay(); }} className="flex w-full items-center gap-2.5 px-4 py-2 text-sm hover:bg-gray-50 text-green-700">
                                    <Banknote size={14} /> Record Payment
                                </button>
                            )}
                            {canPay && (
                                <button onClick={() => { setMenuOpen(false); onWaive(); }} className="flex w-full items-center gap-2.5 px-4 py-2 text-sm hover:bg-gray-50 text-gray-600">
                                    <XCircle size={14} /> Waive
                                </button>
                            )}
                        </div>
                    </>,
                    document.body
                )}
            </td>
        </tr>
    );
}
