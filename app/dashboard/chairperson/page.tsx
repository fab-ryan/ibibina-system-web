"use client";

import Link from "next/link";
import { useEffect } from "react";
import {
    ArrowRight,
    Banknote,
    CalendarDays,
    CircleDollarSign,
    ClipboardList,
    MapPin,
    Phone,
    Settings,
    ShieldCheck,
    UserPlus,
    Users,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useLazyGetGroupMembersQuery, useLazyGetGroupByIdQuery } from "@/api/group";

const workflows = [
    {
        title: "Group Users",
        description: "Review members, finance officers, secretaries, and chairperson team assignments.",
        href: "/dashboard/chairperson/users",
        icon: Users,
    },
    {
        title: "Add Member or Finance",
        description: "Register new members and assign finance roles inside your group.",
        href: "/dashboard/chairperson/members/create",
        icon: UserPlus,
    },
    {
        title: "Group Settings",
        description: "Update contribution rules, meeting day, loan policy, and group profile details.",
        href: "/dashboard/chairperson/settings",
        icon: Settings,
    },
    {
        title: "Loan Requests",
        description: "Review pending loan applications and approve or deny with a decision note.",
        href: "/dashboard/chairperson/loans",
        icon: ClipboardList,
    },
];

function titleCase(value: string) {
    return value
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

function formatDate(value?: string | null) {
    if (!value) return "Not set";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Not set";
    return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export default function ChairpersonDashboardPage() {
    const { user } = useAuth();

    const [fetchGroup, { data: groupData, isLoading: isLoadingGroup }] = useLazyGetGroupByIdQuery();
    const [fetchMembers, { data: membersData, isLoading: isLoadingMembers }] = useLazyGetGroupMembersQuery()

    const groupId = user?.groupId ?? user?.group?.id;

    useEffect(() => {
        if (groupId) {
            fetchGroup(groupId);
            fetchMembers({ groupId });
        }
    }, [fetchGroup, fetchMembers, groupId]);

    const group = groupData?.data;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const settings = group?.settings as any;
    const memberCount = membersData?.data ? Object.values(membersData.data).reduce((sum, roleGroup) => sum + roleGroup.length, 0) : null;

    const stats = [
        {
            label: "Group Members",
            value: isLoadingMembers ? "..." : memberCount != null ? String(memberCount) : "—",
            detail: settings?.memberLimit ? `Limit: ${settings.memberLimit}` : "No limit set",
            icon: Users,
        },
        {
            label: "Contribution",
            value: isLoadingGroup ? "..." : group
                ? `${group.settings.contributionAmount.toLocaleString()} ${group.settings.contributionCurrency}`
                : "—",
            detail: group ? titleCase(group.settings.contributionFrequency) : "",
            icon: Banknote,
        },
        {
            label: "Meeting Day",
            value: isLoadingGroup ? "..." : group ? titleCase(group.settings.meetingDay) : "—",
            detail: group?.meetingLocation || "Location not set",
            icon: CalendarDays,
        },
        {
            label: "Loans",
            value: isLoadingGroup ? "..." : group ? (group.settings.allowLoans ? "Allowed" : "Disabled") : "—",
            detail: group?.settings?.allowLoans
                ? `Multiplier: ${group.settings.maxLoanMultiplier}×`
                : "Loans are disabled",
            icon: CircleDollarSign,
        },
    ];

    const locationParts = [group?.province, group?.district, group?.sector].filter(Boolean);

    return (
        <div className="grid gap-6">
            <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <p className="panel-tag">Chairperson Console</p>
                    <h2 className="headline mt-2 text-2xl text-(--ib-ink) sm:text-3xl">
                        {isLoadingGroup ? "Loading..." : group ? group.name : "Group Dashboard"}
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-(--ib-muted)">
                        Manage your group members, contributions, loan approvals, finance reports, and meeting operations.
                    </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                    <Link href="/dashboard/chairperson/members/create" className="ib-btn-secondary justify-center">
                        <UserPlus size={16} />
                        Add Member
                    </Link>
                    <Link href="/dashboard/chairperson/loans" className="ib-btn-primary justify-center">
                        <ClipboardList size={16} />
                        Review Loans
                    </Link>
                </div>
            </header>

            {/* Group profile card */}
            {isLoadingGroup && (
                <div className="rounded-xl border border-(--ib-line) bg-white p-8 text-center text-sm text-(--ib-muted) shadow-sm">
                    Loading group details...
                </div>
            )}

            {!isLoadingGroup && group && (
                <section className="rounded-xl border border-(--ib-line) bg-white shadow-sm">
                    <div className="flex flex-col gap-3 border-b border-(--ib-line) p-5 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <div className="flex flex-wrap items-center gap-3">
                                <h3 className="headline text-xl text-(--ib-ink)">{group.name}</h3>
                                <span
                                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${group.isActive
                                        ? "bg-emerald-50 text-emerald-700"
                                        : "bg-slate-100 text-slate-600"
                                        }`}
                                >
                                    {group.isActive ? "Active" : "Inactive"}
                                </span>
                            </div>
                            <p className="mt-1 text-sm text-(--ib-muted)">{group.description || "No description provided."}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-(--ib-accent)">
                            {group.groupe_code || "No code"}
                        </span>
                    </div>

                    <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                            { Icon: ShieldCheck, label: "Purpose", value: titleCase(group.purpose || "other") },
                            {
                                Icon: MapPin,
                                label: "Location",
                                value: locationParts.length ? locationParts.join(", ") : "Not set",
                            },
                            { Icon: Phone, label: "Contact", value: group.contactPhone || "Not set" },
                            { Icon: CalendarDays, label: "Founded", value: formatDate(group.startDate as string | null) },
                        ].map(({ Icon, label, value }) => (
                            <div key={label} className="rounded-xl border border-(--ib-line) bg-[#f8fbff] p-3">
                                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#375176]/70">
                                    <Icon size={13} />
                                    {label}
                                </p>
                                <p className="mt-2 text-sm font-semibold text-(--ib-ink)">{value}</p>
                            </div>
                        ))}
                    </div>

                    {(group.province || group.district || group.sector || group.cell || group.village) && (
                        <div className="flex flex-wrap gap-x-6 gap-y-1 border-t border-(--ib-line) px-5 py-4 text-sm text-(--ib-muted)">
                            {[
                                ["Province", group.province],
                                ["District", group.district],
                                ["Sector", group.sector],
                                ["Cell", group.cell],
                                ["Village", group.village],
                            ].filter(([, v]) => Boolean(v)).map(([label, value]) => (
                                <span key={label}>
                                    <span className="font-semibold text-(--ib-ink)">{label}:</span> {value}
                                </span>
                            ))}
                        </div>
                    )}
                </section>
            )}

            {/* Stats */}
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {stats.map((stat) => (
                    <article key={stat.label} className="rounded-xl border border-(--ib-line) bg-white p-5 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-sm font-semibold text-(--ib-muted)">{stat.label}</p>
                                <p className="mt-2 text-2xl font-bold text-(--ib-ink)">{stat.value}</p>
                            </div>
                            <span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-(--ib-accent)">
                                <stat.icon size={20} />
                            </span>
                        </div>
                        <p className="mt-3 text-xs font-semibold text-emerald-700">{stat.detail}</p>
                    </article>
                ))}
            </section>

            {/* Contribution + Loan rules */}
            {group && (
                <section className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-xl border border-(--ib-line) bg-white p-5 shadow-sm">
                        <h4 className="flex items-center gap-2 font-bold text-(--ib-ink)">
                            <Banknote size={16} />
                            Contribution Rules
                        </h4>
                        <div className="mt-4 grid gap-2 text-sm text-(--ib-muted)">
                            <p>
                                Amount:{" "}
                                <strong className="text-(--ib-ink)">
                                    {group.settings.contributionAmount.toLocaleString()} {group.settings.contributionCurrency}
                                </strong>
                            </p>
                            <p>
                                Frequency:{" "}
                                <strong className="text-(--ib-ink)">{titleCase(group.settings.contributionFrequency)}</strong>
                            </p>
                            <p>
                                Meeting day:{" "}
                                <strong className="text-(--ib-ink)">{titleCase(group.settings.meetingDay)}</strong>
                            </p>
                            <p>
                                Grace period:{" "}
                                <strong className="text-(--ib-ink)">{group.settings.gracePeriodDays} days</strong>
                            </p>
                            <p>
                                Penalty rate:{" "}
                                <strong className="text-(--ib-ink)">
                                    {((group.settings.penaltyRate ?? 0) * 100).toFixed(1)}%
                                </strong>
                            </p>
                            {settings?.memberLimit && (
                                <p>
                                    Member limit:{" "}
                                    <strong className="text-(--ib-ink)">{settings.memberLimit}</strong>
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="rounded-xl border border-(--ib-line) bg-white p-5 shadow-sm">
                        <h4 className="flex items-center gap-2 font-bold text-(--ib-ink)">
                            <CircleDollarSign size={16} />
                            Loan Policy
                        </h4>
                        {group.settings.allowLoans && group.settings.loanSettings ? (
                            <div className="mt-4 grid gap-2 text-sm text-(--ib-muted)">
                                <p>
                                    Status: <strong className="text-emerald-700">Loans enabled</strong>
                                </p>
                                <p>
                                    Max multiplier:{" "}
                                    <strong className="text-(--ib-ink)">{group.settings.maxLoanMultiplier}×</strong>
                                </p>
                                <p>
                                    Interest rate:{" "}
                                    <strong className="text-(--ib-ink)">
                                        {(group.settings.loanSettings.interestRate * 100).toFixed(1)}%
                                    </strong>
                                </p>
                                <p>
                                    Max duration:{" "}
                                    <strong className="text-(--ib-ink)">
                                        {group.settings.loanSettings.maxDurationMonths} months
                                    </strong>
                                </p>
                                <p>
                                    Collateral:{" "}
                                    <strong className="text-(--ib-ink)">
                                        {group.settings.loanSettings.collateralRequired ? "Required" : "Not required"}
                                    </strong>
                                </p>
                                {group.settings.loanSettings.minContributionsForLoan != null && (
                                    <p>
                                        Min contributions before loan:{" "}
                                        <strong className="text-(--ib-ink)">
                                            {group.settings.loanSettings.minContributionsForLoan}
                                        </strong>
                                    </p>
                                )}
                            </div>
                        ) : (
                            <p className="mt-4 text-sm text-(--ib-muted)">Loans are currently disabled for this group.</p>
                        )}
                    </div>
                </section>
            )}

            {/* Quick-access workflows */}
            <section className="grid gap-4 lg:grid-cols-4">
                {workflows.map((workflow) => (
                    <Link
                        key={workflow.href}
                        href={workflow.href}
                        className="rounded-xl border border-(--ib-line) bg-white p-5 shadow-sm hover:bg-[#f8fbff]"
                    >
                        <span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-(--ib-accent)">
                            <workflow.icon size={20} />
                        </span>
                        <h3 className="mt-4 font-bold text-(--ib-ink)">{workflow.title}</h3>
                        <p className="mt-2 min-h-20 text-sm leading-6 text-(--ib-muted)">{workflow.description}</p>
                        <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-(--ib-accent)">
                            Open
                            <ArrowRight size={15} />
                        </span>
                    </Link>
                ))}
            </section>
        </div>
    );
}




