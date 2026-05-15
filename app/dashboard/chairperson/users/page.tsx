"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Pencil, RefreshCw, Search, ShieldCheck, UserPlus } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useChangeMembershipRoleMutation, useLazyGetGroupMembersQuery } from "@/api/group";
import { useUpdateUserMutation } from "@/api/users";
import { Dropdown, Input } from "@/components/ui";
import Modal from "@/components/ui/modal";
import type { User, UserStatus } from "@/types";

type RoleKey = "chairperson" | "secretary" | "finance" | "member";

interface FlatMember extends User {
    computedRole: RoleKey;
}

const roleFilterOptions = [
    { label: "All roles", value: "all" },
    { label: "Chairperson", value: "chairperson" },
    { label: "Secretary", value: "secretary" },
    { label: "Finance", value: "finance" },
    { label: "Member", value: "member" },
];

const changeableRoleOptions = [
    { label: "Member", value: "member" },
    { label: "Secretary", value: "secretary" },
    { label: "Finance", value: "finance" },
];

const roleBadge: Record<RoleKey, string> = {
    chairperson: "bg-purple-50 text-purple-700",
    secretary: "bg-blue-50 text-blue-700",
    finance: "bg-amber-50 text-amber-700",
    member: "bg-slate-100 text-slate-600",
};

function titleCase(value: string) {
    return value.charAt(0).toUpperCase() + value.slice(1);
}

function initials(u: User) {
    return [u.firstName?.[0] ?? "", u.lastName?.[0] ?? ""].join("").toUpperCase();
}

function formatDate(value?: string | Date | null) {
    if (!value) return "—";
    const d = new Date(value as string);
    if (Number.isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(d);
}

export default function ChairpersonUsersPage() {
    const { user } = useAuth();
    const groupId = user?.groupId ?? user?.group?.id ?? "";

    const [fetchMembers, { data: membersData, isLoading, isFetching }] = useLazyGetGroupMembersQuery();
    const [changeRole, { isLoading: isChangingRole }] = useChangeMembershipRoleMutation();

    const [query, setQuery] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [pendingRoles, setPendingRoles] = useState<Record<string, string>>({});
    const [changingUserId, setChangingUserId] = useState<string | null>(null);

    const [updateUser, { isLoading: isSavingEdit }] = useUpdateUserMutation();
    const [editingMember, setEditingMember] = useState<FlatMember | null>(null);
    const [editForm, setEditForm] = useState<{ firstName: string; lastName: string; email: string; phone: string; status: UserStatus }>(
        { firstName: "", lastName: "", email: "", phone: "", status: "active" },
    );

    function openEdit(member: FlatMember) {
        setEditForm({
            firstName: member.firstName,
            lastName: member.lastName,
            email: member.email,
            phone: member.phone ?? "",
            status: member.status as UserStatus,
        });
        setEditingMember(member);
    }

    async function handleSaveEdit() {
        try {
            if (!editingMember) return;
            await updateUser({ userId: editingMember.id, data: editForm }).unwrap();
            setEditingMember(null);
            if (groupId) fetchMembers({ groupId });
        } catch (error) {
        console.error("Failed to update user:", error);
        } 
       
    }

    useEffect(() => {
        if (groupId) fetchMembers({ groupId });
    }, [fetchMembers, groupId]);

    const raw = membersData?.data;

    const allMembers: FlatMember[] = raw
        ? [
            ...(raw.chairperson ?? []).map((u) => ({ ...u, computedRole: "chairperson" as RoleKey })),
            ...(raw.secretary ?? []).map((u) => ({ ...u, computedRole: "secretary" as RoleKey })),
            ...(raw.finance ?? []).map((u) => ({ ...u, computedRole: "finance" as RoleKey })),
            ...(raw.member ?? []).map((u) => ({ ...u, computedRole: "member" as RoleKey })),
        ]
        : [];

    const filtered = allMembers.filter((m) => {
        const matchesRole = roleFilter === "all" || m.computedRole === roleFilter;
        const matchesQuery = [m.firstName, m.lastName, m.email, m.phone, m.user_code]
            .join(" ")
            .toLowerCase()
            .includes(query.toLowerCase());
        return matchesRole && matchesQuery;
    });

    async function handleRoleChange(memberId: string) {
        const newRole = pendingRoles[memberId];
        if (!newRole || !groupId) return;
        setChangingUserId(memberId);
        try {
            await changeRole({ groupId, userId: memberId, newRole }).unwrap();
            fetchMembers({ groupId });
        } finally {
            setChangingUserId(null);
            setPendingRoles((prev) => {
                const next = { ...prev };
                delete next[memberId];
                return next;
            });
        }
    }

    const memberEditDesc = editingMember
        ? `${editingMember.firstName} ${editingMember.lastName} · ${editingMember.user_code || editingMember.email}`
        : undefined;

    const countStats = [
        { label: "Chairperson", count: raw?.chairperson?.length ?? 0, cls: "text-purple-700" },
        { label: "Secretary", count: raw?.secretary?.length ?? 0, cls: "text-blue-700" },
        { label: "Finance", count: raw?.finance?.length ?? 0, cls: "text-amber-700" },
        { label: "Members", count: raw?.member?.length ?? 0, cls: "text-slate-600" },
    ];

    return (
        <>
            <div className="grid gap-6">
                <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="panel-tag">Group Operations</p>
                        <h2 className="headline mt-2 text-2xl text-(--ib-ink) sm:text-3xl">Group Users</h2>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-(--ib-muted)">
                            View and manage all members, roles, statuses, and contact details for your group.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => groupId && fetchMembers({ groupId })}
                            disabled={isFetching}
                            className="ib-btn-secondary"
                        >
                            <RefreshCw size={15} className={isFetching ? "animate-spin" : ""} />
                            Refresh
                        </button>
                        <Link href="/dashboard/chairperson/members/create" className="ib-btn-primary">
                            <UserPlus size={16} />
                            Add Member
                        </Link>
                    </div>
                </header>

                {/* Role counts */}
                <section className="grid gap-3 sm:grid-cols-4">
                    {countStats.map((s) => (
                        <div key={s.label} className="rounded-xl border border-(--ib-line) bg-white p-4 text-center shadow-sm">
                            <p className={`text-2xl font-bold ${s.cls}`}>{isLoading ? "…" : s.count}</p>
                            <p className="mt-1 text-xs font-semibold text-(--ib-muted)">{s.label}</p>
                        </div>
                    ))}
                </section>

                {/* Members table */}
                <section className="rounded-xl border border-(--ib-line) bg-white shadow-sm">
                    <div className="grid gap-3 border-b border-(--ib-line) p-4 md:grid-cols-[1fr_220px]">
                        <Input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search by name, email, phone, or code"
                            leftIcon={Search}
                        />
                        <Dropdown value={roleFilter} onValueChange={setRoleFilter} options={roleFilterOptions} />
                    </div>

                    {isLoading && (
                        <p className="px-5 py-12 text-center text-sm text-(--ib-muted)">Loading members…</p>
                    )}

                    {!isLoading && filtered.length === 0 && (
                        <p className="px-5 py-12 text-center text-sm text-(--ib-muted)">No members found.</p>
                    )}

                    {!isLoading && filtered.length > 0 && (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[960px] text-left text-sm">
                                <thead className="bg-gray-50 text-xs uppercase text-[#375176]/70">
                                    <tr>
                                        <th className="px-5 py-3">Member</th>
                                        <th className="px-5 py-3">Role</th>
                                        <th className="px-5 py-3">Status</th>
                                        <th className="px-5 py-3">Joined</th>
                                        <th className="px-5 py-3 ">Change Role</th>
                                        <th className="px-5 py-3 ">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-(--ib-line)">
                                    {filtered.map((member) => {
                                        const pending = pendingRoles[member.id];
                                        const isApplying = changingUserId === member.id;
                                        return (
                                            <tr key={member.id} className="hover:bg-gray-50/50">
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#0b3978] text-xs font-bold text-white">
                                                            {initials(member)}
                                                        </span>
                                                        <div>
                                                            <p className="font-semibold text-(--ib-ink)">
                                                                {member.firstName} {member.lastName}
                                                            </p>
                                                            <p className="text-xs text-(--ib-muted)">{member.email}</p>
                                                            <p className="text-xs text-(--ib-muted)">{member?.phone}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                {/* <td className="px-5 py-4 font-mono text-xs text-(--ib-muted)">
                                                    {member.user_code || "—"}
                                                </td> */}
                                                <td className="px-5 py-4">
                                                    <span
                                                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${roleBadge[member.computedRole]}`}
                                                    >
                                                        {titleCase(member.computedRole)}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span
                                                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${member.status === "active"
                                                            ? "bg-emerald-50 text-emerald-700"
                                                            : member.status === "suspended"
                                                                ? "bg-red-50 text-red-700"
                                                                : "bg-amber-50 text-amber-700"
                                                            }`}
                                                    >
                                                        {titleCase(member.status)}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 text-(--ib-muted)">
                                                    {formatDate(member.createdAt as unknown as string)}
                                                </td>
                                                <td className="px-5 py-4 ">
                                                    {member.computedRole !== "chairperson" ? (
                                                        <div className="flex items-center gap-2 ">
                                                            <Dropdown
                                                                value={pending ?? member.computedRole}
                                                                onValueChange={(val) =>
                                                                    setPendingRoles((prev) => ({ ...prev, [member.id]: val }))
                                                                }
                                                                options={changeableRoleOptions}
                                                                className="w-50"
                                                            />
                                                            {pending && pending !== member.computedRole && (
                                                                <button
                                                                    onClick={() => handleRoleChange(member.id)}
                                                                    disabled={isApplying || isChangingRole}
                                                                    className="ib-btn-primary h-9 px-3 text-xs"
                                                                >
                                                                    {isApplying ? "…" : "Apply"}
                                                                </button>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="flex items-center gap-1.5 text-xs font-semibold text-(--ib-muted)">
                                                            <ShieldCheck size={13} />
                                                            Owner
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <button
                                                        onClick={() => openEdit(member)}
                                                        className="grid h-9 w-9 place-items-center rounded-lg border border-(--ib-line) text-(--ib-muted) hover:bg-[#f4f7fc] hover:text-(--ib-accent)"
                                                        title="Edit member"
                                                    >
                                                        <Pencil size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>

            {/* Edit member modal */}
            <Modal
                isOpen={!!editingMember}
                onClose={() => setEditingMember(null)}
                title="Edit Member"
                description={memberEditDesc}
            >
                <div className="grid gap-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-1.5">
                            <label className="text-xs font-bold uppercase tracking-wide text-(--ib-muted)">First Name</label>
                            <Input
                                value={editForm.firstName}
                                onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))}
                                placeholder="First name"
                            />
                        </div>
                        <div className="grid gap-1.5">
                            <label className="text-xs font-bold uppercase tracking-wide text-(--ib-muted)">Last Name</label>
                            <Input
                                value={editForm.lastName}
                                onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))}
                                placeholder="Last name"
                            />
                        </div>
                    </div>
                    <div className="grid gap-1.5">
                        <label className="text-xs font-bold uppercase tracking-wide text-(--ib-muted)">Email</label>
                        <Input
                            value={editForm.email}
                            onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                            placeholder="Email address"
                            type="email"
                        />
                    </div>
                    <div className="grid gap-1.5">
                        <label className="text-xs font-bold uppercase tracking-wide text-(--ib-muted)">Phone</label>
                        <Input
                            value={editForm.phone}
                            onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                            placeholder="Phone number"
                        />
                    </div>
                    <div className="grid gap-1.5">
                        <label className="text-xs font-bold uppercase tracking-wide text-(--ib-muted)">Status</label>
                        <Dropdown
                            value={editForm.status}
                            onValueChange={(val) => setEditForm((f) => ({ ...f, status: val as UserStatus }))}
                            options={[
                                { label: "Active", value: "active" },
                                { label: "Inactive", value: "inactive" },
                                { label: "Suspended", value: "suspended" },
                            ]}
                        />
                    </div>
                    <div className="flex justify-end gap-2 border-t border-(--ib-line) pt-4">
                        <button onClick={() => setEditingMember(null)} className="ib-btn-secondary">
                            Cancel
                        </button>
                        <button onClick={handleSaveEdit} disabled={isSavingEdit} className="ib-btn-primary">
                            {isSavingEdit ? "Saving…" : "Save Changes"}
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
}
