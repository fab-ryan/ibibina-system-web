"use client";

import { Dropdown } from "@/components/ui";
import { CheckCircle2, ClipboardList, XCircle } from "lucide-react";
import { useMemo, useState } from "react";

type LoanStatus = "pending" | "approved" | "denied";

const initialRequests = [
    { id: "LN-001", member: "Vestine Mukeshimana", amount: "RWF 500,000", purpose: "Market stock", duration: "4 months", status: "pending" as LoanStatus },
    { id: "LN-002", member: "Eric Tuyisenge", amount: "RWF 250,000", purpose: "School fees", duration: "3 months", status: "pending" as LoanStatus },
    { id: "LN-003", member: "Patrick Habimana", amount: "RWF 800,000", purpose: "Farming equipment", duration: "6 months", status: "approved" as LoanStatus },
];

const statusOptions = [
    { label: "All requests", value: "all" },
    { label: "Pending", value: "pending" },
    { label: "Approved", value: "approved" },
    { label: "Denied", value: "denied" },
];

function titleCase(value: string) {
    return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function ChairpersonLoansPage() {
    const [requests, setRequests] = useState(initialRequests);
    const [status, setStatus] = useState("pending");

    const filteredRequests = useMemo(
        () => requests.filter((request) => status === "all" || request.status === status),
        [requests, status],
    );

    function updateStatus(id: string, nextStatus: LoanStatus) {
        setRequests((current) => current.map((request) => request.id === id ? { ...request, status: nextStatus } : request));
    }

    return (
        <div className="grid gap-6">
            <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <p className="panel-tag">Loans</p>
                    <h2 className="headline mt-2 text-2xl text-(--ib-ink) sm:text-3xl">Loan Requests</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-(--ib-muted)">Review member loan applications and approve or deny with a documented decision.</p>
                </div>
                <Dropdown value={status} onValueChange={setStatus} options={statusOptions} containerClassName="w-full sm:w-56" />
            </header>

            <section className="grid gap-4">
                {filteredRequests.map((request) => (
                    <article key={request.id} className="rounded-xl border border-(--ib-line) bg-white p-5 shadow-sm">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <ClipboardList className="text-(--ib-accent)" size={18} />
                                    <p className="font-bold text-(--ib-ink)">{request.id} - {request.member}</p>
                                </div>
                                <p className="mt-2 text-sm text-(--ib-muted)">{request.purpose} - {request.duration}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                <span className="text-lg font-bold text-(--ib-ink)">{request.amount}</span>
                                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                                    request.status === "approved"
                                        ? "bg-emerald-50 text-emerald-700"
                                        : request.status === "denied"
                                          ? "bg-rose-50 text-rose-700"
                                          : "bg-amber-50 text-amber-700"
                                }`}>
                                    {titleCase(request.status)}
                                </span>
                            </div>
                        </div>
                        {request.status === "pending" && (
                            <div className="mt-4 flex flex-col gap-2 border-t border-(--ib-line) pt-4 sm:flex-row sm:justify-end">
                                <button className="ib-btn-secondary justify-center" onClick={() => updateStatus(request.id, "denied")}>
                                    <XCircle size={16} />
                                    Deny
                                </button>
                                <button className="ib-btn-primary justify-center" onClick={() => updateStatus(request.id, "approved")}>
                                    <CheckCircle2 size={16} />
                                    Approve
                                </button>
                            </div>
                        )}
                    </article>
                ))}
            </section>
        </div>
    );
}
