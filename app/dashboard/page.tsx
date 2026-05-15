import Link from "next/link";

const cards = [
    {
        title: "System Administrator",
        description: "Central oversight, audit trails, security controls, and multi-group monitoring.",
        href: "/dashboard/admin",
    },
    {
        title: "Chairperson",
        description: "Member registration, attendance management, and transparent loan approval.",
        href: "/dashboard/chairperson",
    },
    {
        title: "Finance",
        description: "Cashflow tracking, contribution summaries, and complete financial history.",
        href: "/dashboard/finance",
    },
];

const metrics = [
    { label: "Active Groups", value: "24" },
    { label: "Members Registered", value: "1,284" },
    { label: "Pending Loans", value: "18" },
    { label: "Repayment Rate", value: "96.4%" },
];

export default function DashboardIndexPage() {
    return (
        <section className="grid gap-4">
            <article className="panel">
                <p className="panel-tag">Platform Snapshot</p>
                <h2 className="panel-title">IBIBINA Performance Overview</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {metrics.map((metric) => (
                        <div key={metric.label} className="mini-metric">
                            <p className="mini-metric-label">{metric.label}</p>
                            <p className="mini-metric-value">{metric.value}</p>
                        </div>
                    ))}
                </div>
            </article>

            <div className="grid gap-4 md:grid-cols-3">
                {cards.map((card) => (
                    <article key={card.href} className="panel">
                        <h2 className="panel-title">{card.title}</h2>
                        <p className="mt-3 text-sm text-(--ib-muted)">{card.description}</p>
                        <Link href={card.href} className="ib-btn-secondary mt-5 inline-flex">
                            Open Dashboard
                        </Link>
                    </article>
                ))}
            </div>
        </section>
    );
}
