import { Banknote, Download, TrendingDown, TrendingUp } from "lucide-react";

const stats = [
    { label: "Total Contributions", value: "RWF 7.4M", icon: TrendingUp },
    { label: "Outstanding Loans", value: "RWF 3.1M", icon: Banknote },
    { label: "Late Contributions", value: "RWF 420K", icon: TrendingDown },
    { label: "Cash Balance", value: "RWF 4.8M", icon: Banknote },
];

const rows = [
    { period: "May 2026", contributions: "RWF 1.24M", loans: "RWF 860K", repayments: "RWF 640K", balance: "RWF 4.8M" },
    { period: "Apr 2026", contributions: "RWF 1.18M", loans: "RWF 520K", repayments: "RWF 710K", balance: "RWF 4.3M" },
    { period: "Mar 2026", contributions: "RWF 1.08M", loans: "RWF 440K", repayments: "RWF 590K", balance: "RWF 3.9M" },
];

export default function ChairpersonFinanceReportsPage() {
    return (
        <div className="grid gap-6">
            <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <p className="panel-tag">Finance</p>
                    <h2 className="headline mt-2 text-2xl text-(--ib-ink) sm:text-3xl">Finance Reports</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-(--ib-muted)">View contribution, loan, repayment, and balance summaries for your group.</p>
                </div>
                <button className="ib-btn-primary justify-center">
                    <Download size={16} />
                    Export
                </button>
            </header>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {stats.map((stat) => (
                    <article key={stat.label} className="rounded-xl border border-(--ib-line) bg-white p-5 shadow-sm">
                        <stat.icon className="text-(--ib-accent)" size={22} />
                        <p className="mt-4 text-sm font-semibold text-(--ib-muted)">{stat.label}</p>
                        <p className="mt-2 text-2xl font-bold text-(--ib-ink)">{stat.value}</p>
                    </article>
                ))}
            </section>

            <section className="rounded-xl border border-(--ib-line) bg-white shadow-sm">
                <div className="border-b border-(--ib-line) p-5">
                    <h3 className="headline text-xl text-(--ib-ink)">Monthly Finance Summary</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-left text-sm">
                        <thead className="bg-gray-50 text-xs uppercase text-[#375176]/70">
                            <tr>
                                <th className="px-5 py-3">Period</th>
                                <th className="px-5 py-3">Contributions</th>
                                <th className="px-5 py-3">Loans</th>
                                <th className="px-5 py-3">Repayments</th>
                                <th className="px-5 py-3">Balance</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-(--ib-line)">
                            {rows.map((row) => (
                                <tr key={row.period}>
                                    <td className="px-5 py-4 font-semibold text-(--ib-ink)">{row.period}</td>
                                    <td className="px-5 py-4 text-(--ib-muted)">{row.contributions}</td>
                                    <td className="px-5 py-4 text-(--ib-muted)">{row.loans}</td>
                                    <td className="px-5 py-4 text-(--ib-muted)">{row.repayments}</td>
                                    <td className="px-5 py-4 font-semibold text-(--ib-ink)">{row.balance}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
