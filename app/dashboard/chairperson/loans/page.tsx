/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/contexts/toast-context";
import {
    useGetLoansQuery,
    useApproveLoanMutation,
    useRejectLoanMutation,
    useDisburseLoanMutation,
    useGetSummaryQuery,
    useRecordRepaymentMutation,
    useMarkRepaymentMissedMutation,
    useLazyGetRepaymentScheduleQuery,
} from "@/api/loan";
import { ItemsItem, LoanRepayment } from "@/types/res/loan";
import { Dropdown, Input } from "@/components/ui";
import Modal from "@/components/ui/modal";
import Pagination from "@/components/ui/pagination";
import Spinner from "@/components/ui/spinner";
import {
    CheckCircle2,
    XCircle,
    Banknote,
    RefreshCw,
    Download,
    Eye,
    ChevronDown,
    TrendingUp,
    Clock,
    AlertCircle,
    CalendarClock,
    CreditCard,
} from "lucide-react";

import { Resolver, useForm } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
// ─── types ────────────────────────────────────────────────────────────────────

type ModalMode = "approve" | "reject" | "disburse" | "view" | "repay" | "schedule" | null;

// ─── helpers ──────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
    { label: "All loans", value: "" },
    { label: "Pending", value: "pending" },
    { label: "Approved", value: "approved" },
    { label: "Rejected", value: "rejected" },
    { label: "Disbursed", value: "disbursed" },
    { label: "Closed", value: "closed" },
];

const PAGE_SIZE_OPTIONS = [
    { label: "10 / page", value: "10" },
    { label: "20 / page", value: "20" },
    { label: "50 / page", value: "50" },
];

const statusBadge: Record<string, string> = {
    pending: "bg-yellow-50 text-yellow-700 border border-yellow-200",
    approved: "bg-blue-50 text-blue-700 border border-blue-200",
    rejected: "bg-red-50 text-red-700 border border-red-200",
    disbursed: "bg-green-50 text-green-700 border border-green-200",
    closed: "bg-gray-100 text-gray-600 border border-gray-200",
};

function fmt(val: string | null | undefined, currency = "RWF") {
    if (!val) return "—";
    const n = parseFloat(val);
    if (isNaN(n)) return val;
    return `${currency} ${n.toLocaleString()}`;
}

function fmtDate(val: string | null | undefined) {
    if (!val) return "—";
    return new Date(val).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function memberName(loan: ItemsItem) {
    if (!loan.user) return "Unknown";
    return `${loan.user.firstName ?? ""} ${loan.user.lastName ?? ""}`.trim();
}

// ─── CSV export ───────────────────────────────────────────────────────────────

function exportCSV(loans: ItemsItem[]) {
    const headers = [
        "ID", "Member", "Email", "Phone", "Requested Amount", "Disbursed Amount",
        "Currency", "Interest Rate", "Term (Months)", "Total Due", "Status",
        "Purpose", "Applied On", "Approved At", "Disbursed At",
    ];
    const rows = loans.map((l) => [
        l.id,
        memberName(l),
        l.user?.email ?? "",
        l.user?.phone ?? "",
        l.requestedAmount,
        l.disbursedAmount ?? "",
        l.currency,
        l.interestRate ?? "",
        l.termMonths,
        l.totalDue ?? "",
        l.status,
        l.purpose,
        fmtDate(l.createdAt),
        fmtDate(l.approvedAt as string | null),
        fmtDate(l.disbursedAt as string | null),
    ]);

    const csv = [headers, ...rows]
        .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
        .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `loans_report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// Validation schema for loan approval form
const ApproveLoanSchema = yup?.object({
    approvedAmount: yup.number().typeError("Approved amount must be a number").positive("Approved amount must be positive").required("Approved amount is required"),
    approvalNotes: yup.string().optional(),
})

type ApproveLoanFormValues = yup.InferType<typeof ApproveLoanSchema>;

const DisapproveLoanSchema = yup.object({
    disbursedAmount: yup.number().typeError("Disbursed amount must be a number").positive("Disbursed amount must be positive").optional(),
    notes: yup.string().optional(),

})

type DisapproveLoanFormValues = yup.InferType<typeof DisapproveLoanSchema>;
// ─── component ────────────────────────────────────────────────────────────────

export default function ChairpersonLoansPage() {
    const { user } = useAuth();
    const toast = useToast();
    const groupId = user?.groupId ?? user?.group?.id;

    // Filters & pagination
    const [statusFilter, setStatusFilter] = useState("");
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [search, setSearch] = useState("");

    // Modal state
    const [activeModal, setActiveModal] = useState<ModalMode>(null);
    const [selectedLoan, setSelectedLoan] = useState<ItemsItem | null>(null);
    const [rejectReason, setRejectReason] = useState("");
    const [disburseAmount, setDisburseAmount] = useState("");

    // API hooks
    const { data, isLoading, isFetching, refetch } = useGetLoansQuery(
        { groupId, status: statusFilter || undefined, page, limit },
        { skip: !groupId },
    );
    const [approveLoan, { isLoading: isApproving }] = useApproveLoanMutation();
    const [rejectLoan, { isLoading: isRejecting }] = useRejectLoanMutation();
    const [disburseLoan, { isLoading: isDisbursing }] = useDisburseLoanMutation();
    const { data: summaryData } = useGetSummaryQuery({ groupId }, { skip: !groupId });
    const [recordRepayment, { isLoading: isRepaying }] = useRecordRepaymentMutation();
    const [markRepaymentMissed, { isLoading: isMarkingMissed }] = useMarkRepaymentMissedMutation();
    const [fetchSchedule, { data: scheduleData, isFetching: isScheduleLoading }] = useLazyGetRepaymentScheduleQuery();

    // Repay form state
    const [repayAmount, setRepayAmount] = useState("");
    const [repayRef, setRepayRef] = useState("");
    const [repayMethod, setRepayMethod] = useState("");

    // Schedule state — derived directly from query (no redundant setState)
    const [missNotes, setMissNotes] = useState("");

    const loans: ItemsItem[] = data?.data?.items ?? [];
    const meta = data?.data?.meta;

    const scheduleRepayments: LoanRepayment[] = scheduleData?.data?.items ?? [];

    // Client-side search on top of server-side filters
    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return loans;
        return loans.filter(
            (l) =>
                memberName(l).toLowerCase().includes(q) ||
                l.purpose?.toLowerCase().includes(q) ||
                l.id.toLowerCase().includes(q),
        );
    }, [loans, search]);



    const { control, handleSubmit: handleSubmitApproval, setValue, formState: {
        errors: approvalErrors,

    } } = useForm<ApproveLoanFormValues>({
        resolver: yupResolver(ApproveLoanSchema) as unknown as Resolver<ApproveLoanFormValues>,
        defaultValues: {
            approvedAmount: selectedLoan?.requestedAmount ? Number(selectedLoan.requestedAmount) : undefined,
            approvalNotes: "",
        }
    });

    const { control: disbursementControl, handleSubmit: handleSubmitDisbursement, formState: { errors: disbursementErrors } } = useForm<DisapproveLoanFormValues>({
        resolver: yupResolver(DisapproveLoanSchema) as unknown as Resolver<DisapproveLoanFormValues>,
        defaultValues: {
            notes: ""
        }
    })

    useEffect(() => {
        if (selectedLoan && selectedLoan?.requestedAmount) {

            setValue("approvedAmount", selectedLoan.requestedAmount ? Number(selectedLoan.requestedAmount) : 0);
        }
    }, [selectedLoan,]);
    // ── actions ──

    function openModal(mode: ModalMode, loan: ItemsItem) {
        setSelectedLoan(loan);
        setActiveModal(mode);
        setRejectReason("");
        setDisburseAmount(loan.requestedAmount ?? "");
        if (mode === "repay") {
            setRepayAmount(String(loan.installmentAmount ?? ""));
            setRepayRef("");
            setRepayMethod("");
        }
        if (mode === "schedule") {
            setMissNotes("");
            fetchSchedule({ id: loan.id, limit: 50 });
        }
    }

    function closeModal() {
        setActiveModal(null);
        setSelectedLoan(null);
    }

    const handleApprove = useCallback(async (data: ApproveLoanFormValues) => {
        if (!selectedLoan) return;
        try {
            await approveLoan({ id: selectedLoan.id, notes: data.approvalNotes, approvedAmount: data.approvedAmount }).unwrap();
            toast.success("Loan approved", `Loan for ${memberName(selectedLoan)} has been approved.`);
            closeModal();
        } catch (err: any) {
            toast.error("Failed", err?.data?.message ?? "Could not approve loan.");
        }
    }, [approveLoan, selectedLoan, toast]);

    const handleReject = useCallback(async () => {
        if (!selectedLoan || !rejectReason.trim()) {
            toast.warning("Required", "Please provide a rejection reason.");
            return;
        }
        try {
            await rejectLoan({ id: selectedLoan.id, reason: rejectReason }).unwrap();
            toast.success("Loan rejected", `Loan for ${memberName(selectedLoan)} has been rejected.`);
            closeModal();
        } catch (err: any) {
            toast.error("Failed", err?.data?.message ?? "Could not reject loan.");
        }
    }, [rejectLoan, rejectReason, selectedLoan, toast]);

    const handleDisburse = useCallback(async (data: DisapproveLoanFormValues) => {
        if (!selectedLoan) return;
        try {
            await disburseLoan({
                id: selectedLoan.id,
                disbursedAmount: data?.disbursedAmount,
                notes: data.notes
            }).unwrap();
            toast.success("Disbursed", `Funds disbursed to ${memberName(selectedLoan)}.`);
            closeModal();
        } catch (err: any) {
            toast.error("Failed", err?.data?.message ?? "Could not disburse loan.");
        }
    }, [disburseLoan, disburseAmount, selectedLoan, toast]);

    const handleRepay = useCallback(async () => {
        if (!selectedLoan || !repayAmount) {
            toast.warning("Required", "Amount paid is required.");
            return;
        }
        try {
            await recordRepayment({
                id: selectedLoan.id,
                data: {
                    amountPaid: parseFloat(repayAmount),
                    momoRef: repayRef || undefined,
                    paymentMethod: repayMethod || undefined,
                },
            }).unwrap();
            toast.success("Repayment recorded", `Payment recorded for ${memberName(selectedLoan)}.`);
            closeModal();
        } catch (err: any) {
            toast.error("Failed", err?.data?.message ?? "Could not record repayment.");
        }
    }, [selectedLoan, repayAmount, repayRef, repayMethod, recordRepayment, toast]);

    const handleMarkMissed = useCallback(async (repaymentId: string) => {
        if (!selectedLoan) return;
        try {
            await markRepaymentMissed({ id: selectedLoan.id, repaymentId, notes: missNotes || undefined }).unwrap();
            toast.success("Marked missed", "Installment marked as missed.");
            fetchSchedule({ id: selectedLoan.id, limit: 50 });
        } catch (err: any) {
            toast.error("Failed", err?.data?.message ?? "Could not mark installment as missed.");
        }
    }, [selectedLoan, missNotes, markRepaymentMissed, fetchSchedule, toast]);

    const handleExport = () => {
        exportCSV(loans);
        toast.success("Exported", `${loans.length} loans exported as CSV.`);
    };

    // ── render ──

    return (
        <>
            <div className="grid gap-6">
                {/* Header */}
                <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="panel-tag">Loan Management</p>
                        <h2 className="headline mt-2 text-2xl text-(--ib-ink) sm:text-3xl">Loan Requests</h2>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-(--ib-muted)">
                            Review, approve, reject and track all loan applications from group members.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={() => refetch()}
                            disabled={isFetching}
                            className="ib-btn-secondary gap-2"
                        >
                            <RefreshCw size={15} className={isFetching ? "animate-spin" : ""} />
                            Refresh
                        </button>
                        <button onClick={handleExport} className="ib-btn-secondary gap-2">
                            <Download size={15} />
                            Export CSV
                        </button>
                    </div>
                </header>

                {/* Stats strip */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                        { label: "Total Loans", value: summaryData?.data?.totalLoans, icon: TrendingUp, color: "text-(--ib-accent)" },
                        { label: "Pending", value: summaryData?.data?.pendingCount, icon: Clock, color: "text-yellow-600" },
                        { label: "Approved", value: summaryData?.data?.activeCount, icon: CheckCircle2, color: "text-blue-600" },
                        { label: "Disbursed", value: summaryData?.data?.totalDisbursed, icon: Banknote, color: "text-green-600" },
                    ].map(({ label, value, icon: Icon, color }) => (
                        <div key={label} className="rounded-xl border border-(--ib-line) bg-white p-4 shadow-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-(--ib-muted)">{label}</span>
                                <Icon size={16} className={color} />
                            </div>
                            <p className={`mt-2 text-2xl font-extrabold ${color}`}>{value}</p>
                        </div>
                    ))}
                </div>

                {/* Filters */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Input
                        label=""
                        placeholder="Search member, purpose, ID…"
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        className="sm:max-w-xs"
                    />
                    <Dropdown
                        value={statusFilter}
                        onValueChange={(v) => { setStatusFilter(v); setPage(1); }}
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
                            <Spinner size="lg" />
                            Loading loans…
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 p-16 text-center">
                            <AlertCircle size={36} className="text-(--ib-line)" />
                            <p className="text-sm font-medium text-(--ib-muted)">No loans found</p>
                            <p className="text-xs text-(--ib-muted)">
                                {statusFilter ? `No ${statusFilter} loans at the moment.` : "No loan applications yet."}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-(--ib-line) bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-(--ib-muted)">
                                        <th className="px-4 py-3">Member</th>
                                        <th className="px-4 py-3">Amount</th>
                                        <th className="px-4 py-3">Purpose</th>
                                        <th className="px-4 py-3">Term</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3">Applied</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-(--ib-line)">
                                    {filtered.map((loan) => (
                                        <LoanRow
                                            key={loan.id}
                                            loan={loan}
                                            onView={() => openModal("view", loan)}
                                            onApprove={() => openModal("approve", loan)}
                                            onReject={() => openModal("reject", loan)}
                                            onDisburse={() => openModal("disburse", loan)}
                                            onRepay={() => openModal("repay", loan)}
                                            onSchedule={() => openModal("schedule", loan)}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
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

            {/* ── Approve Modal ── */}
            <Modal
                isOpen={activeModal === "approve"}
                onClose={closeModal}
                title="Approve Loan"
                description={`Approve the loan request from ${selectedLoan ? memberName(selectedLoan) : ""} for ${selectedLoan ? fmt(selectedLoan.requestedAmount, selectedLoan.currency) : ""}.`}
            >
                <div className="grid gap-4 p-5">

                    <Input
                        label={`Approved amount (${selectedLoan?.currency ?? "RWF"})`}
                        type="number"
                        min={0}
                        {...control.register("approvedAmount")}
                        placeholder={selectedLoan?.requestedAmount ?? "0"}
                        error={approvalErrors?.approvedAmount?.message || approvalErrors?.approvalNotes?.message ? "Please fix errors in the approval form" : undefined}


                    />
                    <Input
                        label="Approval notes (optional)"
                        placeholder="Add any notes for the member…"
                        {...control.register("approvalNotes")}
                        error={approvalErrors?.approvalNotes?.message ? approvalErrors.approvalNotes.message : undefined}
                    />
                    <div className="flex justify-end gap-3 border-t border-(--ib-line) pt-4">
                        <button className="ib-btn-secondary" onClick={closeModal}>Cancel</button>
                        <button
                            className="ib-btn-primary gap-2 bg-green-700 hover:bg-green-800"
                            onClick={handleSubmitApproval(handleApprove)}
                            disabled={isApproving}
                        >
                            {isApproving ? <Spinner size="sm" /> : <CheckCircle2 size={15} />}
                            {isApproving ? "Approving…" : "Approve Loan"}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* ── Reject Modal ── */}
            <Modal
                isOpen={activeModal === "reject"}
                onClose={closeModal}
                title="Reject Loan"
                description={`Reject the loan request from ${selectedLoan ? memberName(selectedLoan) : ""}. A reason is required.`}
            >
                <div className="grid gap-4 p-5">
                    <Input
                        label="Rejection reason *"
                        placeholder="Explain why the loan is being rejected…"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                    />
                    <div className="flex justify-end gap-3 border-t border-(--ib-line) pt-4">
                        <button className="ib-btn-secondary" onClick={closeModal}>Cancel</button>
                        <button
                            className="ib-btn-primary gap-2 bg-red-600 hover:bg-red-700"
                            onClick={handleReject}
                            disabled={isRejecting || !rejectReason.trim()}
                        >
                            {isRejecting ? <Spinner size="sm" /> : <XCircle size={15} />}
                            {isRejecting ? "Rejecting…" : "Reject Loan"}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* ── Disburse Modal ── */}
            <Modal
                isOpen={activeModal === "disburse"}
                onClose={closeModal}
                title="Disburse Funds"
                description={`Disburse approved loan to ${selectedLoan ? memberName(selectedLoan) : ""}.`}
            >
                <div className="grid gap-4 p-5">
                    <Input
                        label={`Disburse amount (${selectedLoan?.currency ?? "RWF"})`}
                        type="number"
                        min={0}
                        placeholder={selectedLoan?.disbursedAmount ?? "0"}
                        {...disbursementControl.register("disbursedAmount")}
                        error={disbursementErrors?.disbursedAmount?.message ? disbursementErrors.disbursedAmount.message : undefined}

                    />

                    <Input
                        label="Disbursement notes (optional)"
                        placeholder="Add any notes for the member…"
                        {...disbursementControl.register("notes")}
                        error={disbursementErrors?.notes?.message ? disbursementErrors.notes.message : undefined}
                    />

                    <div className="flex justify-end gap-3 border-t border-(--ib-line) pt-4">
                        <button className="ib-btn-secondary" onClick={closeModal}>Cancel</button>
                        <button
                            className="ib-btn-primary gap-2"
                            onClick={handleSubmitDisbursement(handleDisburse)}
                            disabled={isDisbursing}
                        >
                            {isDisbursing ? <Spinner size="sm" /> : <Banknote size={15} />}
                            {isDisbursing ? "Processing…" : "Disburse Funds"}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* ── View Modal ── */}
            {selectedLoan && (
                <Modal
                    isOpen={activeModal === "view"}
                    onClose={closeModal}
                    title="Loan Details"
                    description={`Full details for loan ${selectedLoan.id}`}
                >
                    <div className="grid gap-3 p-5 text-sm">
                        <DetailGrid loan={selectedLoan} />
                        <div className="flex justify-end border-t border-(--ib-line) pt-4">
                            <button className="ib-btn-secondary" onClick={closeModal}>Close</button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* ── Record Repayment Modal ── */}
            <Modal
                isOpen={activeModal === "repay"}
                onClose={closeModal}
                title="Record Repayment"
                description={selectedLoan ? `Record next installment payment for ${memberName(selectedLoan)}.` : ""}
            >
                <div className="grid gap-4 p-5">
                    <Input
                        label={`Amount paid (${selectedLoan?.currency ?? "RWF"}) *`}
                        type="number"
                        min={0}
                        value={repayAmount}
                        onChange={(e) => setRepayAmount(e.target.value)}
                        placeholder={selectedLoan?.installmentAmount ? String(selectedLoan.installmentAmount) : "0"}
                    />
                    <Dropdown
                        label="Payment method"
                        value={repayMethod}
                        onValueChange={setRepayMethod}
                        options={[
                            { label: "— Select method —", value: "" },
                            { label: "Mobile Money (MoMo)", value: "momo" },
                            { label: "Bank Transfer", value: "bank" },
                            { label: "Cash", value: "cash" },
                        ]}
                    />
                    <Input
                        label="Reference / transaction ID (optional)"
                        value={repayRef}
                        onChange={(e) => setRepayRef(e.target.value)}
                        placeholder="e.g. TXN20260517001"
                    />
                    <div className="flex justify-end gap-3 border-t border-(--ib-line) pt-4">
                        <button className="ib-btn-secondary" onClick={closeModal}>Cancel</button>
                        <button
                            className="ib-btn-primary gap-2"
                            onClick={handleRepay}
                            disabled={isRepaying}
                        >
                            {isRepaying ? <Spinner size="sm" /> : <CreditCard size={15} />}
                            {isRepaying ? "Recording…" : "Record Payment"}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* ── Repayment Schedule Modal ── */}
            <Modal
                isOpen={activeModal === "schedule"}
                onClose={closeModal}
                title="Repayment Schedule"
                description={selectedLoan ? `Installment schedule for ${memberName(selectedLoan)}'s loan.` : ""}
            >
                <div className="grid gap-4 p-5">
                    {isScheduleLoading ? (
                        <div className="flex items-center justify-center gap-2 py-8 text-sm text-(--ib-muted)">
                            <Spinner size="lg" /> Loading schedule…
                        </div>
                    ) : scheduleRepayments.length === 0 ? (
                        <p className="py-6 text-center text-sm text-(--ib-muted)">No repayment schedule found.</p>
                    ) : (
                        <div className="overflow-x-auto rounded-lg border border-(--ib-line)">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-(--ib-muted)">
                                    <tr>
                                        <th className="px-3 py-2 text-left">#</th>
                                        <th className="px-3 py-2 text-left">Due Date</th>
                                        <th className="px-3 py-2 text-left">Total</th>
                                        <th className="px-3 py-2 text-left">Paid</th>
                                        <th className="px-3 py-2 text-left">Status</th>
                                        <th className="px-3 py-2 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-(--ib-line)">
                                    {scheduleRepayments.map((r) => (
                                        <tr key={r.id} className="hover:bg-gray-50/60">
                                            <td className="px-3 py-2 text-(--ib-muted)">{r.installmentNumber}</td>
                                            <td className="px-3 py-2 text-(--ib-muted)">{fmtDate(r.dueDate)}</td>
                                            <td className="px-3 py-2 font-semibold text-(--ib-ink)">{fmt(String(r.totalAmount), selectedLoan?.currency)}</td>
                                            <td className="px-3 py-2 text-(--ib-muted)">{r.amountPaid ? fmt(String(r.amountPaid), selectedLoan?.currency) : "—"}</td>
                                            <td className="px-3 py-2">
                                                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${r.status === "paid" ? "bg-green-50 text-green-700 border border-green-200" :
                                                        r.status === "missed" ? "bg-red-50 text-red-700 border border-red-200" :
                                                            r.status === "partial" ? "bg-blue-50 text-blue-700 border border-blue-200" :
                                                                "bg-yellow-50 text-yellow-700 border border-yellow-200"
                                                    }`}>{r.status}</span>
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                                {r.status === "pending" && (
                                                    <button
                                                        onClick={() => handleMarkMissed(r.id)}
                                                        disabled={isMarkingMissed}
                                                        className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
                                                    >
                                                        {isMarkingMissed ? "…" : "Mark Missed"}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    <div className="flex justify-end border-t border-(--ib-line) pt-4">
                        <button className="ib-btn-secondary" onClick={closeModal}>Close</button>
                    </div>
                </div>
            </Modal>
        </>
    );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function LoanRow({
    loan,
    onView,
    onApprove,
    onReject,
    onDisburse,
    onRepay,
    onSchedule,
}: {
    loan: ItemsItem;
    onView: () => void;
    onApprove: () => void;
    onReject: () => void;
    onDisburse: () => void;
    onRepay: () => void;
    onSchedule: () => void;
}) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [menuRect, setMenuRect] = useState<DOMRect | null>(null);
    const btnRef = useRef<HTMLButtonElement>(null);
    const badgeClass = statusBadge[loan.status] ?? "bg-gray-100 text-gray-600 border border-gray-200";

    function handleToggleMenu() {
        if (!menuOpen && btnRef.current) {
            setMenuRect(btnRef.current.getBoundingClientRect());
        }
        setMenuOpen((o) => !o);
    }

    return (
        <tr className="transition-colors hover:bg-gray-50/60">
            <td className="px-4 py-3">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--ib-accent) text-xs font-bold text-white">
                        {(memberName(loan)[0] ?? "?").toUpperCase()}
                    </div>
                    <div>
                        <p className="font-semibold text-(--ib-ink)">{memberName(loan)}</p>
                        <p className="text-xs text-(--ib-muted)">{loan.user?.user_code ?? loan.userId.slice(0, 8)}</p>
                    </div>
                </div>
            </td>
            <td className="px-4 py-3 font-semibold text-(--ib-ink)">
                {fmt(loan.requestedAmount, loan.currency)}
            </td>
            <td className="px-4 py-3 max-w-[160px]">
                <p className="truncate text-(--ib-muted)" title={loan.purpose}>{loan.purpose}</p>
            </td>
            <td className="px-4 py-3 text-(--ib-muted)">{loan.termMonths} mo.</td>
            <td className="px-4 py-3">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${badgeClass}`}>
                    {loan.status}
                </span>
            </td>
            <td className="px-4 py-3 text-(--ib-muted)">{fmtDate(loan.createdAt)}</td>
            <td className="px-4 py-3 text-right">
                <button
                    ref={btnRef}
                    onClick={handleToggleMenu}
                    className="inline-flex items-center gap-1 rounded-md border border-(--ib-line) bg-white px-2.5 py-1.5 text-xs font-medium text-(--ib-ink) shadow-sm hover:bg-gray-50"
                >
                    Actions <ChevronDown size={12} />
                </button>
                {menuOpen && menuRect && (
                    <ActionMenu
                        anchorRect={menuRect}
                        status={loan.status}
                        onView={() => { setMenuOpen(false); onView(); }}
                        onApprove={() => { setMenuOpen(false); onApprove(); }}
                        onReject={() => { setMenuOpen(false); onReject(); }}
                        onDisburse={() => { setMenuOpen(false); onDisburse(); }}
                        onRepay={() => { setMenuOpen(false); onRepay(); }}
                        onSchedule={() => { setMenuOpen(false); onSchedule(); }}
                        onClose={() => setMenuOpen(false)}
                    />
                )}
            </td>
        </tr>
    );
}

function ActionMenu({
    anchorRect,
    status,
    onView,
    onApprove,
    onReject,
    onDisburse,
    onRepay,
    onSchedule,
    onClose,
}: {
    anchorRect: DOMRect;
    status: string;
    onView: () => void;
    onApprove: () => void;
    onReject: () => void;
    onDisburse: () => void;
    onRepay: () => void;
    onSchedule: () => void;
    onClose: () => void;
}) {
    // Place below the button; flip up if too close to the bottom edge
    const spaceBelow = window.innerHeight - anchorRect.bottom;
    const menuHeight = 120; // approximate
    const top = spaceBelow > menuHeight
        ? anchorRect.bottom + 6
        : anchorRect.top - menuHeight - 6;
    const right = window.innerWidth - anchorRect.right;

    return createPortal(
        <>
            {/* click-away backdrop */}
            <div className="fixed inset-0 z-[9990]" onClick={onClose} />
            <div
                className="fixed z-[9991] min-w-[160px] overflow-hidden rounded-xl border border-(--ib-line) bg-white py-1 shadow-lg"
                style={{ top, right }}
            >
                <MenuItem icon={Eye} label="View Details" onClick={onView} />
                {status === "pending" && (
                    <>
                        <MenuItem icon={CheckCircle2} label="Approve" onClick={onApprove} className="text-green-700" />
                        <MenuItem icon={XCircle} label="Reject" onClick={onReject} className="text-red-600" />
                    </>
                )}
                {status === "approved" && (
                    <MenuItem icon={Banknote} label="Disburse" onClick={onDisburse} className="text-blue-700" />
                )}
                {status === "disbursed" && (
                    <>
                        <MenuItem icon={CreditCard} label="Record Repayment" onClick={onRepay} className="text-green-700" />
                        <MenuItem icon={CalendarClock} label="View Schedule" onClick={onSchedule} />
                    </>
                )}
            </div>
        </>,
        document.body,
    );
}

function MenuItem({
    icon: Icon,
    label,
    onClick,
    className = "",
}: {
    icon: React.ElementType;
    label: string;
    onClick: () => void;
    className?: string;
}) {
    return (
        <button
            onClick={onClick}
            className={`flex w-full items-center gap-2.5 px-4 py-2 text-sm hover:bg-gray-50 ${className || "text-(--ib-ink)"}`}
        >
            <Icon size={14} />
            {label}
        </button>
    );
}

function DetailGrid({ loan }: { loan: ItemsItem }) {
    const rows: Array<[string, string]> = [
        ["Member", memberName(loan)],
        ["Email", loan.user?.email ?? "—"],
        ["Phone", loan.user?.phone ?? "—"],
        ["Requested Amount", fmt(loan.requestedAmount, loan.currency)],
        ["Disbursed Amount", fmt(loan.disbursedAmount as string | null, loan.currency)],
        ["Interest Rate", loan.interestRate ? `${loan.interestRate}%` : "—"],
        ["Term", `${loan.termMonths} months`],
        ["Total Due", fmt(loan.totalDue as string | null, loan.currency)],
        ["Installment", fmt(loan.installmentAmount as string | null, loan.currency)],
        ["Remaining Balance", fmt(loan.remainingBalance as string | null, loan.currency)],
        ["Purpose", loan.purpose],
        ["Status", loan.status],
        ["Applied On", fmtDate(loan.createdAt)],
        ["Approved At", fmtDate(loan.approvedAt as string | null)],
        ["Approval Notes", loan.approvalNotes ?? "—"],
        ["Rejected At", fmtDate(loan.rejectedAt as string | null)],
        ["Rejection Reason", loan.rejectionReason ?? "—"],
        ["Disbursed At", fmtDate(loan.disbursedAt as string | null)],
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


