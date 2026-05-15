const financeItems = [
    "Track savings contributions and payment consistency.",
    "Maintain accurate digital ledgers for inflows and outflows.",
    "Review loan repayment progress with clear statuses.",
    "Export financial history for planning and reporting meetings.",
];

const financeStats = [
    { label: "Monthly Contributions", value: "RWF 7.4M" },
    { label: "Outstanding Loans", value: "RWF 3.1M" },
    { label: "Repayments This Week", value: "RWF 640K" },
    { label: "Late Accounts", value: "9" },
];

export default function FinanceDashboardPage() {
    return (
        <section className="grid gap-4 lg:grid-cols-[1.45fr_1fr]">
            <article className="panel">
                <p className="panel-tag">Finance Officer</p>
                <h2 className="panel-title">Finance Dashboard</h2>
                <p className="mt-3 text-sm text-(--ib-muted)">
                    Financial control center for contributions, loans, repayments, and long-term planning.
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {financeStats.map((stat) => (
                        <div key={stat.label} className="mini-metric">
                            <p className="mini-metric-label">{stat.label}</p>
                            <p className="mini-metric-value">{stat.value}</p>
                        </div>
                    ))}
                </div>
            </article>

            <article className="panel">
                <p className="panel-tag">Financial Controls</p>
                <ul className="panel-list mt-3">
                    {financeItems.map((item) => (
                        <li key={item}>{item}</li>
                    ))}
                </ul>
            </article>
        </section>
    );
}
