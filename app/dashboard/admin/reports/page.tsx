import Link from "next/link";
import { BarChart3, Building2, Download, FileText, Users } from "lucide-react";

const reportCards = [
    {
        title: "Users Report",
        description: "Role distribution, status changes, verification coverage, and account growth.",
        metric: "1,204",
        label: "registered users",
        icon: Users,
    },
    {
        title: "Groups Report",
        description: "Registered groups, purposes, locations, contribution policies, and chairperson coverage.",
        metric: "24",
        label: "registered groups",
        icon: Building2,
    },
    {
        title: "Activity Report",
        description: "Admin actions, login attempts, group updates, and sensitive account operations.",
        metric: "18,402",
        label: "audit events",
        icon: BarChart3,
    },
];

const userRoleRows = [
    { label: "Members", value: 982, width: "82%" },
    { label: "Chairpersons", value: 92, width: "42%" },
    { label: "Finance", value: 38, width: "24%" },
    { label: "Admins", value: 8, width: "12%" },
];

const groupPurposeRows = [
    { label: "Savings", value: 14, status: "Leading purpose" },
    { label: "Investment", value: 5, status: "Growing" },
    { label: "Agriculture", value: 3, status: "Stable" },
    { label: "Social Support", value: 2, status: "Community" },
];

export default function AdminReportsPage() {
    return (
        <div className="grid gap-6">
            <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <p className="panel-tag">Admin Console</p>
                    <h2 className="headline mt-2 text-2xl text-(--ib-ink) sm:text-3xl">Reports</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-(--ib-muted)">
                        Review users, groups, and activity summaries before exporting operational reports.
                    </p>
                </div>
                <button className="ib-btn-primary justify-center">
                    <Download size={16} />
                    Export Reports
                </button>
            </header>

            <section className="grid gap-4 lg:grid-cols-3">
                {reportCards.map((report) => (
                    <article key={report.title} className="rounded-xl border border-(--ib-line) bg-white p-5 shadow-sm">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h3 className="font-bold text-(--ib-ink)">{report.title}</h3>
                                <p className="mt-2 text-sm leading-6 text-(--ib-muted)">{report.description}</p>
                            </div>
                            <span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-(--ib-accent)">
                                <report.icon size={20} />
                            </span>
                        </div>
                        <div className="mt-5 rounded-xl bg-[#f4f7fc] p-4">
                            <p className="text-2xl font-bold text-(--ib-ink)">{report.metric}</p>
                            <p className="text-xs font-semibold text-(--ib-muted)">{report.label}</p>
                        </div>
                    </article>
                ))}
            </section>

            <section className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
                <article className="rounded-xl border border-(--ib-line) bg-white p-5 shadow-sm">
                    <h3 className="headline text-xl text-(--ib-ink)">Users by Role</h3>
                    <div className="mt-5 grid gap-4">
                        {userRoleRows.map((row) => (
                            <div key={row.label}>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-semibold text-(--ib-ink)">{row.label}</span>
                                    <span className="text-(--ib-muted)">{row.value}</span>
                                </div>
                                <div className="mt-2 h-2 rounded-full bg-[#edf3fd]">
                                    <div className="h-2 rounded-full bg-(--ib-accent)" style={{ width: row.width }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </article>

                <article className="rounded-xl border border-(--ib-line) bg-white p-5 shadow-sm">
                    <h3 className="headline text-xl text-(--ib-ink)">Groups by Purpose</h3>
                    <div className="mt-4 overflow-hidden rounded-xl border border-(--ib-line)">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-xs uppercase text-[#375176]/70">
                                <tr>
                                    <th className="px-4 py-3">Purpose</th>
                                    <th className="px-4 py-3">Groups</th>
                                    <th className="px-4 py-3">Signal</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-(--ib-line)">
                                {groupPurposeRows.map((row) => (
                                    <tr key={row.label}>
                                        <td className="px-4 py-3 font-semibold text-(--ib-ink)">{row.label}</td>
                                        <td className="px-4 py-3 text-(--ib-muted)">{row.value}</td>
                                        <td className="px-4 py-3 text-(--ib-muted)">{row.status}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </article>
            </section>

            <section className="rounded-xl border border-(--ib-line) bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h3 className="font-bold text-(--ib-ink)">Report Shortcuts</h3>
                        <p className="mt-1 text-sm text-(--ib-muted)">Open the source records behind each report.</p>
                    </div>
                    <FileText className="text-(--ib-accent)" size={22} />
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <Link href="/dashboard/admin/users" className="rounded-xl border border-(--ib-line) px-4 py-3 text-sm font-semibold text-(--ib-muted) hover:bg-[#f4f7fc] hover:text-(--ib-accent)">
                        View users
                    </Link>
                    <Link href="/dashboard/admin/organizations" className="rounded-xl border border-(--ib-line) px-4 py-3 text-sm font-semibold text-(--ib-muted) hover:bg-[#f4f7fc] hover:text-(--ib-accent)">
                        View groups
                    </Link>
                </div>
            </section>
        </div>
    );
}
