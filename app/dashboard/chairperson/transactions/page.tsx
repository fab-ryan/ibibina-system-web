/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/contexts/toast-context";
import {
    useGetTransactionsQuery,
    useApproveTransactionMutation,
    useRejectTransactionMutation,
} from "@/api/transaction";
import { Transaction, TransactionType } from "@/types/res/transaction";
import { Pagination } from "@/components/ui";
import Modal from "@/components/ui/modal";
import Spinner from "@/components/ui/spinner";
import {
    ArrowDownLeft,
    ArrowUpRight,
    Download,
    RefreshCw,
    Search,
    Eye,
    CheckCircle2,
    XCircle,
    Banknote,
    ChevronDown,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(amount: string | number, currency = "RWF") {
    const n = typeof amount === "string" ? parseFloat(amount) : amount;
    if (isNaN(n)) return "—";
    return `${currency} ${n.toLocaleString("en-RW", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtDate(iso: string | null | undefined) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-RW", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

function fmtDateTime(iso: string | null | undefined) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("en-RW", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function fmtTime(iso: string) {
    if (!iso) return "";
    return new Date(iso).toLocaleTimeString("en-RW", {
        hour: "2-digit",
        minute: "2-digit",
    });
}

function memberName(tx: Transaction) {
    if (!tx.user) return "—";
    const { firstName, lastName, username } = tx.user as any;
    if (firstName || lastName) return `${firstName ?? ""} ${lastName ?? ""}`.trim();
    return username ?? "—";
}

const TYPE_LABELS: Record<TransactionType, string> = {
    contribution: "Contribution",
    loan_disbursement: "Loan Disbursement",
    loan_repayment: "Loan Repayment",
    penalty: "Penalty Charged",
    penalty_payment: "Penalty Payment",
    withdrawal: "Withdrawal",
    deposit: "Deposit",
};

const TYPE_COLORS: Record<TransactionType, string> = {
    contribution: "bg-green-50 text-green-700 border-green-200",
    loan_disbursement: "bg-blue-50 text-blue-700 border-blue-200",
    loan_repayment: "bg-cyan-50 text-cyan-700 border-cyan-200",
    penalty: "bg-red-50 text-red-700 border-red-200",
    penalty_payment: "bg-orange-50 text-orange-700 border-orange-200",
    withdrawal: "bg-purple-50 text-purple-700 border-purple-200",
    deposit: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const APPROVAL_BADGE: Record<string, string> = {
    pending_approval: "bg-amber-50 text-amber-700 border border-amber-200",
    approved: "bg-green-50 text-green-700 border border-green-200",
    rejected: "bg-red-50 text-red-700 border border-red-200",
};

function isCash(tx: Transaction) {
    return tx.paymentMethod?.toLowerCase() === "cash";
}

function needsApproval(tx: Transaction) {
    return isCash(tx) && (!tx.approvalStatus || tx.approvalStatus === "pending_approval");
}

function exportCSV(rows: Transaction[]) {
    const header = ["Date", "Member", "Type", "Direction", "Amount", "Currency", "Payment Method", "Reference", "Approval", "Description"];
    const lines = rows.map((t) => [
        fmtDate(t.transactionDate),
        memberName(t),
        TYPE_LABELS[t.type] ?? t.type,
        t.direction,
        String(t.amount),
        t.currency,
        t.paymentMethod ?? "",
        t.momoRef ?? t.bankRef ?? "",
        t.approvalStatus ?? "",
        t.description ?? "",
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// ── Page component ────────────────────────────────────────────────────────────

const ALL_TYPES: Array<{ value: string; label: string }> = [
    { value: "", label: "All types" },
    { value: "contribution", label: "Contribution" },
    { value: "loan_disbursement", label: "Loan Disbursement" },
    { value: "loan_repayment", label: "Loan Repayment" },
    { value: "penalty", label: "Penalty Charged" },
    { value: "penalty_payment", label: "Penalty Payment" },
    { value: "withdrawal", label: "Withdrawal" },
    { value: "deposit", label: "Deposit" },
];

type ModalMode = "view" | "reject" | null;

export default function ChairpersonTransactionsPage() {
    const { user } = useAuth();
    const toast = useToast();
    const groupId = user?.group?.id ?? user?.groupId ?? "";

    const [page, setPage] = useState(1);
    const [typeFilter, setTypeFilter] = useState("");
    const [search, setSearch] = useState("");
    const limit = 20;

    const [activeModal, setActiveModal] = useState<ModalMode>(null);
    const [selected, setSelected] = useState<Transaction | null>(null);
    const [rejectReason, setRejectReason] = useState("");

    const { data, isLoading, isFetching, refetch } = useGetTransactionsQuery(
        { groupId, type: typeFilter || undefined, page, limit },
        { skip: !groupId }
    );
    const [approveTransaction, { isLoading: isApproving }] = useApproveTransactionMutation();
    const [rejectTransaction, { isLoading: isRejecting }] = useRejectTransactionMutation();

    const transactions: Transaction[] = data?.data?.items ?? [];
    const meta = data?.data?.meta;

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return transactions;
        return transactions.filter(
            (t) =>
                memberName(t).toLowerCase().includes(q) ||
                (TYPE_LABELS[t.type] ?? t.type).toLowerCase().includes(q) ||
                (t.description ?? "").toLowerCase().includes(q) ||
                (t.momoRef ?? "").toLowerCase().includes(q) ||
                (t.bankRef ?? "").toLowerCase().includes(q)
        );
    }, [transactions, search]);

    const totalCredit = useMemo(
        () => filtered.filter((t) => t.direction === "credit").reduce((s, t) => s + parseFloat(String(t.amount)), 0),
        [filtered]
    );
    const totalDebit = useMemo(
        () => filtered.filter((t) => t.direction === "debit").reduce((s, t) => s + parseFloat(String(t.amount)), 0),
        [filtered]
    );
    const pendingCash = useMemo(
        () => filtered.filter(needsApproval).length,
        [filtered]
    );

    function openView(tx: Transaction) { setSelected(tx); setActiveModal("view"); }
    function openReject(tx: Transaction) { setSelected(tx); setRejectReason(""); setActiveModal("reject"); }
    function close() { setActiveModal(null); setSelected(null); }

    async function handleApprove(tx: Transaction) {
        try {
            await approveTransaction({ id: tx.id }).unwrap();
            toast.success("Approved", `Cash payment from ${memberName(tx)} has been approved.`);
        } catch (err: any) {
            toast.error("Failed", err?.data?.message ?? "Could not approve transaction.");
        }
    }

    async function handleReject() {
        if (!selected) return;
        try {
            await rejectTransaction({ id: selected.id, reason: rejectReason || undefined }).unwrap();
            toast.success("Rejected", `Transaction has been rejected.`);
            close();
        } catch (err: any) {
            toast.error("Failed", err?.data?.message ?? "Could not reject transaction.");
        }
    }

    function handleExport() {
        if (!filtered.length) { toast.warning("Nothing to export", "No transactions match the current filters."); return; }
        exportCSV(filtered);
        toast.success("Exported", `${filtered.length} transactions exported as CSV.`);
    }

    return (
        <>
            <div className="grid gap-6">
                {/* Header */}
                <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="panel-tag">Finance</p>
                        <h2 className="headline mt-2 text-2xl text-(--ib-ink) sm:text-3xl">Transactions</h2>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-(--ib-muted)">
                            Full audit trail of all financial activity — contributions, loans, repayments, penalties, and more.
                        </p>
                    </div>
                    <div className="flex shrink-0 gap-3">
                        <button onClick={() => refetch()} className="ib-btn-secondary gap-2" title="Refresh">
                            <RefreshCw size={15} className={isFetching ? "animate-spin" : ""} />
                            Refresh
                        </button>
                        <button onClick={handleExport} className="ib-btn-primary gap-2">
                            <Download size={15} />
                            Export CSV
                        </button>
                    </div>
                </header>

                {/* Summary cards */}
                <section className="grid gap-4 sm:grid-cols-4">
                    <article className="rounded-xl border border-(--ib-line) bg-white p-5 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wide text-(--ib-muted)">Total transactions</p>
                        <p className="mt-2 text-2xl font-bold text-(--ib-ink)">{meta?.totalItems ?? filtered.length}</p>
                    </article>
                    <article className="rounded-xl border border-(--ib-line) bg-white p-5 shadow-sm">
                        <div className="flex items-center gap-2">
                            <ArrowDownLeft size={16} className="text-green-600" />
                            <p className="text-xs font-semibold uppercase tracking-wide text-(--ib-muted)">Credit (this page)</p>
                        </div>
                        <p className="mt-2 text-2xl font-bold text-green-700">{fmt(totalCredit)}</p>
                    </article>
                    <article className="rounded-xl border border-(--ib-line) bg-white p-5 shadow-sm">
                        <div className="flex items-center gap-2">
                            <ArrowUpRight size={16} className="text-red-600" />
                            <p className="text-xs font-semibold uppercase tracking-wide text-(--ib-muted)">Debit (this page)</p>
                        </div>
                        <p className="mt-2 text-2xl font-bold text-red-700">{fmt(totalDebit)}</p>
                    </article>
                    <article className={`rounded-xl border p-5 shadow-sm ${pendingCash > 0 ? "border-amber-200 bg-amber-50" : "border-(--ib-line) bg-white"}`}>
                        <div className="flex items-center gap-2">
                            <Banknote size={16} className={pendingCash > 0 ? "text-amber-600" : "text-(--ib-muted)"} />
                            <p className="text-xs font-semibold uppercase tracking-wide text-(--ib-muted)">Cash Pending Approval</p>
                        </div>
                        <p className={`mt-2 text-2xl font-bold ${pendingCash > 0 ? "text-amber-700" : "text-(--ib-ink)"}`}>{pendingCash}</p>
                    </article>
                </section>

                {/* Filters */}
                <section className="flex flex-wrap gap-3">
                    <div className="relative flex-1 min-w-[220px]">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-(--ib-muted)" />
                        <input
                            className="h-9 w-full rounded-lg border border-(--ib-line) bg-white pl-8 pr-3 text-sm outline-none focus:border-(--ib-accent) focus:ring-2 focus:ring-(--ib-accent)/20"
                            placeholder="Search member, reference, description…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <select
                        className="h-9 rounded-lg border border-(--ib-line) bg-white px-3 text-sm text-(--ib-ink) outline-none focus:border-(--ib-accent)"
                        value={typeFilter}
                        onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
                    >
                        {ALL_TYPES.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                </section>

                {/* Table */}
                <section className="rounded-xl border border-(--ib-line) bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[860px] text-left text-sm">
                            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-(--ib-muted)">
                                <tr>
                                    <th className="px-5 py-3">Date / Time</th>
                                    <th className="px-5 py-3">Member</th>
                                    <th className="px-5 py-3">Type</th>
                                    <th className="px-5 py-3">Amount</th>
                                    <th className="px-5 py-3">Direction</th>
                                    <th className="px-5 py-3">Method</th>
                                    <th className="px-5 py-3">Approval</th>
                                    <th className="px-5 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-(--ib-line)">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={8} className="px-5 py-10 text-center text-sm text-(--ib-muted)">
                                            Loading transactions…
                                        </td>
                                    </tr>
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-5 py-10 text-center text-sm text-(--ib-muted)">
                                            No transactions found.
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((tx) => (
                                        <TransactionRow
                                            key={tx.id}
                                            tx={tx}
                                            isApproving={isApproving}
                                            onView={() => openView(tx)}
                                            onApprove={() => handleApprove(tx)}
                                            onReject={() => openReject(tx)}
                                        />
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {meta && meta.totalPages > 1 && (
                        <div className="border-t border-(--ib-line) px-5 py-4">
                            <Pagination
                                currentPage={page}
                                totalPages={meta.totalPages}
                                onPageChange={setPage}
                            />
                        </div>
                    )}
                </section>
            </div>

            {/* View Details Modal */}
            {selected && (
                <Modal
                    isOpen={activeModal === "view"}
                    onClose={close}
                    title="Transaction Details"
                    description={`${TYPE_LABELS[selected.type] ?? selected.type} — ${fmtDate(selected.transactionDate)}`}
                >
                    <div className="grid gap-4 p-5">
                        {/* Cash approval banner */}
                        {isCash(selected) && (
                            <div className={`flex items-start gap-3 rounded-lg border p-3 ${selected.approvalStatus === "approved"
                                    ? "border-green-200 bg-green-50"
                                    : selected.approvalStatus === "rejected"
                                        ? "border-red-200 bg-red-50"
                                        : "border-amber-200 bg-amber-50"
                                }`}>
                                <Banknote size={18} className={`mt-0.5 shrink-0 ${selected.approvalStatus === "approved" ? "text-green-600"
                                        : selected.approvalStatus === "rejected" ? "text-red-600"
                                            : "text-amber-600"
                                    }`} />
                                <div className="flex-1">
                                    <p className="text-xs font-semibold text-gray-800">Cash Payment</p>
                                    <p className="mt-0.5 text-xs text-gray-600">
                                        {selected.approvalStatus === "approved"
                                            ? `Approved${selected.approvedAt ? ` on ${fmtDateTime(selected.approvedAt)}` : ""}.`
                                            : selected.approvalStatus === "rejected"
                                                ? "This cash transaction was rejected."
                                                : "This cash transaction is awaiting approval. Verify the physical receipt before approving."}
                                    </p>
                                </div>
                                {needsApproval(selected) && (
                                    <div className="flex shrink-0 gap-2">
                                        <button
                                            onClick={() => { handleApprove(selected); close(); }}
                                            disabled={isApproving}
                                            className="inline-flex items-center gap-1 rounded-lg bg-green-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-800 disabled:opacity-60"
                                        >
                                            {isApproving ? <Spinner size="sm" /> : <CheckCircle2 size={13} />}
                                            Approve
                                        </button>
                                        <button
                                            onClick={() => { close(); openReject(selected); }}
                                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                                        >
                                            <XCircle size={13} /> Reject
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Detail grid */}
                        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 text-sm">
                            {([
                                ["Transaction ID", selected.id],
                                ["Member", memberName(selected)],
                                ["Email", (selected.user as any)?.email ?? "—"],
                                ["Type", TYPE_LABELS[selected.type] ?? selected.type],
                                ["Direction", selected.direction],
                                ["Amount", fmt(selected.amount, selected.currency)],
                                ["Payment Method", selected.paymentMethod ?? "—"],
                                ["MoMo Ref", selected.momoRef ?? "—"],
                                ["Bank Ref", selected.bankRef ?? "—"],
                                ["Phone Number", selected.phoneNumber ?? "—"],
                                ["Paid At", fmtDateTime(selected.paidAt)],
                                ["Transaction Date", fmtDateTime(selected.transactionDate)],
                                ["Reference ID", selected.referenceId ?? "—"],
                                ["Reference Type", selected.referenceType ?? "—"],
                                ["Approval Status", selected.approvalStatus ?? (isCash(selected) ? "pending_approval" : "—")],
                                ["Approved At", fmtDateTime(selected.approvedAt)],
                                ["Description", selected.description ?? "—"],
                                ["Notes", selected.notes ?? "—"],
                                ["Recorded At", fmtDateTime(selected.createdAt)],
                            ] as [string, string][]).map(([label, value]) => (
                                <div key={label} className="overflow-hidden">
                                    <dt className="text-xs font-semibold uppercase tracking-wide text-(--ib-muted)">{label}</dt>
                                    <dd className="mt-0.5 break-all font-medium text-(--ib-ink)" title={value}>{value || "—"}</dd>
                                </div>
                            ))}
                        </dl>

                        {selected.referenceFileUrl && (
                            <div className="rounded-lg border border-(--ib-line) p-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-(--ib-muted) mb-1">Reference File</p>
                                <a
                                    href={selected.referenceFileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-(--ib-accent) underline break-all"
                                >
                                    {selected.referenceFileUrl}
                                </a>
                            </div>
                        )}

                        <div className="flex justify-end border-t border-(--ib-line) pt-4">
                            <button className="ib-btn-secondary" onClick={close}>Close</button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Reject Modal */}
            {selected && (
                <Modal
                    isOpen={activeModal === "reject"}
                    onClose={close}
                    title="Reject Transaction"
                    description={`Reject cash payment from ${memberName(selected)} — ${fmt(selected.amount, selected.currency)}`}
                >
                    <div className="grid gap-4 p-5">
                        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3">
                            <XCircle size={18} className="mt-0.5 shrink-0 text-red-600" />
                            <p className="text-xs text-red-700">
                                Rejecting this transaction will flag it as invalid. Provide a reason so the member can be informed.
                            </p>
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-(--ib-muted)">
                                Reason (optional)
                            </label>
                            <textarea
                                className="w-full rounded-lg border border-(--ib-line) p-3 text-sm outline-none focus:border-(--ib-accent) focus:ring-2 focus:ring-(--ib-accent)/20 resize-none"
                                rows={3}
                                placeholder="e.g. Amount does not match, receipt not provided…"
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                            />
                        </div>
                        <div className="flex justify-end gap-3 border-t border-(--ib-line) pt-4">
                            <button className="ib-btn-secondary" onClick={close}>Cancel</button>
                            <button
                                className="ib-btn-primary gap-2 bg-red-600 hover:bg-red-700"
                                onClick={handleReject}
                                disabled={isRejecting}
                            >
                                {isRejecting ? <Spinner size="sm" /> : <XCircle size={15} />}
                                {isRejecting ? "Rejecting…" : "Confirm Reject"}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </>
    );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function TransactionRow({ tx, isApproving, onView, onApprove, onReject }: {
    tx: Transaction;
    isApproving: boolean;
    onView: () => void;
    onApprove: () => void;
    onReject: () => void;
}) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [menuRect, setMenuRect] = useState<DOMRect | null>(null);
    const btnRef = useRef<HTMLButtonElement>(null);
    const typeClass = TYPE_COLORS[tx.type] ?? "bg-gray-50 text-gray-700 border-gray-200";
    const cash = isCash(tx);
    const pending = needsApproval(tx);

    function handleToggle() {
        if (!menuOpen && btnRef.current) setMenuRect(btnRef.current.getBoundingClientRect());
        setMenuOpen((o) => !o);
    }

    return (
        <tr className={`hover:bg-gray-50/60 ${pending ? "bg-amber-50/40" : ""}`}>
            <td className="px-5 py-3">
                <p className="font-medium text-(--ib-ink)">{fmtDate(tx.transactionDate)}</p>
                <p className="text-xs text-(--ib-muted)">{fmtTime(tx.transactionDate)}</p>
            </td>
            <td className="px-5 py-3">
                <p className="font-medium text-(--ib-ink)">{memberName(tx)}</p>
                <p className="text-xs text-(--ib-muted)">{(tx.user as any)?.user_code ?? ""}</p>
            </td>
            <td className="px-5 py-3">
                <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${typeClass}`}>
                    {TYPE_LABELS[tx.type] ?? tx.type}
                </span>
            </td>
            <td className="px-5 py-3 font-semibold text-(--ib-ink)">
                {fmt(tx.amount, tx.currency)}
            </td>
            <td className="px-5 py-3">
                {tx.direction === "credit" ? (
                    <span className="inline-flex items-center gap-1 text-green-700">
                        <ArrowDownLeft size={14} /> Credit
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1 text-red-600">
                        <ArrowUpRight size={14} /> Debit
                    </span>
                )}
            </td>
            <td className="px-5 py-3 capitalize text-(--ib-muted)">
                {cash ? (
                    <span className="inline-flex items-center gap-1 font-medium text-amber-700">
                        <Banknote size={13} /> Cash
                    </span>
                ) : (tx.paymentMethod ?? "—")}
            </td>
            <td className="px-5 py-3">
                {cash ? (
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${APPROVAL_BADGE[tx.approvalStatus ?? "pending_approval"]}`}>
                        {tx.approvalStatus === "approved" ? "Approved"
                            : tx.approvalStatus === "rejected" ? "Rejected"
                                : "Pending"}
                    </span>
                ) : (
                    <span className="text-xs text-(--ib-muted)">—</span>
                )}
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
                        <div className="fixed inset-0 z-[9990]" onClick={() => setMenuOpen(false)} />
                        <div
                            className="fixed z-[9991] min-w-44 overflow-hidden rounded-xl border border-(--ib-line) bg-white py-1 shadow-lg"
                            style={{
                                top: window.innerHeight - menuRect.bottom > 120 ? menuRect.bottom + 6 : menuRect.top - 130,
                                right: window.innerWidth - menuRect.right,
                            }}
                        >
                            <button
                                onClick={() => { setMenuOpen(false); onView(); }}
                                className="flex w-full items-center gap-2.5 px-4 py-2 text-sm hover:bg-gray-50 text-(--ib-ink)"
                            >
                                <Eye size={14} /> View Details
                            </button>
                            {pending && (
                                <>
                                    <button
                                        onClick={() => { setMenuOpen(false); onApprove(); }}
                                        disabled={isApproving}
                                        className="flex w-full items-center gap-2.5 px-4 py-2 text-sm hover:bg-gray-50 text-green-700 disabled:opacity-60"
                                    >
                                        <CheckCircle2 size={14} /> Approve Cash
                                    </button>
                                    <button
                                        onClick={() => { setMenuOpen(false); onReject(); }}
                                        className="flex w-full items-center gap-2.5 px-4 py-2 text-sm hover:bg-gray-50 text-red-600"
                                    >
                                        <XCircle size={14} /> Reject
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


