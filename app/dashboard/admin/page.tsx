import Link from "next/link";
import {
    Activity,
    ArrowRight,
    BarChart3,
    Building2,
    Gauge,
    ShieldCheck,
    UserPlus,
    Users,
} from "lucide-react";

const overviewStats = [
    { label: "Active Users", value: "1,204", trend: "+12% this week", icon: Users },
    { label: "Registered Groups", value: "24", trend: "+3 this month", icon: Building2 },
    { label: "Security Score", value: "94%", trend: "2 alerts open", icon: ShieldCheck },
    { label: "System Uptime", value: "99.98%", trend: "30 day window", icon: Gauge },
];

const adminModules = [
    {
        title: "Users",
        description: "Create accounts, assign roles, manage status, and control access.",
        href: "/dashboard/admin/users",
        icon: Users,
    },
    {
        title: "Groups",
        description: "Register groups, view setup details, and assign chairpersons.",
        href: "/dashboard/admin/organizations",
        icon: Building2,
    },
    {
        title: "Reports",
        description: "Review users, groups, and activity summaries for export.",
        href: "/dashboard/admin/reports",
        icon: BarChart3,
    },
    {
        title: "System Security",
        description: "Monitor failed logins, access policies, and verification coverage.",
        href: "/dashboard/admin/security",
        icon: ShieldCheck,
    },
    {
        title: "System Performance",
        description: "Track service health, latency, server load, and capacity.",
        href: "/dashboard/admin/performance",
        icon: Gauge,
    },
];

const recentActivity = [
    { action: "User role updated", target: "Jean Pierre", time: "10 mins ago", status: "Success" },
    { action: "Failed login attempt", target: "Unknown IP", time: "45 mins ago", status: "Warning" },
    { action: "New group registered", target: "Kigali Savers", time: "2 hours ago", status: "Success" },
    { action: "Reports worker queued", target: "Monthly summary", time: "5 hours ago", status: "Info" },
];

const healthItems = [
    { label: "Authentication API", value: "Operational" },
    { label: "Users Service", value: "Operational" },
    { label: "Groups Service", value: "Operational" },
    { label: "Reports Worker", value: "Queued" },
];

export default function AdminDashboardPage() {
    return (
        <div className="grid gap-6">
            <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <p className="panel-tag">Admin Console</p>
                    <h2 className="headline mt-2 text-2xl text-(--ib-ink) sm:text-3xl">Admin Overview</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-(--ib-muted)">
                        Manage users, groups, reports, security, and platform performance from one operational workspace.
                    </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                    <Link href="/dashboard/admin/users" className="ib-btn-secondary justify-center">
                        <UserPlus size={16} />
                        Create User
                    </Link>
                    <Link href="/dashboard/admin/organizations/create" className="ib-btn-primary justify-center">
                        <Building2 size={16} />
                        Register Group
                    </Link>
                </div>
            </header>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {overviewStats.map((stat) => (
                    <article key={stat.label} className="rounded-xl border border-(--ib-line) bg-white p-5 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-sm font-semibold text-(--ib-muted)">{stat.label}</p>
                                <p className="mt-2 text-3xl font-bold text-(--ib-ink)">{stat.value}</p>
                            </div>
                            <span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-(--ib-accent)">
                                <stat.icon size={20} />
                            </span>
                        </div>
                        <p className="mt-3 text-xs font-semibold text-emerald-700">{stat.trend}</p>
                    </article>
                ))}
            </section>

            <section className="grid gap-4 lg:grid-cols-5">
                {adminModules.map((module) => (
                    <Link
                        key={module.href}
                        href={module.href}
                        className="rounded-xl border border-(--ib-line) bg-white p-5 shadow-sm transition-colors hover:bg-[#f8fbff]"
                    >
                        <span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-(--ib-accent)">
                            <module.icon size={20} />
                        </span>
                        <h3 className="mt-4 font-bold text-(--ib-ink)">{module.title}</h3>
                        <p className="mt-2 min-h-16 text-sm leading-6 text-(--ib-muted)">{module.description}</p>
                        <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-(--ib-accent)">
                            Open
                            <ArrowRight size={15} />
                        </span>
                    </Link>
                ))}
            </section>

            <section className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
                <article className="rounded-xl border border-(--ib-line) bg-white shadow-sm">
                    <div className="flex items-center justify-between gap-3 border-b border-(--ib-line) p-5">
                        <div>
                            <h3 className="headline text-xl text-(--ib-ink)">Recent Activity</h3>
                            <p className="mt-1 text-sm text-(--ib-muted)">Administrative actions and system events.</p>
                        </div>
                        <Link href="/dashboard/admin/reports" className="text-sm font-bold text-(--ib-accent) hover:underline">
                            View reports
                        </Link>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[640px] text-left text-sm">
                            <thead className="bg-gray-50 text-xs uppercase text-[#375176]/70">
                                <tr>
                                    <th className="px-5 py-3">Action</th>
                                    <th className="px-5 py-3">Target</th>
                                    <th className="px-5 py-3">Time</th>
                                    <th className="px-5 py-3">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-(--ib-line)">
                                {recentActivity.map((item) => (
                                    <tr key={`${item.action}-${item.time}`}>
                                        <td className="px-5 py-4 font-semibold text-(--ib-ink)">{item.action}</td>
                                        <td className="px-5 py-4 text-(--ib-muted)">{item.target}</td>
                                        <td className="px-5 py-4 text-(--ib-muted)">{item.time}</td>
                                        <td className="px-5 py-4">
                                            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                                                item.status === "Success"
                                                    ? "bg-emerald-50 text-emerald-700"
                                                    : item.status === "Warning"
                                                      ? "bg-amber-50 text-amber-700"
                                                      : "bg-blue-50 text-blue-700"
                                            }`}>
                                                {item.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </article>

                <article className="rounded-xl border border-(--ib-line) bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-(--ib-accent)">
                            <Activity size={20} />
                        </span>
                        <div>
                            <h3 className="headline text-xl text-(--ib-ink)">System Health</h3>
                            <p className="text-sm text-(--ib-muted)">Live operational summary</p>
                        </div>
                    </div>
                    <div className="mt-5 grid gap-3">
                        {healthItems.map((item) => (
                            <div key={item.label} className="flex items-center justify-between gap-3 rounded-xl bg-[#f4f7fc] px-4 py-3">
                                <span className="text-sm font-semibold text-(--ib-muted)">{item.label}</span>
                                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                                    item.value === "Operational"
                                        ? "bg-emerald-50 text-emerald-700"
                                        : "bg-amber-50 text-amber-700"
                                }`}>
                                    {item.value}
                                </span>
                            </div>
                        ))}
                    </div>
                    <Link href="/dashboard/admin/performance" className="ib-btn-secondary mt-5 w-full justify-center">
                        View Performance
                    </Link>
                </article>
            </section>
        </div>
    );
}
