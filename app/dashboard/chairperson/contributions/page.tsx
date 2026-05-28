/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/contexts/toast-context";
import {
    useGetContributionsQuery,
    useGetContributionGroupSummaryQuery,
    useRecordContributionMutation,
    useBulkRecordContributionsMutation,
    useGeneratePeriodContributionsMutation,
    useMarkPeriodMissedMutation,
    usePayContributionMutation,
    useWaiveContributionMutation,
} from "@/api/contribution";
import { useLazyGetGroupMembersQuery } from "@/api/group";
import type { Contribution, ContributionStatus, PaymentMethod } from "@/types/res/contribution";
import type { User } from "@/types/res/auth";
import { Dropdown, Input } from "@/components/ui";
import Modal from "@/components/ui/modal";
import Pagination from "@/components/ui/pagination";
import Spinner from "@/components/ui/spinner";
import {
    RefreshCw,
    Download,
    Plus,
    Users,
    CalendarClock,
    AlertCircle,
    ChevronDown,
    Eye,
    Banknote,
    CheckCircle2,
    XCircle,
    TrendingUp,
    Clock,
    BarChart3,
} from "lucide-react";

// ─── types ───────────────────────────────────────────────────────────────────

type ModalMode = "view" | "record" | "bulk" | "generate" | "pay" | "waive" | "mark-missed" | null;

// ─── helpers ─────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
    { label: "All statuses", value: "" },
    { label: "Pending", value: "pending" },
    { label: "Paid", value: "paid" },
    { label: "Partial", value: "partial" },
    { label: "Missed", value: "missed" },
    { label: "Waived", value: "waived" },
];

const PAGE_SIZE_OPTIONS = [
    { label: "10 / page", value: "10" },
    { label: "20 / page", value: "20" },
    { label: "50 / page", value: "50" },
];

const CONTRIBUTION_STATUS_OPTIONS = [
    { label: "Pending", value: "pending" },
    { label: "Paid", value: "paid" },
    { label: "Partial", value: "partial" },
    { label: "Missed", value: "missed" },
];

const statusBadge: Record<string, string> = {
    pending: "bg-yellow-50 text-yellow-700 border border-yellow-200",
    paid: "bg-green-50 text-green-700 border border-green-200",
    partial: "bg-blue-50 text-blue-700 border border-blue-200",
    missed: "bg-red-50 text-red-700 border border-red-200",
    waived: "bg-gray-100 text-gray-600 border border-gray-200",
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

function memberName(c: Contribution) {
    if (!c.user) return c.userId.slice(0, 8);
    return `${c.user.firstName ?? ""} ${c.user.lastName ?? ""}`.trim();
}

function flattenMembers(data: { chairperson: User[]; secretary: User[]; finance: User[]; member: User[] }): User[] {
    return [...(data.chairperson ?? []), ...(data.secretary ?? []), ...(data.finance ?? []), ...(data.member ?? [])];
}

function exportCSV(contributions: Contribution[]) {
    const headers = ["ID", "Member", "Email", "Period", "Due Date", "Expected", "Paid", "Currency", "Status", "Notes", "Created At"];
    const rows = contributions.map((c) => [
        c.id,
        memberName(c),
        c.user?.email ?? "",
        c.period ?? "",
        fmtDate(c.dueDate),
        c.amount,
        c.paidAmount ?? "",
        c.currency,
        c.status,
        c.notes ?? "",
        fmtDate(c.createdAt),
    ]);
    const csv = [headers, ...rows]
        .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
        .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contributions_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function ChairpersonContributionsPage() {
    const { user } = useAuth();
    const toast = useToast();
    const groupId = user?.groupId ?? user?.group?.id ?? "";

    // filters
    const [statusFilter, setStatusFilter] = useState<ContributionStatus | "">("");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);

    // modal
    const [activeModal, setActiveModal] = useState<ModalMode>(null);
    const [selected, setSelected] = useState<Contribution | null>(null);

    // record form
    const [recMemberId, setRecMemberId] = useState("");
    const [recDueDate, setRecDueDate] = useState("");
    const [recAmount, setRecAmount] = useState("");
    const [recPaidAmount, setRecPaidAmount] = useState("");
    const [recStatus, setRecStatus] = useState<ContributionStatus>("pending");
    const [recNotes, setRecNotes] = useState("");

    // bulk form
    const [bulkDueDate, setBulkDueDate] = useState("");
    const [bulkAmount, setBulkAmount] = useState("");
    const [bulkSelected, setBulkSelected] = useState<string[]>([]);

    // generate form
    const [genDueDate, setGenDueDate] = useState("");
    const [genAmount, setGenAmount] = useState("");

    // pay form
    const [payMethod, setPayMethod] = useState<PaymentMethod>("cash");
    const [payAmount, setPayAmount] = useState("");
    const [payPaidAt, setPayPaidAt] = useState("");
    const [payMomoRef, setPayMomoRef] = useState("");
    const [payBankRef, setPayBankRef] = useState("");
    const [payRefFileUrl, setPayRefFileUrl] = useState("");
    const [payPhone, setPayPhone] = useState("");
    const [payNotes, setPayNotes] = useState("");

    // waive form
    const [waiveReason, setWaiveReason] = useState("");

    // mark-missed form
    const [missedPeriod, setMissedPeriod] = useState("");

    // API queries
    const { data, isLoading, isFetching, refetch } = useGetContributionsQuery(
        { groupId, status: statusFilter || undefined, page, limit },
        { skip: !groupId },
    );
    const { data: summaryData } = useGetContributionGroupSummaryQuery(
        { groupId },
        { skip: !groupId },
    );
    const [fetchMembers, { data: membersData }] = useLazyGetGroupMembersQuery();

    // mutations
    const [recordContribution, { isLoading: isRecording }] = useRecordContributionMutation();
    const [bulkRecord, { isLoading: isBulking }] = useBulkRecordContributionsMutation();
    const [generatePeriod, { isLoading: isGenerating }] = useGeneratePeriodContributionsMutation();
    const [markPeriodMissed, { isLoading: isMarking }] = useMarkPeriodMissedMutation();
    const [payContribution, { isLoading: isPaying }] = usePayContributionMutation();
    const [waiveContribution, { isLoading: isWaiving }] = useWaiveContributionMutation();
    const contributions: Contribution[] = data?.data?.items ?? [];
    const meta = data?.data?.meta;
    const summary = summaryData?.data;

    const allMembers = useMemo(() =>
        membersData?.data ? flattenMembers(membersData.data) : [],
        [membersData],
    );

    const memberOptions = useMemo(() =>
        allMembers.map((m) => ({
            label: `${m.firstName} ${m.lastName}`.trim(),
            value: m.id,
        })),
        [allMembers],
    );

    // client-side search over loaded page
    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return contributions;
        return contributions.filter((c) =>
            memberName(c).toLowerCase().includes(q) ||
            (c.period ?? "").toLowerCase().includes(q) ||
            c.id.toLowerCase().includes(q),
        );
    }, [contributions, search]);

    const stats = useMemo(() => ({
        total: meta?.totalItems ?? 0,
        paid: contributions.filter((c) => c.status === "paid").length,
        pending: contributions.filter((c) => c.status === "pending").length,
        missed: contributions.filter((c) => c.status === "missed").length,
    }), [contributions, meta]);

    // ── open helpers ──

    function openRecord() {
        if (groupId) fetchMembers({ groupId });
        setRecMemberId(""); setRecDueDate(""); setRecAmount(""); setRecPaidAmount("");
        setRecStatus("pending"); setRecNotes("");
        setActiveModal("record");
    }

    function openBulk() {
        if (groupId) fetchMembers({ groupId });
        setBulkDueDate(""); setBulkAmount(""); setBulkSelected([]);
        setActiveModal("bulk");
    }

    function openGenerate() {
        setGenDueDate(""); setGenAmount("");
        setActiveModal("generate");
    }

    function openMarkMissed() {
        setMissedPeriod("");
        setActiveModal("mark-missed");
    }

    function openAction(mode: "pay" | "waive" | "view", c: Contribution) {
        setSelected(c);
        if (mode === "pay") {
            setPayMethod(c.paidAmount ? "bank" : "cash");
            setPayAmount(String(c.paidAmount ?? ""));
            setPayPaidAt(new Date().toISOString().slice(0, 16));
            setPayMomoRef("");
            setPayBankRef("");
            setPayRefFileUrl("");
            setPayPhone("");
            setPayNotes("");
        }
        if (mode === "waive") setWaiveReason("");
        setActiveModal(mode);
    }

    function close() { setActiveModal(null); setSelected(null); }

    // ── mutations ──

    const handleRecord = useCallback(async () => {
        if (!recMemberId || !recDueDate) {
            toast.warning("Required", "Member and due date are required.");
            return;
        }
        try {
            await recordContribution({
                userId: recMemberId,
                dueDate: recDueDate,
                amount: recAmount ? parseFloat(recAmount) : undefined,
                paidAmount: recPaidAmount ? parseFloat(recPaidAmount) : undefined,
                status: recStatus,
                notes: recNotes || undefined,
            }).unwrap();
            toast.success("Recorded", "Contribution recorded successfully.");
            close();
        } catch (err: any) {
            toast.error("Failed", err?.data?.message ?? "Could not record contribution.");
        }
    }, [recMemberId, recDueDate, recAmount, recPaidAmount, recStatus, recNotes, recordContribution, toast]);

    const handleBulk = useCallback(async () => {
        if (!bulkDueDate || bulkSelected.length === 0) {
            toast.warning("Required", "Due date and at least one member are required.");
            return;
        }
        try {
            await bulkRecord({
                dueDate: bulkDueDate,
                amount: bulkAmount ? parseFloat(bulkAmount) : undefined,
                paidUserIds: bulkSelected,
            }).unwrap();
            toast.success("Bulk recorded", `${bulkSelected.length} contributions recorded.`);
            close();
        } catch (err: any) {
            toast.error("Failed", err?.data?.message ?? "Could not bulk record contributions.");
        }
    }, [bulkDueDate, bulkAmount, bulkSelected, bulkRecord, toast]);

    const handleGenerate = useCallback(async () => {
        if (!genDueDate) {
            toast.warning("Required", "Due date is required.");
            return;
        }
        try {
            await generatePeriod({
                dueDate: genDueDate,
                amount: genAmount ? parseFloat(genAmount) : undefined,
            }).unwrap();
            toast.success("Generated", "Pending contributions generated for all members.");
            close();
        } catch (err: any) {
            toast.error("Failed", err?.data?.message ?? "Could not generate contributions.");
        }
    }, [genDueDate, genAmount, generatePeriod, toast]);

    const handleMarkMissed = useCallback(async () => {
        if (!missedPeriod.trim()) {
            toast.warning("Required", "Period is required (e.g. 2026-W20).");
            return;
        }
        try {
            await markPeriodMissed({ groupId, period: missedPeriod.trim() }).unwrap();
            toast.success("Marked missed", `All pending contributions for ${missedPeriod} marked as missed.`);
            close();
        } catch (err: any) {
            toast.error("Failed", err?.data?.message ?? "Could not mark period as missed.");
        }
    }, [groupId, missedPeriod, markPeriodMissed, toast]);

    const handlePay = useCallback(async () => {
        if (!selected || !payAmount) {
            toast.warning("Required", "Amount is required.");
            return;
        }
        if (!payPaidAt) {
            toast.warning("Required", "Payment date is required.");
            return;
        }
        if (payMethod === "momo" && !payMomoRef) {
            toast.warning("Required", "MoMo reference is required for mobile money payments.");
            return;
        }
        if (payMethod === "bank" && !payBankRef) {
            toast.warning("Required", "Bank reference is required for bank transfers.");
            return;
        }
        try {
            await payContribution({
                id: selected.id,
                data: {
                    paymentMethod: payMethod,
                    paidAmount: parseFloat(payAmount),
                    paidAt: new Date(payPaidAt).toISOString(),
                    momoRef: payMomoRef || undefined,
                    bankRef: payBankRef || undefined,
                    referenceFileUrl: payRefFileUrl || undefined,
                    notes: payNotes || undefined,
                    phoneNumber: payPhone || undefined,
                },
            }).unwrap();
            toast.success("Paid", `Contribution for ${memberName(selected)} marked as paid.`);
            close();
        } catch (err: any) {
            toast.error("Failed", err?.data?.message ?? "Could not process payment.");
        }
    }, [selected, payMethod, payAmount, payPaidAt, payMomoRef, payBankRef, payRefFileUrl, payPhone, payNotes, payContribution, toast]);

    const handleWaive = useCallback(async () => {
        if (!selected || !waiveReason.trim()) {
            toast.warning("Required", "A waive reason is required.");
            return;
        }
        try {
            await waiveContribution({ id: selected.id, data: { reason: waiveReason } }).unwrap();
            toast.success("Waived", `Contribution for ${memberName(selected)} has been waived.`);
            close();
        } catch (err: any) {
            toast.error("Failed", err?.data?.message ?? "Could not waive contribution.");
        }
    }, [selected, waiveReason, waiveContribution, toast]);

    function handleExport() {
        if (!contributions.length) { toast.info("No data", "No contributions to export."); return; }
        exportCSV(contributions);
        toast.success("Exported", `${contributions.length} contributions exported as CSV.`);
    }

    // ── render ──

    return (
        <>
            <div className="grid gap-6">
                {/* Header */}
                <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="panel-tag">Finance</p>
                        <h2 className="headline mt-2 text-2xl text-(--ib-ink) sm:text-3xl">Contributions</h2>
                        <p className="mt-1 max-w-2xl text-sm text-(--ib-muted)">
                            Track, record, and manage all member contributions for your group.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <button onClick={() => refetch()} disabled={isFetching} className="ib-btn-secondary gap-2">
                            <RefreshCw size={15} className={isFetching ? "animate-spin" : ""} />
                            Refresh
                        </button>
                        <button onClick={handleExport} className="ib-btn-secondary gap-2">
                            <Download size={15} /> Export CSV
                        </button>
                        <button onClick={openMarkMissed} className="ib-btn-secondary gap-2">
                            <XCircle size={15} /> Mark Missed
                        </button>
                        <button onClick={openGenerate} className="ib-btn-secondary gap-2">
                            <CalendarClock size={15} /> Generate Period
                        </button>
                        <button onClick={openBulk} className="ib-btn-secondary gap-2">
                            <Users size={15} /> Bulk Record
                        </button>
                        <button onClick={openRecord} className="ib-btn-primary gap-2">
                            <Plus size={15} /> Record
                        </button>
                    </div>
                </header>

                {/* Stats strip */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                        { label: "Total Contributions", value: stats.total, icon: BarChart3, color: "text-(--ib-accent)" },
                        { label: "Paid", value: stats.paid, icon: CheckCircle2, color: "text-green-600" },
                        { label: "Pending", value: stats.pending, icon: Clock, color: "text-yellow-600" },
                        { label: "Missed", value: stats.missed, icon: AlertCircle, color: "text-red-500" },
                    ].map(({ label, value, icon: Icon, color }) => (
                        <div key={label} className="rounded-xl border border-(--ib-line) bg-white p-4 shadow-sm">
                            <Icon size={20} className={color} />
                            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-(--ib-muted)">{label}</p>
                            <p className="mt-1 text-2xl font-bold text-(--ib-ink)">{value}</p>
                        </div>
                    ))}
                </div>

                {/* Group summary card */}
                {summary && (
                    <div className="rounded-xl border border-(--ib-line) bg-white p-5 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <TrendingUp size={18} className="text-(--ib-accent)" />
                            <h3 className="headline text-base font-semibold text-(--ib-ink)">Group Summary</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                            <SummaryItem label="Expected" value={fmt(summary.totalExpected, summary.currency)} />
                            <SummaryItem label="Collected" value={fmt(summary.totalCollected, summary.currency)} />
                            <SummaryItem label="Pending" value={fmt(summary.totalPending, summary.currency)} />
                            <SummaryItem
                                label="Collection Rate"
                                value={`${summary.collectionRate?.toFixed(1) ?? 0}%`}
                                highlight
                            />
                        </div>
                        {/* Collection progress bar */}
                        <div className="mt-4">
                            <div className="flex justify-between text-xs text-(--ib-muted) mb-1">
                                <span>Collection Progress</span>
                                <span>{summary.collectionRate?.toFixed(1) ?? 0}%</span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-gray-100">
                                <div
                                    className="h-2 rounded-full bg-(--ib-accent) transition-all duration-500"
                                    style={{ width: `${Math.min(summary.collectionRate ?? 0, 100)}%` }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Filters */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Input
                        label=""
                        placeholder="Search member, period, ID..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        className="sm:max-w-xs"
                    />
                    <Dropdown
                        value={statusFilter}
                        onValueChange={(v) => { setStatusFilter(v as ContributionStatus | ""); setPage(1); }}
                        options={STATUS_OPTIONS}
                        containerClassName="w-full sm:w-48"
                    />
                    <Dropdown
                        value={String(limit)}
                        onValueChange={(v) => { setLimit(Number(v)); setPage(1); }}
                        options={PAGE_SIZE_OPTIONS}
                        containerClassName="w-full sm:w-36"
                    />
                </div>

                {/* Table */}
                <div className="overflow-hidden rounded-xl border border-(--ib-line) bg-white shadow-sm">
                    {isLoading ? (
                        <div className="flex items-center justify-center gap-2 p-16 text-sm text-(--ib-muted)">
                            <Spinner size="lg" /> Loading contributions...
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 p-16 text-center">
                            <AlertCircle size={36} className="text-(--ib-line)" />
                            <p className="text-sm font-medium text-(--ib-muted)">No contributions found</p>
                            <p className="text-xs text-(--ib-muted)">
                                {statusFilter ? `No ${statusFilter} contributions this period.` : "Use 'Record' or 'Generate Period' to get started."}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-(--ib-muted)">
                                    <tr>
                                        <th className="px-4 py-3 text-left">Member</th>
                                        <th className="px-4 py-3 text-left">Period</th>
                                        <th className="px-4 py-3 text-left">Due Date</th>
                                        <th className="px-4 py-3 text-left">Expected</th>
                                        <th className="px-4 py-3 text-left">Paid</th>
                                        <th className="px-4 py-3 text-left">Status</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-(--ib-line)">
                                    {filtered.map((c) => (
                                        <ContributionRow
                                            key={c.id}
                                            contribution={c}
                                            onView={() => openAction("view", c)}
                                            onPay={() => openAction("pay", c)}
                                            onWaive={() => openAction("waive", c)}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {!isLoading && meta && meta.totalPages > 1 && (
                        <Pagination
                            currentPage={page}
                            totalPages={meta.totalPages}
                            totalItems={meta.totalItems}
                            itemCount={meta.itemCount}
                            onPageChange={setPage}
                            isLoading={isFetching}
                        />
                    )}
                </div>
            </div>

            {/* Record Modal */}
            <Modal isOpen={activeModal === "record"} onClose={close} title="Record Contribution" description="Record a single contribution for a group member.">
                <div className="grid gap-4 p-5">
                    <Dropdown
                        label="Member *"
                        value={recMemberId}
                        onValueChange={setRecMemberId}
                        options={memberOptions.length ? memberOptions : [{ label: "Loading members...", value: "" }]}
                    />
                    <Input label="Due Date *" type="date" value={recDueDate} onChange={(e) => setRecDueDate(e.target.value)} />
                    <div className="grid grid-cols-2 gap-3">
                        <Input label="Expected Amount" type="number" min={0} value={recAmount} onChange={(e) => setRecAmount(e.target.value)} placeholder="Group default" />
                        <Input label="Paid Amount" type="number" min={0} value={recPaidAmount} onChange={(e) => setRecPaidAmount(e.target.value)} placeholder="0" />
                    </div>
                    <Dropdown label="Status" value={recStatus} onValueChange={(v) => setRecStatus(v as ContributionStatus)} options={CONTRIBUTION_STATUS_OPTIONS} />
                    <Input label="Notes (optional)" value={recNotes} onChange={(e) => setRecNotes(e.target.value)} placeholder="Any notes..." />
                    <div className="flex justify-end gap-3 border-t border-(--ib-line) pt-4">
                        <button className="ib-btn-secondary" onClick={close}>Cancel</button>
                        <button className="ib-btn-primary gap-2" onClick={handleRecord} disabled={isRecording}>
                            {isRecording ? <Spinner size="sm" /> : <Plus size={15} />}
                            {isRecording ? "Recording..." : "Record"}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Bulk Record Modal */}
            <Modal isOpen={activeModal === "bulk"} onClose={close} title="Bulk Record" description="Record contributions for multiple members who paid in the same period.">
                <div className="grid gap-4 p-5">
                    <div className="grid grid-cols-2 gap-3">
                        <Input label="Due Date *" type="date" value={bulkDueDate} onChange={(e) => setBulkDueDate(e.target.value)} />
                        <Input label="Amount Override" type="number" min={0} value={bulkAmount} onChange={(e) => setBulkAmount(e.target.value)} placeholder="Group default" />
                    </div>
                    <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-(--ib-muted)">Select members who paid *</p>
                        <div className="max-h-52 overflow-y-auto rounded-lg border border-(--ib-line) divide-y divide-(--ib-line)">
                            {allMembers.length === 0 ? (
                                <p className="p-3 text-sm text-(--ib-muted)">Loading members...</p>
                            ) : allMembers.map((m) => (
                                <label key={m.id} className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-gray-50">
                                    <input
                                        type="checkbox"
                                        checked={bulkSelected.includes(m.id)}
                                        onChange={(e) => setBulkSelected((prev) =>
                                            e.target.checked ? [...prev, m.id] : prev.filter((id) => id !== m.id),
                                        )}
                                        className="h-4 w-4 accent-(--ib-accent)"
                                    />
                                    <div>
                                        <p className="text-sm font-medium text-(--ib-ink)">{`${m.firstName} ${m.lastName}`.trim()}</p>
                                        <p className="text-xs text-(--ib-muted)">{m.user_code ?? m.email}</p>
                                    </div>
                                </label>
                            ))}
                        </div>
                        {bulkSelected.length > 0 && (
                            <p className="mt-1 text-xs text-(--ib-accent)">{bulkSelected.length} member(s) selected</p>
                        )}
                    </div>
                    <div className="flex justify-end gap-3 border-t border-(--ib-line) pt-4">
                        <button className="ib-btn-secondary" onClick={close}>Cancel</button>
                        <button className="ib-btn-primary gap-2" onClick={handleBulk} disabled={isBulking}>
                            {isBulking ? <Spinner size="sm" /> : <Users size={15} />}
                            {isBulking ? "Recording..." : `Record ${bulkSelected.length || ""} Contributions`}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Generate Period Modal */}
            <Modal isOpen={activeModal === "generate"} onClose={close} title="Generate Period" description="Generate PENDING contribution records for all group members for a cycle.">
                <div className="grid gap-4 p-5">
                    <Input label="Due Date *" type="date" value={genDueDate} onChange={(e) => setGenDueDate(e.target.value)} />
                    <Input label="Amount Override (optional)" type="number" min={0} value={genAmount} onChange={(e) => setGenAmount(e.target.value)} placeholder="Defaults to group settings" />
                    <p className="rounded-lg bg-blue-50 p-3 text-xs text-blue-700">
                        This will create PENDING contribution records for every active member in your group. The period will be auto-derived from the due date and group frequency.
                    </p>
                    <div className="flex justify-end gap-3 border-t border-(--ib-line) pt-4">
                        <button className="ib-btn-secondary" onClick={close}>Cancel</button>
                        <button className="ib-btn-primary gap-2" onClick={handleGenerate} disabled={isGenerating}>
                            {isGenerating ? <Spinner size="sm" /> : <CalendarClock size={15} />}
                            {isGenerating ? "Generating..." : "Generate"}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Mark Period Missed Modal */}
            <Modal isOpen={activeModal === "mark-missed"} onClose={close} title="Mark Period Missed" description="Mark all PENDING contributions in a period as MISSED.">
                <div className="grid gap-4 p-5">
                    <Input
                        label="Period *"
                        value={missedPeriod}
                        onChange={(e) => setMissedPeriod(e.target.value)}
                        placeholder="e.g. 2026-W20 or 2026-05"
                    />
                    <p className="rounded-lg bg-red-50 p-3 text-xs text-red-700">
                        All PENDING contributions for this period will be changed to MISSED. This action cannot be undone.
                    </p>
                    <div className="flex justify-end gap-3 border-t border-(--ib-line) pt-4">
                        <button className="ib-btn-secondary" onClick={close}>Cancel</button>
                        <button className="ib-btn-primary gap-2 bg-red-600 hover:bg-red-700" onClick={handleMarkMissed} disabled={isMarking}>
                            {isMarking ? <Spinner size="sm" /> : <XCircle size={15} />}
                            {isMarking ? "Marking..." : "Mark as Missed"}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Pay Modal */}
            <Modal
                isOpen={activeModal === "pay"}
                onClose={close}
                title="Record Payment"
                description={selected ? `Pay contribution for ${memberName(selected)} — ${fmtDate(selected.dueDate)}` : ""}
            >
                <div className="grid gap-4 p-5">
                    {/* Payment method */}
                    <Dropdown
                        label="Payment Method *"
                        value={payMethod}
                        onValueChange={(v) => setPayMethod(v as PaymentMethod)}
                        options={[
                            { label: "Cash", value: "cash" },
                            { label: "Mobile Money (MoMo)", value: "momo" },
                            { label: "Bank Transfer", value: "bank" },
                            { label: "Cheque", value: "cheque" },
                            { label: "Other", value: "other" },
                        ]}
                    />

                    {/* Amount + Date */}
                    <div className="grid grid-cols-2 gap-3">
                        <Input
                            label={`Amount (${selected?.currency ?? "RWF"}) *`}
                            type="number"
                            min={0}
                            value={payAmount}
                            onChange={(e) => setPayAmount(e.target.value)}
                        />
                        <Input
                            label="Payment Date *"
                            type="datetime-local"
                            value={payPaidAt}
                            onChange={(e) => setPayPaidAt(e.target.value)}
                        />
                    </div>

                    {/* MoMo-specific fields */}
                    {payMethod === "momo" && (
                        <div className="grid gap-3 rounded-lg border border-blue-100 bg-blue-50 p-3">
                            <Input
                                label="MoMo Reference *"
                                value={payMomoRef}
                                onChange={(e) => setPayMomoRef(e.target.value)}
                                placeholder="e.g. MM-12345"
                            />
                            <Input
                                label="Phone Number"
                                value={payPhone}
                                onChange={(e) => setPayPhone(e.target.value)}
                                placeholder="e.g. 0781234567"
                            />
                        </div>
                    )}

                    {/* Bank-specific fields */}
                    {payMethod === "bank" && (
                        <div className="grid gap-3 rounded-lg border border-indigo-100 bg-indigo-50 p-3">
                            <Input
                                label="Bank Reference *"
                                value={payBankRef}
                                onChange={(e) => setPayBankRef(e.target.value)}
                                placeholder="e.g. BNK-98765"
                            />
                            <Input
                                label="Reference File URL (optional)"
                                value={payRefFileUrl}
                                onChange={(e) => setPayRefFileUrl(e.target.value)}
                                placeholder="/uploads/references/abc123.jpg"
                            />
                        </div>
                    )}

                    {/* Cheque / Other — reference file */}
                    {(payMethod === "cheque" || payMethod === "other") && (
                        <Input
                            label="Reference File URL (optional)"
                            value={payRefFileUrl}
                            onChange={(e) => setPayRefFileUrl(e.target.value)}
                            placeholder="/uploads/references/abc123.jpg"
                        />
                    )}

                    <Input
                        label="Notes (optional)"
                        value={payNotes}
                        onChange={(e) => setPayNotes(e.target.value)}
                        placeholder="Any additional notes..."
                    />

                    {/* Cash approval notice */}
                    {payMethod === "cash" && (
                        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                            <Banknote size={18} className="mt-0.5 shrink-0 text-amber-600" />
                            <div>
                                <p className="text-xs font-semibold text-amber-800">Cash Receipt Confirmation</p>
                                <p className="mt-0.5 text-xs text-amber-700">
                                    By confirming, you acknowledge that you have <span className="font-semibold">physically received</span>{" "}
                                    {payAmount ? `${selected?.currency ?? "RWF"} ${Number(payAmount).toLocaleString()}` : "the stated amount"}{" "}
                                    in cash from <span className="font-semibold">{selected ? memberName(selected) : "this member"}</span>.
                                    This will permanently mark the contribution as <span className="font-semibold">paid</span>.
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 border-t border-(--ib-line) pt-4">
                        <button className="ib-btn-secondary" onClick={close}>Cancel</button>
                        <button className="ib-btn-primary gap-2 bg-green-700 hover:bg-green-800" onClick={handlePay} disabled={isPaying}>
                            {isPaying ? <Spinner size="sm" /> : <Banknote size={15} />}
                            {isPaying ? "Processing..." : payMethod === "cash" ? "Approve Cash Receipt" : "Confirm Payment"}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Waive Modal */}
            <Modal
                isOpen={activeModal === "waive"}
                onClose={close}
                title="Waive Contribution"
                description={selected ? `Waive contribution for ${memberName(selected)}. A reason is required.` : ""}
            >
                <div className="grid gap-4 p-5">
                    <Input label="Reason *" value={waiveReason} onChange={(e) => setWaiveReason(e.target.value)} placeholder="Explain why this contribution is being waived..." />
                    <div className="flex justify-end gap-3 border-t border-(--ib-line) pt-4">
                        <button className="ib-btn-secondary" onClick={close}>Cancel</button>
                        <button className="ib-btn-primary gap-2" onClick={handleWaive} disabled={isWaiving || !waiveReason.trim()}>
                            {isWaiving ? <Spinner size="sm" /> : <CheckCircle2 size={15} />}
                            {isWaiving ? "Waiving..." : "Waive"}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* View Modal */}
            {selected && (
                <Modal isOpen={activeModal === "view"} onClose={close} title="Contribution Details" description={`Details for contribution ${selected.id.slice(0, 8)}...`}>
                    <div className="grid gap-3 p-5 text-sm">
                        <DetailGrid contribution={selected} />
                        <div className="flex justify-end border-t border-(--ib-line) pt-4">
                            <button className="ib-btn-secondary" onClick={close}>Close</button>
                        </div>
                    </div>
                </Modal>
            )}
        </>
    );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryItem({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
    return (
        <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-(--ib-muted)">{label}</p>
            <p className={`mt-1 text-xl font-bold ${highlight ? "text-(--ib-accent)" : "text-(--ib-ink)"}`}>{value}</p>
        </div>
    );
}

function ContributionRow({ contribution: c, onView, onPay, onWaive }: {
    contribution: Contribution;
    onView: () => void;
    onPay: () => void;
    onWaive: () => void;
}) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [menuRect, setMenuRect] = useState<DOMRect | null>(null);
    const btnRef = useRef<HTMLButtonElement>(null);
    const badgeClass = statusBadge[c.status] ?? "bg-gray-100 text-gray-600 border border-gray-200";

    function handleToggle() {
        if (!menuOpen && btnRef.current) setMenuRect(btnRef.current.getBoundingClientRect());
        setMenuOpen((o) => !o);
    }

    return (
        <tr className="transition-colors hover:bg-gray-50/60">
            <td className="px-4 py-3">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--ib-accent) text-xs font-bold text-white">
                        {(memberName(c)[0] ?? "?").toUpperCase()}
                    </div>
                    <div>
                        <p className="font-semibold text-(--ib-ink)">{memberName(c)}</p>
                        <p className="text-xs text-(--ib-muted)">{c.user?.user_code ?? c.userId.slice(0, 8)}</p>
                    </div>
                </div>
            </td>
            <td className="px-4 py-3 text-(--ib-muted)">{c.period ?? "—"}</td>
            <td className="px-4 py-3 text-(--ib-muted)">{fmtDate(c.dueDate)}</td>
            <td className="px-4 py-3 font-semibold text-(--ib-ink)">{fmt(c.amount, c.currency)}</td>
            <td className="px-4 py-3 text-(--ib-muted)">{c.paidAmount != null ? fmt(c.paidAmount, c.currency) : "—"}</td>
            <td className="px-4 py-3">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${badgeClass}`}>
                    {c.status}
                </span>
            </td>
            <td className="px-4 py-3 text-right">
                <button
                    ref={btnRef}
                    onClick={handleToggle}
                    className="inline-flex items-center gap-1 rounded-md border border-(--ib-line) bg-white px-2.5 py-1.5 text-xs font-medium text-(--ib-ink) shadow-sm hover:bg-gray-50"
                >
                    Actions <ChevronDown size={12} />
                </button>
                {menuOpen && menuRect && (
                    <ContributionActionMenu
                        anchorRect={menuRect}
                        status={c.status}
                        onView={() => { setMenuOpen(false); onView(); }}
                        onPay={() => { setMenuOpen(false); onPay(); }}
                        onWaive={() => { setMenuOpen(false); onWaive(); }}
                        onClose={() => setMenuOpen(false)}
                    />
                )}
            </td>
        </tr>
    );
}

function ContributionActionMenu({ anchorRect, status, onView, onPay, onWaive, onClose }: {
    anchorRect: DOMRect;
    status: string;
    onView: () => void;
    onPay: () => void;
    onWaive: () => void;
    onClose: () => void;
}) {
    const spaceBelow = window.innerHeight - anchorRect.bottom;
    const menuHeight = 120;
    const top = spaceBelow > menuHeight ? anchorRect.bottom + 6 : anchorRect.top - menuHeight - 6;
    const right = window.innerWidth - anchorRect.right;

    return createPortal(
        <>
            <div className="fixed inset-0 z-[9990]" onClick={onClose} />
            <div className="fixed z-[9991] min-w-40 overflow-hidden rounded-xl border border-(--ib-line) bg-white py-1 shadow-lg" style={{ top, right }}>
                <ActionItem icon={Eye} label="View Details" onClick={onView} />
                {(status === "pending" || status === "partial" || status === "missed") && (
                    <ActionItem icon={Banknote} label="Pay" onClick={onPay} className="text-green-700" />
                )}
                {(status === "pending" || status === "partial") && (
                    <ActionItem icon={CheckCircle2} label="Waive" onClick={onWaive} className="text-(--ib-accent)" />
                )}
            </div>
        </>,
        document.body,
    );
}

function ActionItem({ icon: Icon, label, onClick, className = "" }: {
    icon: React.ElementType;
    label: string;
    onClick: () => void;
    className?: string;
}) {
    return (
        <button onClick={onClick} className={`flex w-full items-center gap-2.5 px-4 py-2 text-sm hover:bg-gray-50 ${className || "text-(--ib-ink)"}`}>
            <Icon size={14} /> {label}
        </button>
    );
}

function DetailGrid({ contribution: c }: { contribution: Contribution }) {
    const rows: [string, string][] = [
        ["Member", memberName(c)],
        ["Email", c.user?.email ?? "—"],
        ["Phone", c.user?.phone ?? "—"],
        ["Period", c.period ?? "—"],
        ["Due Date", fmtDate(c.dueDate)],
        ["Expected Amount", fmt(c.amount, c.currency)],
        ["Paid Amount", c.paidAmount != null ? fmt(c.paidAmount, c.currency) : "—"],
        ["Cycle #", String(c.cycleNumber ?? "—")],
        ["Status", c.status],
        ["Notes", c.notes ?? "—"],
        ["Waive Reason", c.waiveReason ?? "—"],
        ["Waived At", fmtDate(c.waivedAt)],
        ["Recorded At", fmtDate(c.createdAt)],
        ["Last Updated", fmtDate(c.updatedAt)],
    ];

    return (
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            {rows.map(([label, value]) => (
                <div key={label} className="overflow-hidden">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-(--ib-muted)">{label}</dt>
                    <dd className="mt-0.5 truncate font-medium text-(--ib-ink)" title={value}>{value || "—"}</dd>
                </div>
            ))}
        </dl>
    );
}
