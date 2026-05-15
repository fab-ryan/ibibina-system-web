import { Activity, Clock3, Cpu, Database, Gauge, Server, Wifi } from "lucide-react";

const performanceMetrics = [
    { label: "API Latency", value: "124ms", detail: "p95 over last hour", icon: Clock3, tone: "good" },
    { label: "Server Load", value: "42%", detail: "Application nodes", icon: Cpu, tone: "good" },
    { label: "Database Health", value: "98%", detail: "Query success rate", icon: Database, tone: "good" },
    { label: "Uptime", value: "99.98%", detail: "Last 30 days", icon: Wifi, tone: "good" },
];

const serviceRows = [
    { service: "Authentication API", status: "Operational", latency: "118ms", load: "38%" },
    { service: "Users Service", status: "Operational", latency: "132ms", load: "44%" },
    { service: "Groups Service", status: "Operational", latency: "126ms", load: "41%" },
    { service: "Reports Worker", status: "Queued", latency: "420ms", load: "71%" },
];

const capacityRows = [
    { label: "CPU", value: "42%", width: "42%" },
    { label: "Memory", value: "61%", width: "61%" },
    { label: "Database Connections", value: "54%", width: "54%" },
    { label: "Storage", value: "36%", width: "36%" },
];

export default function AdminPerformancePage() {
    return (
        <div className="grid gap-6">
            <header>
                <p className="panel-tag">System</p>
                <h2 className="headline mt-2 text-2xl text-(--ib-ink) sm:text-3xl">System Performance</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-(--ib-muted)">
                    Track application responsiveness, service status, server capacity, and operational health.
                </p>
            </header>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {performanceMetrics.map((metric) => (
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

            <section className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
                <article className="rounded-xl border border-(--ib-line) bg-white shadow-sm">
                    <div className="flex items-center justify-between gap-3 border-b border-(--ib-line) p-5">
                        <div>
                            <h3 className="headline text-xl text-(--ib-ink)">Service Status</h3>
                            <p className="mt-1 text-sm text-(--ib-muted)">Current operational view</p>
                        </div>
                        <Server className="text-(--ib-accent)" size={22} />
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[640px] text-left text-sm">
                            <thead className="bg-gray-50 text-xs uppercase text-[#375176]/70">
                                <tr>
                                    <th className="px-5 py-3">Service</th>
                                    <th className="px-5 py-3">Status</th>
                                    <th className="px-5 py-3">Latency</th>
                                    <th className="px-5 py-3">Load</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-(--ib-line)">
                                {serviceRows.map((row) => (
                                    <tr key={row.service}>
                                        <td className="px-5 py-4 font-semibold text-(--ib-ink)">{row.service}</td>
                                        <td className="px-5 py-4">
                                            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                                                row.status === "Operational"
                                                    ? "bg-emerald-50 text-emerald-700"
                                                    : "bg-amber-50 text-amber-700"
                                            }`}>
                                                {row.status}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-(--ib-muted)">{row.latency}</td>
                                        <td className="px-5 py-4 text-(--ib-muted)">{row.load}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </article>

                <article className="rounded-xl border border-(--ib-line) bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-(--ib-accent)">
                            <Gauge size={20} />
                        </span>
                        <div>
                            <h3 className="headline text-xl text-(--ib-ink)">Capacity</h3>
                            <p className="text-sm text-(--ib-muted)">Infrastructure utilization</p>
                        </div>
                    </div>
                    <div className="mt-5 grid gap-5">
                        {capacityRows.map((row) => (
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
            </section>

            <section className="rounded-xl border border-(--ib-line) bg-gradient-to-br from-(--ib-accent) to-[#0a2e61] p-5 text-white shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h3 className="text-lg font-bold">Performance Summary</h3>
                        <p className="mt-1 text-sm text-blue-100">Core services are healthy. Reports worker queue is the only elevated resource.</p>
                    </div>
                    <div className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold">
                        <Activity size={18} />
                        Monitoring active
                    </div>
                </div>
            </section>
        </div>
    );
}
