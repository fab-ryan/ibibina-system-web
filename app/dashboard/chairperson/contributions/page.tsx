"use client";

import { Dropdown, Input } from "@/components/ui";
import { Banknote, CheckCircle2, Search } from "lucide-react";
import { useMemo, useState } from "react";

const contributions = [
    { member: "Jean Pierre Ndayisenga", period: "May 2026", amount: "RWF 12,000", status: "paid", paidAt: "May 11, 2026" },
    { member: "Clarisse Mukamana", period: "May 2026", amount: "RWF 12,000", status: "paid", paidAt: "May 10, 2026" },
    { member: "Eric Tuyisenge", period: "May 2026", amount: "RWF 8,000", status: "partial", paidAt: "May 8, 2026" },
    { member: "Patrick Habimana", period: "May 2026", amount: "RWF 0", status: "late", paidAt: "Not paid" },
];

const statusOptions = [
    { label: "All statuses", value: "all" },
    { label: "Paid", value: "paid" },
    { label: "Partial", value: "partial" },
    { label: "Late", value: "late" },
];

function titleCase(value: string) {
    return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function ChairpersonContributionsPage() {
    const [query, setQuery] = useState("");
    const [status, setStatus] = useState("all");

    const filteredContributions = useMemo(() => {
        return contributions.filter((contribution) => {
            const matchesStatus = status === "all" || contribution.status === status;
            const matchesQuery = [contribution.member, contribution.period, contribution.status].join(" ").toLowerCase().includes(query.toLowerCase());
            return matchesStatus && matchesQuery;
        });
    }, [query, status]);

    return (
        <div className="grid gap-6">
            <header>
                <p className="panel-tag">Finance</p>
                <h2 className="headline mt-2 text-2xl text-(--ib-ink) sm:text-3xl">Contribution Details</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-(--ib-muted)">Track paid, partial, and late contributions for each group member.</p>
            </header>

            <section className="grid gap-4 sm:grid-cols-3">
                {[
                    ["Expected", "RWF 1.03M"],
                    ["Collected", "RWF 948K"],
                    ["Collection Rate", "92%"],
                ].map(([label, value]) => (
                    <article key={label} className="rounded-xl border border-(--ib-line) bg-white p-5 shadow-sm">
                        <Banknote className="text-(--ib-accent)" size={22} />
                        <p className="mt-4 text-sm font-semibold text-(--ib-muted)">{label}</p>
                        <p className="mt-2 text-2xl font-bold text-(--ib-ink)">{value}</p>
                    </article>
                ))}
            </section>

            <section className="rounded-xl border border-(--ib-line) bg-white shadow-sm">
                <div className="grid gap-3 border-b border-(--ib-line) p-4 md:grid-cols-[1fr_220px]">
                    <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search contributions" leftIcon={Search} />
                    <Dropdown value={status} onValueChange={setStatus} options={statusOptions} />
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-left text-sm">
                        <thead className="bg-gray-50 text-xs uppercase text-[#375176]/70">
                            <tr>
                                <th className="px-5 py-3">Member</th>
                                <th className="px-5 py-3">Period</th>
                                <th className="px-5 py-3">Amount</th>
                                <th className="px-5 py-3">Paid At</th>
                                <th className="px-5 py-3">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-(--ib-line)">
                            {filteredContributions.map((contribution) => (
                                <tr key={`${contribution.member}-${contribution.period}`}>
                                    <td className="px-5 py-4 font-semibold text-(--ib-ink)">{contribution.member}</td>
                                    <td className="px-5 py-4 text-(--ib-muted)">{contribution.period}</td>
                                    <td className="px-5 py-4 text-(--ib-muted)">{contribution.amount}</td>
                                    <td className="px-5 py-4 text-(--ib-muted)">{contribution.paidAt}</td>
                                    <td className="px-5 py-4">
                                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                                            contribution.status === "paid"
                                                ? "bg-emerald-50 text-emerald-700"
                                                : contribution.status === "partial"
                                                  ? "bg-amber-50 text-amber-700"
                                                  : "bg-rose-50 text-rose-700"
                                        }`}>
                                            {contribution.status === "paid" && <CheckCircle2 size={12} />}
                                            {titleCase(contribution.status)}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
