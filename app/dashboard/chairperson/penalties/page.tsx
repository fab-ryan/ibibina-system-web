/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/contexts/toast-context";
import {
    useGetPenaltiesQuery,
    useGetGroupPenaltySummaryQuery,
    useIssuePenaltyMutation,
    useSettlePenaltyMutation,
    useWaivePenaltyMutation,
} from "@/api/transaction";
import { useLazyGetGroupMembersQuery } from "@/api/group";
import {
    Penalty,
    PenaltyReason,
    PenaltyStatus,
    PaymentMethod,
} from "@/types/res/transaction";
import { Modal, Pagination } from "@/components/ui";
import {
    AlertCircle,
    CheckCircle2,
    Download,
    Plus,
    RefreshCw,
    Search,
    XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(amount: string | number | null | undefined, currency = "RWF") {
    if (amount === null || amount === undefined) return "—";
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

function memberName(p: Penalty) {
    if (!p.user) return p.userId.slice(0, 8) + "…";
    const { firstName, lastName, username } = p.user as any;
    if (firstName || lastName) return `${firstName ?? ""} ${lastName ?? ""}`.trim();
    return username ?? "—";
}

const STATUS_BADGE: Record<PenaltyStatus, string> = {
    pending: "bg-yellow-50 text-yellow-700 border border-yellow-200",
    paid: "bg-green-50 text-green-700 border border-green-200",
    waived: "bg-gray-100 text-gray-500 border border-gray-200",
};

const REASON_LABELS: Record<PenaltyReason, string> = {
    late_payment: "Late Payment",
    missed_payment: "Missed Payment",
    missed_meeting: "Missed Meeting",
    rule_violation: "Rule Violation",
    other: "Other",
};

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
    momo: "Mobile Money",
    bank: "Bank Transfer",
    cash: "Cash",
    cheque: "Cheque",
};

function exportCSV(rows: Penalty[]) {
    const header = ["Member", "Reason", "Description", "Amount", "Currency", "Status", "Payment Method", "Paid At", "Issued By", "Date Issued"];
    const lines = rows.map((p) => [
        memberName(p),
        REASON_LABELS[p.reason] ?? p.reason,
        p.description ?? "",
        String(p.amount),
        p.currency,
        p.status,
        p.paymentMethod ? (PAYMENT_METHOD_LABELS[p.paymentMethod as PaymentMethod] ?? p.paymentMethod) : "",
        fmtDate(p.paidAt),
        p.issuedBy ? memberName({ ...p, user: p.issuedBy } as any) : "",
        fmtDate(p.createdAt),
    ].map((v) => `"${v.replace(/"/g, '""')}"`).join(","));
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `penalties-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// ── Modal modes ───────────────────────────────────────────────────────────────
type ModalMode = "issue" | "settle" | "waive" | null;

// ── Page component ────────────────────────────────────────────────────────────

export default function ChairpersonPenaltiesPage() {
    const { user } = useAuth();
    const toast = useToast();
    const groupId = user?.group?.id ?? user?.groupId ?? "";

    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState<PenaltyStatus | "">("");
    const [reasonFilter, setReasonFilter] = useState<PenaltyReason | "">("");
    const [search, setSearch] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const limit = 20;

    const { data, isLoading, isFetching, refetch } = useGetPenaltiesQuery(
        {
            groupId,
            status: statusFilter || undefined,
            reason: reasonFilter || undefined,
            from: fromDate || undefined,
            to: toDate || undefined,
            page,
            limit,
        },
        { skip: !groupId }
    );

    const { data: summaryData } = useGetGroupPenaltySummaryQuery(
        { groupId },
        { skip: !groupId }
    );

    const [fetchMembers, { data: membersData }] = useLazyGetGroupMembersQuery();
    const [issuePenalty, { isLoading: isIssuing }] = useIssuePenaltyMutation();
    const [settlePenalty, { isLoading: isSettling }] = useSettlePenaltyMutation();
    const [waivePenalty, { isLoading: isWaiving }] = useWaivePenaltyMutation();

    // ── Modal state ──────────────────────────────────────────────────────────
    const [activeModal, setActiveModal] = useState<ModalMode>(null);
    const [selectedPenalty, setSelectedPenalty] = useState<Penalty | null>(null);

    // Issue form
    const [issueUserId, setIssueUserId] = useState("");
    const [issueReason, setIssueReason] = useState<PenaltyReason>("late_payment");
    const [issueDescription, setIssueDescription] = useState("");
    const [issueAmount, setIssueAmount] = useState("");
    const [issueCurrency, setIssueCurrency] = useState("RWF");

    // Settle form
    const [settleMethod, setSettleMethod] = useState<PaymentMethod | "">("");
    const [settlePaidAt, setSettlePaidAt] = useState("");
    const [settleRef, setSettleRef] = useState("");
    const [settleNotes, setSettleNotes] = useState("");

    // Waive form
    const [waiveReason, setWaiveReason] = useState("");

    const penalties = useMemo<Penalty[]>(() => data?.data?.items ?? [], [data]);
    const meta = data?.data?.meta;
    const summary = summaryData?.data;

    // Members flat list for selector
    const allMembers = useMemo(() => {
        const d = membersData?.data;
        if (!d) return [];
        return [
            ...(d.chairperson ?? []),
            ...(d.secretary ?? []),
            ...(d.finance ?? []),
            ...(d.member ?? []),
        ];
    }, [membersData]);

    useEffect(() => {
        if (groupId) fetchMembers({ groupId });
    }, [groupId, fetchMembers]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return penalties;
        return penalties.filter(
            (p) =>
                memberName(p).toLowerCase().includes(q) ||
                (p.description ?? "").toLowerCase().includes(q) ||
                (REASON_LABELS[p.reason] ?? p.reason).toLowerCase().includes(q)
        );
    }, [penalties, search]);

    function openIssueModal() {
        setIssueUserId("");
        setIssueReason("late_payment");
        setIssueDescription("");
        setIssueAmount("");
        setIssueCurrency("RWF");
        setActiveModal("issue");
    }

    function openSettleModal(penalty: Penalty) {
        setSelectedPenalty(penalty);
        setSettleMethod("");
        setSettlePaidAt("");
        setSettleRef("");
        setSettleNotes("");
        setActiveModal("settle");
    }

    function openWaiveModal(penalty: Penalty) {
        setSelectedPenalty(penalty);
        setWaiveReason("");
        setActiveModal("waive");
    }

    function closeModal() {
        setActiveModal(null);
        setSelectedPenalty(null);
    }

    const handleIssue = useCallback(async () => {
        if (!issueUserId || !issueAmount) {
            toast.warning("Missing fields", "Please select a member and enter the penalty amount.");
            return;
        }
        const amount = parseFloat(issueAmount);
        if (isNaN(amount) || amount <= 0) {
            toast.warning("Invalid amount", "Enter a positive penalty amount.");
            return;
        }
        try {
            await issuePenalty({
                groupId,
                userId: issueUserId,
                reason: issueReason,
                description: issueDescription.trim() || undefined,
                amount,
                currency: issueCurrency || undefined,
            }).unwrap();
            toast.success("Penalty issued", "Penalty has been recorded successfully.");
            closeModal();
        } catch (err: any) {
            toast.error("Failed", err?.data?.message ?? "Could not issue penalty.");
        }
    }, [groupId, issueUserId, issueReason, issueDescription, issueAmount, issueCurrency, issuePenalty, toast]);

    const handleSettle = useCallback(async () => {
        if (!selectedPenalty || !settleMethod) {
            toast.warning("Missing fields", "Select a payment method to settle the penalty.");
            return;
        }
        try {
            await settlePenalty({
                id: selectedPenalty.id,
                data: {
                    paymentMethod: settleMethod as PaymentMethod,
                    paidAt: settlePaidAt || undefined,
                    momoRef: settleMethod === "momo" ? settleRef || undefined : undefined,
                    bankRef: settleMethod === "bank" ? settleRef || undefined : undefined,
                    notes: settleNotes.trim() || undefined,
                },
            }).unwrap();
            toast.success("Penalty settled", "Penalty has been marked as paid.");
            closeModal();
        } catch (err: any) {
            toast.error("Failed", err?.data?.message ?? "Could not settle penalty.");
        }
    }, [selectedPenalty, settleMethod, settlePaidAt, settleRef, settleNotes, settlePenalty, toast]);

    const handleWaive = useCallback(async () => {
        if (!selectedPenalty || !waiveReason.trim()) {
            toast.warning("Reason required", "Please provide a reason for waiving.");
            return;
        }
        try {
            await waivePenalty({ id: selectedPenalty.id, data: { reason: waiveReason } }).unwrap();
            toast.success("Penalty waived", "The penalty has been waived.");
            closeModal();
        } catch (err: any) {
            toast.error("Failed", err?.data?.message ?? "Could not waive penalty.");
        }
    }, [selectedPenalty, waiveReason, waivePenalty, toast]);

    function handleExport() {
        if (!filtered.length) {
            toast.warning("Nothing to export", "No penalties match the current filters.");
            return;
        }
        exportCSV(filtered);
        toast.success("Exported", `${filtered.length} penalties exported as CSV.`);
    }

    return (
        <>
            <div className="grid gap-6">
                {/* Header */}
                <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="panel-tag">Finance</p>
                        <h2 className="headline mt-2 text-2xl text-(--ib-ink) sm:text-3xl">Penalties</h2>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-(--ib-muted)">
                            Issue and manage penalties for late payments, missed meetings, and rule violations.
                        </p>
                    </div>
                    <div className="flex shrink-0 gap-3">
                        <button onClick={() => refetch()} className="ib-btn-secondary gap-2" title="Refresh">
                            <RefreshCw size={15} className={isFetching ? "animate-spin" : ""} />
                            Refresh
                        </button>
                        <button onClick={handleExport} className="ib-btn-secondary gap-2">
                            <Download size={15} /> Export CSV
                        </button>
                        <button onClick={openIssueModal} className="ib-btn-primary gap-2">
                            <Plus size={15} /> Issue Penalty
                        </button>
                    </div>
                </header>

                {/* Summary cards */}
                <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <article className="rounded-xl border border-(--ib-line) bg-white p-5 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wide text-(--ib-muted)">Total Penalties</p>
                        <p className="mt-2 text-2xl font-bold text-(--ib-ink)">{summary?.totalCount ?? meta?.totalItems ?? "—"}</p>
                        <p className="mt-1 text-xs text-(--ib-muted)">{summary?.pendingCount ?? "—"} pending</p>
                    </article>
                    <article className="rounded-xl border border-(--ib-line) bg-white p-5 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wide text-(--ib-muted)">Total Issued</p>
                        <p className="mt-2 text-2xl font-bold text-(--ib-ink)">
                            {summary ? fmt(summary.totalAmount, summary.currency) : "—"}
                        </p>
                    </article>
                    <article className="rounded-xl border border-(--ib-line) bg-white p-5 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wide text-(--ib-muted)">Pending Amount</p>
                        <p className="mt-2 text-2xl font-bold text-yellow-700">
                            {summary ? fmt(summary.pendingAmount, summary.currency) : "—"}
                        </p>
                    </article>
                    <article className="rounded-xl border border-(--ib-line) bg-white p-5 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wide text-(--ib-muted)">Collected</p>
                        <p className="mt-2 text-2xl font-bold text-green-700">
                            {summary ? fmt(summary.collectedAmount, summary.currency) : "—"}
                        </p>
                    </article>
                </section>

                {/* Filters */}
                <section className="flex flex-wrap gap-3">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-(--ib-muted)" />
                        <input
                            className="h-9 w-full rounded-lg border border-(--ib-line) bg-white pl-8 pr-3 text-sm outline-none focus:border-(--ib-accent) focus:ring-2 focus:ring-(--ib-accent)/20"
                            placeholder="Search member, reason…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <select
                        className="h-9 rounded-lg border border-(--ib-line) bg-white px-3 text-sm text-(--ib-ink) outline-none focus:border-(--ib-accent)"
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value as PenaltyStatus | ""); setPage(1); }}
                    >
                        <option value="">All statuses</option>
                        <option value="pending">Pending</option>
                        <option value="paid">Paid</option>
                        <option value="waived">Waived</option>
                    </select>
                    <select
                        className="h-9 rounded-lg border border-(--ib-line) bg-white px-3 text-sm text-(--ib-ink) outline-none focus:border-(--ib-accent)"
                        value={reasonFilter}
                        onChange={(e) => { setReasonFilter(e.target.value as PenaltyReason | ""); setPage(1); }}
                    >
                        <option value="">All reasons</option>
                        {(Object.keys(REASON_LABELS) as PenaltyReason[]).map((r) => (
                            <option key={r} value={r}>{REASON_LABELS[r]}</option>
                        ))}
                    </select>
                    <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
                        className="h-9 rounded-lg border border-(--ib-line) bg-white px-3 text-sm text-(--ib-ink) outline-none focus:border-(--ib-accent)"
                        title="From date"
                    />
                    <input
                        type="date"
                        value={toDate}
                        onChange={(e) => { setToDate(e.target.value); setPage(1); }}
                        className="h-9 rounded-lg border border-(--ib-line) bg-white px-3 text-sm text-(--ib-ink) outline-none focus:border-(--ib-accent)"
                        title="To date"
                    />
                </section>

                {/* Table */}
                <section className="rounded-xl border border-(--ib-line) bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[860px] text-left text-sm">
                            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-(--ib-muted)">
                                <tr>
                                    <th className="px-5 py-3">Member</th>
                                    <th className="px-5 py-3">Reason</th>
                                    <th className="px-5 py-3">Description</th>
                                    <th className="px-5 py-3">Amount</th>
                                    <th className="px-5 py-3">Status</th>
                                    <th className="px-5 py-3">Payment Method</th>
                                    <th className="px-5 py-3">Paid At</th>
                                    <th className="px-5 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-(--ib-line)">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={8} className="px-5 py-10 text-center text-sm text-(--ib-muted)">Loading penalties…</td>
                                    </tr>
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-5 py-10 text-center text-sm text-(--ib-muted)">No penalties found.</td>
                                    </tr>
                                ) : (
                                    filtered.map((p) => (
                                        <PenaltyRow
                                            key={p.id}
                                            penalty={p}
                                            onSettle={() => openSettleModal(p)}
                                            onWaive={() => openWaiveModal(p)}
                                        />
                                    ))
                                )}
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

            {/* ── Issue Penalty Modal ── */}
            <Modal
                isOpen={activeModal === "issue"}
                onClose={closeModal}
                title="Issue Penalty"
                description="Record a new penalty against a group member."
            >
                <div className="grid gap-4 p-5">
                    {/* Member */}
                    <div className="grid gap-1">
                        <label className="text-xs font-semibold uppercase tracking-wide text-(--ib-muted)">Member *</label>
                        <select
                            className="h-9 w-full rounded-lg border border-(--ib-line) bg-white px-3 text-sm text-(--ib-ink) outline-none focus:border-(--ib-accent)"
                            value={issueUserId}
                            onChange={(e) => setIssueUserId(e.target.value)}
                        >
                            <option value="">— Select member —</option>
                            {allMembers.map((m: any) => (
                                <option key={m.id} value={m.id}>
                                    {m.firstName || m.lastName ? `${m.firstName ?? ""} ${m.lastName ?? ""}`.trim() : m.username}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Reason (enum) */}
                    <div className="grid gap-1">
                        <label className="text-xs font-semibold uppercase tracking-wide text-(--ib-muted)">Reason *</label>
                        <select
                            className="h-9 w-full rounded-lg border border-(--ib-line) bg-white px-3 text-sm text-(--ib-ink) outline-none focus:border-(--ib-accent)"
                            value={issueReason}
                            onChange={(e) => setIssueReason(e.target.value as PenaltyReason)}
                        >
                            {(Object.keys(REASON_LABELS) as PenaltyReason[]).map((r) => (
                                <option key={r} value={r}>{REASON_LABELS[r]}</option>
                            ))}
                        </select>
                    </div>

                    {/* Description (optional free text) */}
                    <div className="grid gap-1">
                        <label className="text-xs font-semibold uppercase tracking-wide text-(--ib-muted)">Description (optional)</label>
                        <textarea
                            rows={2}
                            value={issueDescription}
                            onChange={(e) => setIssueDescription(e.target.value)}
                            placeholder="Additional details about this penalty…"
                            className="w-full rounded-lg border border-(--ib-line) bg-white px-3 py-2 text-sm text-(--ib-ink) outline-none focus:border-(--ib-accent) focus:ring-2 focus:ring-(--ib-accent)/20 resize-none"
                        />
                    </div>

                    {/* Amount + Currency */}
                    <div className="grid grid-cols-[1fr_auto] gap-3">
                        <div className="grid gap-1">
                            <label className="text-xs font-semibold uppercase tracking-wide text-(--ib-muted)">Amount *</label>
                            <input
                                type="number"
                                min={0}
                                value={issueAmount}
                                onChange={(e) => setIssueAmount(e.target.value)}
                                placeholder="e.g. 2000"
                                className="h-9 w-full rounded-lg border border-(--ib-line) bg-white px-3 text-sm text-(--ib-ink) outline-none focus:border-(--ib-accent) focus:ring-2 focus:ring-(--ib-accent)/20"
                            />
                        </div>
                        <div className="grid gap-1">
                            <label className="text-xs font-semibold uppercase tracking-wide text-(--ib-muted)">Currency</label>
                            <select
                                className="h-9 rounded-lg border border-(--ib-line) bg-white px-3 text-sm text-(--ib-ink) outline-none focus:border-(--ib-accent)"
                                value={issueCurrency}
                                onChange={(e) => setIssueCurrency(e.target.value)}
                            >
                                <option value="RWF">RWF</option>
                                <option value="USD">USD</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 border-t border-(--ib-line) pt-4">
                        <button className="ib-btn-secondary" onClick={closeModal}>Cancel</button> 
                        <button
                            className="ib-btn-primary gap-2 bg-red-700 hover:bg-red-800"
                            onClick={handleIssue}
                            disabled={isIssuing}
                        >
                            <AlertCircle size={14} />
                            {isIssuing ? "Issuing…" : "Issue Penalty"}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* ── Settle Penalty Modal ── */}
            <Modal
                isOpen={activeModal === "settle"}
                onClose={closeModal}
                title="Settle Penalty"
                description={selectedPenalty ? `Mark ${memberName(selectedPenalty)}'s penalty of ${fmt(selectedPenalty.amount, selectedPenalty.currency)} as fully paid.` : ""}
            >
                <div className="grid gap-4 p-5">
                    {/* Payment method (required) */}
                    <div className="grid gap-1">
                        <label className="text-xs font-semibold uppercase tracking-wide text-(--ib-muted)">Payment method *</label>
                        <select
                            className="h-9 w-full rounded-lg border border-(--ib-line) bg-white px-3 text-sm text-(--ib-ink) outline-none focus:border-(--ib-accent)"
                            value={settleMethod}
                            onChange={(e) => { setSettleMethod(e.target.value as PaymentMethod); setSettleRef(""); }}
                        >
                            <option value="">— Select method —</option>
                            <option value="momo">Mobile Money (MoMo)</option>
                            <option value="bank">Bank Transfer</option>
                            <option value="cash">Cash</option>
                            <option value="cheque">Cheque</option>
                        </select>
                    </div>

                    {/* Conditional reference */}
                    {(settleMethod === "momo" || settleMethod === "bank") && (
                        <div className="grid gap-1">
                            <label className="text-xs font-semibold uppercase tracking-wide text-(--ib-muted)">
                                {settleMethod === "momo" ? "MoMo reference" : "Bank reference"}
                            </label>
                            <input
                                value={settleRef}
                                onChange={(e) => setSettleRef(e.target.value)}
                                placeholder="e.g. TXN20260517001"
                                className="h-9 w-full rounded-lg border border-(--ib-line) bg-white px-3 text-sm text-(--ib-ink) outline-none focus:border-(--ib-accent)"
                            />
                        </div>
                    )}

                    {/* Paid at */}
                    <div className="grid gap-1">
                        <label className="text-xs font-semibold uppercase tracking-wide text-(--ib-muted)">Payment date (optional)</label>
                        <input
                            type="date"
                            value={settlePaidAt}
                            onChange={(e) => setSettlePaidAt(e.target.value)}
                            className="h-9 w-full rounded-lg border border-(--ib-line) bg-white px-3 text-sm text-(--ib-ink) outline-none focus:border-(--ib-accent)"
                        />
                    </div>

                    {/* Notes */}
                    <div className="grid gap-1">
                        <label className="text-xs font-semibold uppercase tracking-wide text-(--ib-muted)">Notes (optional)</label>
                        <textarea
                            rows={2}
                            value={settleNotes}
                            onChange={(e) => setSettleNotes(e.target.value)}
                            placeholder="Any additional notes…"
                            className="w-full rounded-lg border border-(--ib-line) bg-white px-3 py-2 text-sm text-(--ib-ink) outline-none focus:border-(--ib-accent) resize-none"
                        />
                    </div>

                    <div className="flex justify-end gap-3 border-t border-(--ib-line) pt-4">
                        <button className="ib-btn-secondary" onClick={closeModal}>Cancel</button>
                        <button
                            className="ib-btn-primary gap-2"
                            onClick={handleSettle}
                            disabled={isSettling}
                        >
                            <CheckCircle2 size={14} />
                            {isSettling ? "Settling…" : "Mark as Settled"}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* ── Waive Penalty Modal ── */}
            <Modal
                isOpen={activeModal === "waive"}
                onClose={closeModal}
                title="Waive Penalty"
                description={selectedPenalty ? `Waive the penalty on ${memberName(selectedPenalty)}.` : ""}
            >
                <div className="grid gap-4 p-5">
                    <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
                        This will permanently waive the penalty of{" "}
                        <strong>{fmt(selectedPenalty?.amount, selectedPenalty?.currency)}</strong>. This cannot be undone.
                    </div>
                    <div className="grid gap-1">
                        <label className="text-xs font-semibold uppercase tracking-wide text-(--ib-muted)">Reason for waiver *</label>
                        <textarea
                            rows={3}
                            value={waiveReason}
                            onChange={(e) => setWaiveReason(e.target.value)}
                            placeholder="Explain why this penalty is being waived…"
                            className="w-full rounded-lg border border-(--ib-line) bg-white px-3 py-2 text-sm text-(--ib-ink) outline-none focus:border-(--ib-accent) focus:ring-2 focus:ring-(--ib-accent)/20 resize-none"
                        />
                    </div>
                    <div className="flex justify-end gap-3 border-t border-(--ib-line) pt-4">
                        <button className="ib-btn-secondary" onClick={closeModal}>Cancel</button>
                        <button
                            className="ib-btn-primary gap-2 bg-gray-700 hover:bg-gray-800"
                            onClick={handleWaive}
                            disabled={isWaiving}
                        >
                            <XCircle size={14} />
                            {isWaiving ? "Waiving…" : "Waive Penalty"}
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PenaltyRow({
    penalty,
    onSettle,
    onWaive,
}: {
    penalty: Penalty;
    onSettle: () => void;
    onWaive: () => void;
}) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [menuRect, setMenuRect] = useState<DOMRect | null>(null);
    const btnRef = useRef<HTMLButtonElement>(null);
    const badgeClass = STATUS_BADGE[penalty.status] ?? "bg-gray-100 text-gray-600";

    function handleToggle() {
        if (!menuOpen && btnRef.current) setMenuRect(btnRef.current.getBoundingClientRect());
        setMenuOpen((o) => !o);
    }

    const actionable = penalty.status === "pending";

    return (
        <tr className="hover:bg-gray-50/60">
            <td className="px-5 py-3">
                <p className="font-medium text-(--ib-ink)">{memberName(penalty)}</p>
            </td>
            <td className="px-5 py-3 text-(--ib-muted)">
                {REASON_LABELS[penalty.reason] ?? penalty.reason}
            </td>
            <td className="px-5 py-3 max-w-40 truncate text-(--ib-muted)" title={penalty.description ?? ""}>
                {penalty.description || "—"}
            </td>
            <td className="px-5 py-3 font-semibold text-(--ib-ink)">
                {fmt(penalty.amount, penalty.currency)}
            </td>
            <td className="px-5 py-3">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${badgeClass}`}>
                    {penalty.status}
                </span>
            </td>
            <td className="px-5 py-3 text-(--ib-muted)">
                {penalty.paymentMethod
                    ? (PAYMENT_METHOD_LABELS[penalty.paymentMethod as PaymentMethod] ?? penalty.paymentMethod)
                    : "—"}
            </td>
            <td className="px-5 py-3 text-(--ib-muted)">{fmtDate(penalty.paidAt)}</td>
            <td className="px-5 py-3 text-right">
                {actionable ? (
                    <div className="relative inline-block">
                        <button
                            ref={btnRef}
                            onClick={handleToggle}
                            className="inline-flex items-center gap-1 rounded-md border border-(--ib-line) bg-white px-2.5 py-1.5 text-xs font-medium text-(--ib-ink) shadow-sm hover:bg-gray-50"
                        >
                            Actions
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                                <path d="M5 7L1 3h8z" />
                            </svg>
                        </button>
                        {menuOpen && menuRect && createPortal(
                            <>
                                <div className="fixed inset-0 z-[9990]" onClick={() => setMenuOpen(false)} />
                                <div
                                    className="fixed z-[9991] min-w-40 overflow-hidden rounded-xl border border-(--ib-line) bg-white py-1 shadow-lg"
                                    style={{
                                        top: (() => {
                                            const spaceBelow = window.innerHeight - menuRect.bottom;
                                            return spaceBelow > 96 ? menuRect.bottom + 6 : menuRect.top - 96 - 6;
                                        })(),
                                        right: window.innerWidth - menuRect.right,
                                    }}
                                >
                                    <button
                                        className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-green-700 hover:bg-gray-50"
                                        onClick={() => { setMenuOpen(false); onSettle(); }}
                                    >
                                        <CheckCircle2 size={14} /> Settle Penalty
                                    </button>
                                    <button
                                        className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                                        onClick={() => { setMenuOpen(false); onWaive(); }}
                                    >
                                        <XCircle size={14} /> Waive Penalty
                                    </button>
                                </div>
                            </>,
                            document.body
                        )}
                    </div>
                ) : (
                    <span className="text-xs text-(--ib-muted) capitalize">{penalty.status}</span>
                )}
            </td>
        </tr>
    );
}
