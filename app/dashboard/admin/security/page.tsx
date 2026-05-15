import { AlertTriangle, CheckCircle2, KeyRound, LockKeyhole, ShieldCheck, UserX } from "lucide-react";

const securityMetrics = [
    { label: "Security Score", value: "94%", detail: "Healthy access posture", icon: ShieldCheck },
    { label: "Failed Logins", value: "12", detail: "Last 24 hours", icon: UserX },
    { label: "Open Alerts", value: "2", detail: "Need review", icon: AlertTriangle },
    { label: "Verified Admins", value: "8/9", detail: "Email verification", icon: CheckCircle2 },
];

const alerts = [
    { title: "Repeated failed login", source: "Unknown IP", severity: "High", time: "45 mins ago" },
    { title: "Admin email not verified", source: "operations@ibibina.rw", severity: "Medium", time: "2 hours ago" },
    { title: "Password reset requested", source: "Jean Pierre", severity: "Low", time: "Today, 08:12" },
];

const policies = [
    { label: "Admin email verification", status: "Enabled", detail: "Admins must verify email before login." },
    { label: "Non-admin PIN access", status: "Enabled", detail: "Chairpersons, finance, secretary, and members use PIN access." },
    { label: "Refresh token rotation", status: "Active", detail: "Expired sessions are cleared during refresh failure." },
    { label: "Role-based dashboards", status: "Active", detail: "Admin routes redirect non-admin accounts." },
];

export default function AdminSecurityPage() {
    return (
        <div className="grid gap-6">
            <header>
                <p className="panel-tag">System</p>
                <h2 className="headline mt-2 text-2xl text-(--ib-ink) sm:text-3xl">System Security</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-(--ib-muted)">
                    Monitor access controls, suspicious sign-in activity, verification coverage, and account protection.
                </p>
            </header>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {securityMetrics.map((metric) => (
                    <article key={metric.label} className="rounded-xl border border-(--ib-line) bg-white p-5 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-sm font-semibold text-(--ib-muted)">{metric.label}</p>
                                <p className="mt-2 text-3xl font-bold text-(--ib-ink)">{metric.value}</p>
                            </div>
                            <span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-(--ib-accent)">
                                <metric.icon size={20} />
                            </span>
                        </div>
                        <p className="mt-3 text-xs text-(--ib-muted)">{metric.detail}</p>
                    </article>
                ))}
            </section>

            <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
                <article className="rounded-xl border border-(--ib-line) bg-white shadow-sm">
                    <div className="border-b border-(--ib-line) p-5">
                        <h3 className="headline text-xl text-(--ib-ink)">Security Alerts</h3>
                    </div>
                    <div className="divide-y divide-(--ib-line)">
                        {alerts.map((alert) => (
                            <div key={alert.title} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="font-bold text-(--ib-ink)">{alert.title}</p>
                                    <p className="mt-1 text-sm text-(--ib-muted)">{alert.source} - {alert.time}</p>
                                </div>
                                <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-bold ${
                                    alert.severity === "High"
                                        ? "bg-rose-50 text-rose-700"
                                        : alert.severity === "Medium"
                                          ? "bg-amber-50 text-amber-700"
                                          : "bg-blue-50 text-blue-700"
                                }`}>
                                    {alert.severity}
                                </span>
                            </div>
                        ))}
                    </div>
                </article>

                <article className="rounded-xl border border-(--ib-line) bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-(--ib-accent)">
                            <LockKeyhole size={20} />
                        </span>
                        <div>
                            <h3 className="headline text-xl text-(--ib-ink)">Access Policies</h3>
                            <p className="text-sm text-(--ib-muted)">Current enforcement state</p>
                        </div>
                    </div>
                    <div className="mt-5 grid gap-3">
                        {policies.map((policy) => (
                            <div key={policy.label} className="rounded-xl border border-(--ib-line) p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="font-bold text-(--ib-ink)">{policy.label}</p>
                                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                                        {policy.status}
                                    </span>
                                </div>
                                <p className="mt-2 text-sm text-(--ib-muted)">{policy.detail}</p>
                            </div>
                        ))}
                    </div>
                </article>
            </section>

            <section className="rounded-xl border border-(--ib-line) bg-white p-5 shadow-sm">
                <h3 className="font-bold text-(--ib-ink)">Recommended Actions</h3>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {["Verify remaining admin email", "Review failed login IPs", "Rotate stale refresh tokens"].map((action) => (
                        <div key={action} className="flex items-center gap-3 rounded-xl bg-[#f4f7fc] px-4 py-3 text-sm font-semibold text-(--ib-muted)">
                            <KeyRound size={16} className="text-(--ib-accent)" />
                            {action}
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
