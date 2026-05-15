/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
    Building2,
    CalendarDays,
    CheckCircle2,
    CircleDollarSign,
    Eye,
    FileText,
    MapPin,
    Phone,
    Plus,
    Search,
    ShieldCheck,
    Upload,
    UserPlus,
    Users,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { Dropdown, Input, Modal, Pagination } from "@/components/ui";
import { useEffect, useMemo, useState } from "react";
import { useAssignChairpersonMutation, useChangeMembershipRoleMutation, useCreateGroupMutation, useLazyGetGroupsQuery, useUpdateGroupMutation } from "@/api/group";
import { useLazyGetUsersQuery, useCreateUserMutation, useUpdateUserMutation } from "@/api/users";
import { Group, User, UserRole } from "@/types";
import { useToast } from "@/contexts/toast-context";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { Controller, Resolver, useForm } from "react-hook-form";
import GroupForm, { defaultGroupValues, type GroupFormValues, toGroupPayload } from "@/components/dashboard/group-form";

type GroupPurpose =
    | "savings"
    | "netgrowth"
    | "investment"
    | "social-support"
    | "agriculture"
    | "other";

type GroupSettings = {
    contributionAmount: number;
    contributionCurrency: string;
    contributionFrequency: "weekly" | "monthly";
    meetingDay: "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
    allowLoans: boolean;
    maxLoanMultiplier: number;
    gracePeriodDays: number;
    penaltyRate?: number;
    memberLimit?: number;
    loanSettings?: {
        interestRate: number;
        maxDurationMonths: number;
        collateralRequired: boolean;
        collateralTypes?: string[];
        maxLoanMultiplier: number;
        minContributionsForLoan?: number;
    };
    additional?: Record<string, string | number | boolean>;
};

type RegisteredGroup = {
    id: string;
    name: string;
    groupe_code?: string;
    purpose: GroupPurpose;
    startDate?: string;
    description?: string;
    province?: string;
    district?: string;
    sector?: string;
    cell?: string;
    village?: string;
    meetingLocation?: string;
    contactPhone?: string;
    foundedBy?: string;
    registrationNumber?: string;
    notes?: string;
    isActive: boolean;
    settings: GroupSettings;
    createdAt: string;
    updatedAt: string;
};

type CreateGroupForm = {
    name: string;
    purpose: GroupPurpose;
    contactPhone: string;
    startDate: string;
    province: string;
    district: string;
    sector: string;
    meetingLocation: string;
    description: string;
};

const createGroupSchema = yup.object({
    name: yup.string().trim().required("Group name is required."),
    purpose: yup
        .mixed<GroupPurpose>()
        .oneOf(["savings", "netgrowth", "investment", "social-support", "agriculture", "other"])
        .required("Theme is required."),
    contactPhone: yup
        .string()
        .default("")
        .test("rw-phone", "Enter a valid Rwandan phone number.", (value) => {
            if (!value) return true;
            return /^(?:\+250|0)?7[2389]\d{7}$/.test(value);
        }),
    startDate: yup.string().default(""),
    province: yup.string().default(""),
    district: yup.string().default(""),
    sector: yup.string().default(""),
    meetingLocation: yup.string().default(""),
    description: yup.string().default(""),
});

const defaultCreateGroupValues: CreateGroupForm = {
    name: "",
    purpose: "savings",
    contactPhone: "",
    startDate: "",
    province: "",
    district: "",
    sector: "",
    meetingLocation: "",
    description: "",
};

const defaultSettings: GroupSettings = {
    contributionAmount: 1000,
    contributionCurrency: "RWF",
    contributionFrequency: "weekly",
    meetingDay: "saturday",
    allowLoans: true,
    maxLoanMultiplier: 3,
    gracePeriodDays: 7,
    penaltyRate: 0.05,
    memberLimit: 50,
    additional: {},
    loanSettings: {
        interestRate: 0.1,
        maxDurationMonths: 6,
        collateralRequired: false,
        collateralTypes: ["land", "livestock", "equipment", "savings", "other"],
        minContributionsForLoan: 3,
        maxLoanMultiplier: 3,
    },
};

const purposeOptions = [
    { label: "Savings", value: "savings" },
    { label: "Netgrowth", value: "netgrowth" },
    { label: "Investment", value: "investment" },
    { label: "Social Support", value: "social-support" },
    { label: "Agriculture", value: "agriculture" },
    { label: "Other", value: "other" },
];

const memberRoleOptions = [
    { label: "Member", value: "member" },
    { label: "Chairperson", value: "chairperson" },
    { label: "Secretary", value: "secretary" },
    { label: "Finance", value: "finance" },
];

function titleCase(value: string) {
    return value
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

function formatDate(value?: string) {
    if (!value) return "Not set";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Not set";

    return new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
    }).format(date);
}

function memberName(member: User) {
    return `${member.firstName} ${member.lastName}`.trim();
}

function normalizeGroupPurpose(value: string | undefined | null): GroupPurpose {
    const supported: GroupPurpose[] = ["savings", "netgrowth", "investment", "social-support", "agriculture", "other"];
    return supported.includes((value || "") as GroupPurpose) ? (value as GroupPurpose) : "other";
}

function mapApiGroup(group: Group): RegisteredGroup {
    const settings = group.settings;

    return {
        id: group.id,
        name: group.name,
        groupe_code: group.groupe_code ?? undefined,
        purpose: normalizeGroupPurpose(group.purpose),
        startDate: group.startDate ? String(group.startDate) : undefined,
        description: group.description ?? undefined,
        province: group.province ?? undefined,
        district: group.district ?? undefined,
        sector: group.sector ?? undefined,
        cell: group.cell ?? undefined,
        village: group.village ?? undefined,
        meetingLocation: group.meetingLocation ?? undefined,
        contactPhone: group.contactPhone ?? undefined,
        foundedBy: group.foundedBy ?? undefined,
        registrationNumber: group.registrationNumber ?? undefined,
        notes: group.notes ?? undefined,
        isActive: group.isActive,
        settings: {
            contributionAmount: settings?.contributionAmount ?? defaultSettings.contributionAmount,
            contributionCurrency: settings?.contributionCurrency ?? defaultSettings.contributionCurrency,
            contributionFrequency: settings?.contributionFrequency === "monthly" ? "monthly" : "weekly",
            meetingDay: (settings?.meetingDay as GroupSettings["meetingDay"]) || defaultSettings.meetingDay,
            allowLoans: settings?.allowLoans ?? defaultSettings.allowLoans,
            maxLoanMultiplier: settings?.maxLoanMultiplier ?? defaultSettings.maxLoanMultiplier,
            gracePeriodDays: settings?.gracePeriodDays ?? defaultSettings.gracePeriodDays,
            penaltyRate: settings?.penaltyRate ?? defaultSettings.penaltyRate,
            memberLimit: (settings as GroupSettings)?.memberLimit ?? defaultSettings.memberLimit,
            additional: settings?.additional ?? {},
            loanSettings: settings?.loanSettings
                ? {
                    interestRate: settings.loanSettings.interestRate,
                    maxDurationMonths: settings.loanSettings.maxDurationMonths,
                    collateralRequired: settings.loanSettings.collateralRequired,
                    collateralTypes: settings.loanSettings.collateralTypes,
                    minContributionsForLoan: settings.loanSettings.minContributionsForLoan,
                    maxLoanMultiplier: settings.maxLoanMultiplier,
                }
                : defaultSettings.loanSettings,
        },
        createdAt: String(group.createdAt),
        updatedAt: String(group.updatedAt),
    };
}

export default function AdminOrganizationsPage() {
    const toast = useToast();

    const [query, setQuery] = useState("");
    const [selectedGroupId, setSelectedGroupId] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(10);
    const [chairpersonId, setChairpersonId] = useState("");

    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<RegisteredGroup | null>(null);
    const [membersPage, setMembersPage] = useState(1);
    const [membersPageSize] = useState(10);
    const [pendingRoles, setPendingRoles] = useState<Record<string, string>>({});
    const [changingRoleUserId, setChangingRoleUserId] = useState<string | null>(null);
    const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [addMemberForm, setAddMemberForm] = useState({ firstName: "", lastName: "", phone: "", email: "", role: "member" as UserRole });
    const [isAddingMember, setIsAddingMember] = useState(false);
    const [importRows, setImportRows] = useState<Array<{ firstName: string; lastName: string; phone: string; email: string; role: string }>>([]);
    const [importResults, setImportResults] = useState<Array<{ name: string; status: "success" | "error"; message?: string }>>([]);
    const [isImporting, setIsImporting] = useState(false);

    const [fetchGroups, { data: groupsData, isLoading: isLoadingGroups, isFetching: isFetchingGroups }] = useLazyGetGroupsQuery();
    const [fetchChairpersons, { data: chairpersonsData, isFetching: isFetchingChairpersons }] = useLazyGetUsersQuery();
    const [fetchGroupUsers, { data: groupUsersData, isFetching: isFetchingGroupUsers }] = useLazyGetUsersQuery();
    const [updateGroup, { isLoading: isUpdatingGroup }] = useUpdateGroupMutation();
    const [assignChairperson, { isLoading: isAssigningChairperson }] = useAssignChairpersonMutation();
    const [changeMembershipRole, { isLoading: isChangingMembershipRole }] = useChangeMembershipRoleMutation();
    const [fetchGroupMembers, { data: groupMembersData, isFetching: isFetchingMembers }] = useLazyGetUsersQuery();
    const [createUser] = useCreateUserMutation();
    const navigate = useRouter()


    useEffect(() => {
        fetchGroups({ search: query || undefined, page: currentPage, limit: pageSize });
    }, [fetchGroups, query, currentPage, pageSize]);

    useEffect(() => {
        fetchChairpersons({ role: "chairperson", limit: 100, page: 1 });
    }, [fetchChairpersons]);

    useEffect(() => {
        if (!selectedGroupId) return;
        fetchGroupUsers({ groupId: selectedGroupId, limit: 100, page: 1 });
    }, [fetchGroupUsers, selectedGroupId]);

    useEffect(() => {
        setMembersPage(1);
    }, [selectedGroupId]);

    useEffect(() => {
        if (!selectedGroupId) return;
        fetchGroupMembers({ groupId: selectedGroupId, page: membersPage, limit: membersPageSize });
    }, [fetchGroupMembers, selectedGroupId, membersPage, membersPageSize]);

    const groups = useMemo(() => {
        return (groupsData?.data?.items ?? []).map(mapApiGroup);
    }, [groupsData?.data?.items]);

    useEffect(() => {
        if (groups.length === 0) {
            if (selectedGroupId) setSelectedGroupId("");
            return;
        }

        if (!selectedGroupId || !groups.some((group) => group.id === selectedGroupId)) {
            setSelectedGroupId(groups[0].id);
        }
    }, [groups, selectedGroupId]);

    const chairpersonUsers = useMemo(() => {
        return (chairpersonsData?.data?.items ?? []) as User[];
    }, [chairpersonsData?.data?.items]);

    const selectedGroupUsers = useMemo(() => {
        return (groupUsersData?.data?.items ?? []) as User[];
    }, [groupUsersData?.data?.items]);

    const filteredGroups = groups;

    const paginationMeta = groupsData?.data?.meta;
    const membersPaginationMeta = groupMembersData?.data?.meta;
    const paginatedMembers = (groupMembersData?.data?.items ?? []) as User[];

    const selectedGroup = filteredGroups.find((group) => group.id === selectedGroupId) ?? filteredGroups[0];

    const selectedGroupChairpersons = useMemo(() => {
        return selectedGroupUsers.filter((member) => member.role === "chairperson");
    }, [selectedGroupUsers]);

    const chairpersonOptions = useMemo(() => {
        return chairpersonUsers
            .filter((member) => !member.groupId || member.groupId === selectedGroup?.id)
            .map((member) => ({
                label: `${memberName(member)}${member.phone ? ` (${member.phone})` : ""}`,
                value: member.id,
            }));
    }, [chairpersonUsers, selectedGroup?.id]);

    const activeGroups = groups.filter((group) => group.isActive).length;
    const assignedChairpersons = chairpersonUsers.filter((member) => member.groupId).length;
    const loanEnabledGroups = groups.filter((group) => group.settings.allowLoans).length;

    async function handleAssignChairPerson() {
        if (!selectedGroup || !chairpersonId) return;

        try {
            const response = await assignChairperson({
                groupId: selectedGroup.id,
                userId: chairpersonId,
            }).unwrap();

            toast.success("Chairperson assigned", response?.message ?? "Chairperson assigned successfully.");
            setChairpersonId("");
            await fetchChairpersons({ role: "chairperson", limit: 200 });
            await fetchGroupUsers({ groupId: selectedGroupId, limit: 100, page: 1 });
        } catch (error: any) {
            const message = error?.data?.message || "Failed to assign chairperson. Please try again.";
            toast.error("Error", message);
        }
    }

    async function unassignChairperson(userId: string) {
        if (!selectedGroup) return;

        try {
            const response = await changeMembershipRole({
                userId,
                groupId: selectedGroupId,
                newRole: "member",
            }).unwrap();

            toast.success("Chairperson removed", response?.message ?? "Chairperson unassigned from group.");
            await fetchChairpersons({ role: "chairperson", limit: 200 });
            await fetchGroupUsers({ groupId: selectedGroupId, limit: 100, page: 1 });
        } catch (error: any) {
            const message = error?.data?.message || "Failed to unassign chairperson. Please try again.";
            toast.error("Error", message);
        }
    }

    async function changeMemberRole(userId: string) {
        const newRole = pendingRoles[userId];
        if (!newRole || !selectedGroupId) return;
        setChangingRoleUserId(userId);
        if (isChangingMembershipRole) return;
        try {
            const response = await changeMembershipRole({
                userId,
                groupId: selectedGroupId,
                newRole,

            }).unwrap();
            toast.success("Role updated", response?.message ?? "Member role updated successfully.");
            setPendingRoles((prev) => {
                const next = { ...prev };
                delete next[userId];
                return next;
            });
            await Promise.all([
                fetchGroupMembers({ groupId: selectedGroupId, role: "member", page: membersPage, limit: membersPageSize }),
                fetchGroupUsers({ groupId: selectedGroupId, limit: 100, page: 1 }),
            ]);
        } catch (error: any) {
            const message = error?.data?.message || "Failed to update role. Please try again.";
            toast.error("Error", message);
        } finally {
            setChangingRoleUserId(null);
        }
    }

    async function addMember() {
        if (!selectedGroup || !addMemberForm.firstName.trim() || !addMemberForm.lastName.trim()) return;
        setIsAddingMember(true);
        try {
            await createUser({
                firstName: addMemberForm.firstName.trim(),
                lastName: addMemberForm.lastName.trim(),
                phone: addMemberForm.phone.trim() || undefined,
                email: addMemberForm.email.trim() || undefined,
                role: addMemberForm.role,
                groupId: selectedGroup.id,
            }).unwrap();
            toast.success("Member added", "New member has been added to the group.");
            setIsAddMemberOpen(false);
            setAddMemberForm({ firstName: "", lastName: "", phone: "", email: "", role: "member" });
            await fetchGroupMembers({ groupId: selectedGroupId, role: "member", page: membersPage, limit: membersPageSize });
        } catch (error: any) {
            toast.error("Error", error?.data?.message || "Failed to add member.");
        } finally {
            setIsAddingMember(false);
        }
    }

    function parseCSV(text: string) {
        const lines = text.trim().split(/\r?\n/);
        if (lines.length < 2) return [];
        const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/["\s_]/g, ""));
        return lines
            .slice(1)
            .filter((line) => line.trim())
            .map((line) => {
                const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
                const row: Record<string, string> = {};
                headers.forEach((h, i) => { row[h] = cols[i] ?? ""; });
                return {
                    firstName: row.firstname || row.firstnam || "",
                    lastName: row.lastname || row.lastnam || "",
                    phone: row.phone || row.phonenumber || "",
                    email: row.email || "",
                    role: row.role || "member",
                };
            })
            .filter((r) => r.firstName && r.lastName);
    }

    async function importMembers() {
        if (!selectedGroup || importRows.length === 0) return;
        setIsImporting(true);
        const results: typeof importResults = [];
        for (const row of importRows) {
            try {
                await createUser({
                    firstName: row.firstName,
                    lastName: row.lastName,
                    phone: row.phone || undefined,
                    email: row.email || undefined,
                    role: row.role as UserRole,
                    groupId: selectedGroup.id,
                }).unwrap();
                results.push({ name: `${row.firstName} ${row.lastName}`, status: "success" });
            } catch (error: any) {
                results.push({ name: `${row.firstName} ${row.lastName}`, status: "error", message: error?.data?.message || "Failed" });
            }
        }
        setImportResults(results);
        const succeeded = results.filter((r) => r.status === "success").length;
        if (succeeded > 0) {
            toast.success("Import complete", `${succeeded} of ${results.length} members imported successfully.`);
            await fetchGroupMembers({ groupId: selectedGroupId, role: "member", page: membersPage, limit: membersPageSize });
        }
        setIsImporting(false);
    }

    function openEditGroup(group: RegisteredGroup) {
        navigate.push(`/dashboard/admin/organizations/${group.id}`);
    }

    function closeEditGroup() {
        setEditingGroup(null);
        setIsEditOpen(false);
    }

    async function submitEditGroup(values: GroupFormValues) {
        if (!editingGroup) return;

        try {
            const response = await updateGroup({
                groupId: editingGroup.id,
                data: toGroupPayload(values),
            }).unwrap();

            toast.success("Group updated", response?.message ?? "Group updated successfully.");
            closeEditGroup();
            await fetchGroups({ search: query || undefined, page: currentPage, limit: pageSize });
        } catch (error: any) {
            const message = error?.data?.message || "Failed to update group. Please try again.";
            toast.error("Error", message);
        }
    }

    return (
        <div className="grid gap-6">
            <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <p className="panel-tag">Admin Console</p>
                    <h2 className="headline mt-2 text-2xl text-foreground sm:text-3xl">Groups</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-(--ib-muted)">
                        View registered groups, inspect their theme, create groups, and assign chairpersons.
                    </p>
                </div>
                <button className="ib-btn-primary justify-center" onClick={() => navigate.push("/dashboard/admin/organizations/create")}>
                    <Plus size={16} />
                    Register Group
                </button>
            </header>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                    { label: "Registered Groups", value: groups.length, icon: Building2, detail: "Total groups in the system" },
                    { label: "Active Groups", value: activeGroups, icon: CheckCircle2, detail: "Currently operating" },
                    { label: "Assigned Chairpersons", value: assignedChairpersons, icon: Users, detail: "Leads assigned to groups" },
                    { label: "Loans Enabled", value: loanEnabledGroups, icon: CircleDollarSign, detail: "Groups allowing loan requests" },
                ].map((metric) => (
                    <article key={metric.label} className="rounded-xl border border-(--ib-line) bg-white p-5 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-sm font-semibold text-(--ib-muted)">{metric.label}</p>
                                <p className="mt-2 text-3xl font-bold text-foreground">{metric.value}</p>
                            </div>
                            <span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-(--ib-accent)">
                                <metric.icon size={20} />
                            </span>
                        </div>
                        <p className="mt-3 text-xs text-(--ib-muted)">{metric.detail}</p>
                    </article>
                ))}
            </section>

            <section className="grid gap-6 xl:grid-cols-[minmax(380px,0.7fr)_minmax(0,1fr)]">
                <section className="rounded-xl border border-(--ib-line) bg-white shadow-sm">
                    <div className="border-b border-(--ib-line) p-5">
                        <h3 className="headline text-xl text-foreground">Group List</h3>
                        <label className="mt-4 flex min-h-10 items-center gap-2 rounded-xl border border-(--ib-line) bg-[#f4f7fc] px-3 text-sm text-(--ib-muted)">
                            <Search size={16} />
                            <input
                                value={query}
                                onChange={(event) => {
                                    setCurrentPage(1);
                                    setQuery(event.target.value);
                                }}
                                placeholder="Search groups"
                                className="w-full bg-transparent text-foreground outline-none placeholder:text-[#375176]/55"
                            />
                        </label>
                    </div>

                    <div className="max-h-180 overflow-y-auto p-3">
                        {(isLoadingGroups || isFetchingGroups) && (
                            <p className="px-4 py-6 text-sm text-(--ib-muted)">Loading groups...</p>
                        )}

                        {!isLoadingGroups && !isFetchingGroups && filteredGroups.map((group) => (
                            <article
                                key={group.id}
                                className={`mb-2 rounded-xl border p-4 text-left transition-colors ${selectedGroup?.id === group.id
                                    ? "border-(--ib-accent) bg-blue-50"
                                    : "border-(--ib-line) bg-white hover:bg-[#f4f7fc]"
                                    }`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="font-bold text-foreground">{group.name}</p>
                                        <p className="mt-1 text-xs text-(--ib-muted)">
                                            {group.groupe_code || "No code"} - Theme: {titleCase(group.purpose)}
                                        </p>
                                    </div>
                                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${group.isActive
                                        ? "bg-emerald-50 text-emerald-700"
                                        : "bg-slate-100 text-slate-600"
                                        }`}>
                                        {group.isActive ? "Active" : "Inactive"}
                                    </span>
                                </div>
                                <div className="mt-3 grid gap-2 text-xs text-(--ib-muted)">
                                    <span className="flex items-center gap-2">
                                        <MapPin size={14} />
                                        {[group.district, group.sector].filter(Boolean).join(", ") || "No location"}
                                    </span>
                                    <span className="flex items-center gap-2">
                                        <CalendarDays size={14} />
                                        {formatDate(group.startDate)}
                                    </span>
                                </div>
                                <div className="mt-3 flex justify-end">
                                    <button
                                        type="button"
                                        className="ib-btn-secondary py-1.5 text-xs"
                                        onClick={() => setSelectedGroupId(group.id)}
                                    >
                                        <Eye size={14} />
                                        View details
                                    </button>
                                </div>
                            </article>
                        ))}

                        {!isLoadingGroups && !isFetchingGroups && filteredGroups.length === 0 && (
                            <div className="px-4 py-10 text-center">
                                <Building2 className="mx-auto text-(--ib-muted)" size={32} />
                                <p className="mt-3 font-bold text-foreground">No groups found</p>
                            </div>
                        )}
                    </div>

                    <Pagination
                        currentPage={paginationMeta?.currentPage ?? currentPage}
                        totalPages={paginationMeta?.totalPages ?? 1}
                        totalItems={paginationMeta?.totalItems}
                        itemCount={paginationMeta?.itemCount ?? filteredGroups.length}
                        isLoading={isLoadingGroups || isFetchingGroups}
                        onPageChange={(nextPage) => {
                            const boundedPage = Math.max(1, Math.min(nextPage, paginationMeta?.totalPages ?? 1));
                            setCurrentPage(boundedPage);
                        }}
                    />
                </section>

                {selectedGroup && (
                    <section className="rounded-xl border border-(--ib-line) bg-white shadow-sm">
                        <div className="flex items-start justify-between gap-3 border-b border-(--ib-line) p-5">
                            <div>
                                <p className="panel-tag">Group Details</p>
                                <h3 className="headline mt-2 text-xl text-foreground">{selectedGroup.name}</h3>
                                <p className="mt-1 text-sm text-(--ib-muted)">{selectedGroup.description || "No description provided."}</p>
                            </div>
                            <button
                                type="button"
                                className="ib-btn-secondary py-2 text-xs"
                                onClick={() => openEditGroup(selectedGroup)}
                            >
                                Edit group
                            </button>
                        </div>

                        <div className="grid gap-5 p-5">
                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                {[
                                    ["Code", selectedGroup.groupe_code || "Not set", ShieldCheck],
                                    ["Theme", titleCase(selectedGroup.purpose), Eye],
                                    ["Contact", selectedGroup.contactPhone || "Not set", Phone],
                                    ["Started", formatDate(selectedGroup.startDate), CalendarDays],
                                ].map(([label, value, Icon]) => (
                                    <div key={label as string} className="rounded-xl border border-(--ib-line) bg-[#f8fbff] p-3">
                                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#375176]/70">
                                            <Icon size={14} />
                                            {label as string}
                                        </div>
                                        <p className="mt-2 font-semibold text-foreground">{value as string}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="grid gap-4 lg:grid-cols-2">
                                <div className="rounded-xl border border-(--ib-line) p-4">
                                    <h4 className="font-bold text-foreground">Location</h4>
                                    <div className="mt-3 grid gap-2 text-sm text-(--ib-muted)">
                                        <p>Province: <strong className="text-foreground">{selectedGroup.province || "Not set"}</strong></p>
                                        <p>District: <strong className="text-foreground">{selectedGroup.district || "Not set"}</strong></p>
                                        <p>Sector: <strong className="text-foreground">{selectedGroup.sector || "Not set"}</strong></p>
                                        <p>Cell: <strong className="text-foreground">{selectedGroup.cell || "Not set"}</strong></p>
                                        <p>Village: <strong className="text-foreground">{selectedGroup.village || "Not set"}</strong></p>
                                        <p>Meeting location: <strong className="text-foreground">{selectedGroup.meetingLocation || "Not set"}</strong></p>
                                    </div>
                                </div>

                                <div className="rounded-xl border border-(--ib-line) p-4">
                                    <h4 className="font-bold text-foreground">Operating Rules</h4>
                                    <div className="mt-3 grid gap-2 text-sm text-(--ib-muted)">
                                        <p>Contribution: <strong className="text-foreground">{selectedGroup.settings.contributionAmount.toLocaleString()} {selectedGroup.settings.contributionCurrency}</strong></p>
                                        <p>Frequency: <strong className="text-foreground">{titleCase(selectedGroup.settings.contributionFrequency)}</strong></p>
                                        <p>Meeting day: <strong className="text-foreground">{titleCase(selectedGroup.settings.meetingDay)}</strong></p>
                                        <p>Member limit: <strong className="text-foreground">{selectedGroup.settings.memberLimit ?? "Not set"}</strong></p>
                                        <p>Loans: <strong className="text-foreground">{selectedGroup.settings.allowLoans ? "Allowed" : "Disabled"}</strong></p>
                                        <p>Grace period: <strong className="text-foreground">{selectedGroup.settings.gracePeriodDays} days</strong></p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl border border-(--ib-line) p-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                                    <Dropdown
                                        label="Assign or change chairperson"
                                        value={chairpersonId}
                                        onValueChange={setChairpersonId}
                                        placeholder={isFetchingChairpersons ? "Loading chairpersons..." : "Select chairperson"}
                                        options={chairpersonOptions}
                                        containerClassName="flex-1"
                                        disabled={isFetchingChairpersons || chairpersonOptions.length === 0}
                                    />
                                    <button type="button" className="ib-btn-primary justify-center" onClick={handleAssignChairPerson} disabled={!chairpersonId || isAssigningChairperson}   >
                                        <UserPlus size={16} />
                                        Assign / Change
                                    </button>
                                </div>

                                {isFetchingGroupUsers && (
                                    <p className="mt-4 text-sm text-(--ib-muted)">Loading group users...</p>
                                )}

                                <div className="mt-4 grid gap-2">
                                    <p className="text-xs font-bold uppercase tracking-wide text-[#375176]/70">Chairpersons</p>
                                    {selectedGroupChairpersons.map((member) => (
                                        <div key={member.id} className="flex items-center justify-between gap-3 rounded-xl bg-[#f4f7fc] px-3 py-3">
                                            <div>
                                                <p className="font-bold text-foreground">{memberName(member)}</p>
                                                <p className="text-xs text-(--ib-muted)">{member.phone || member.email || "No contact"}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="rounded-full bg-[#0b3978] px-2.5 py-1 text-xs font-bold text-white">
                                                    Chairperson
                                                </span>
                                                <button
                                                    type="button"
                                                    className="ib-btn-secondary py-1.5 text-xs"
                                                    onClick={() => unassignChairperson(member.id)}
                                                    disabled={isAssigningChairperson}
                                                >
                                                    Unassign
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {selectedGroupChairpersons.length === 0 && (
                                        <p className="rounded-xl bg-[#f4f7fc] px-3 py-4 text-center text-sm text-(--ib-muted)">
                                            No chairperson has been assigned yet.
                                        </p>
                                    )}

                                    <div className="mt-3 flex items-center justify-between gap-2">
                                        <p className="text-xs font-bold uppercase tracking-wide text-[#375176]/70">Members</p>
                                        <div className="flex items-center gap-2">
                                            <button type="button" className="ib-btn-secondary py-1.5 text-xs" onClick={() => { setImportRows([]); setImportResults([]); setIsImportOpen(true); }}>
                                                <Upload size={13} />
                                                Import CSV
                                            </button>
                                            <button type="button" className="ib-btn-primary py-1.5 text-xs" onClick={() => setIsAddMemberOpen(true)}>
                                                <UserPlus size={13} />
                                                Add Member
                                            </button>
                                        </div>
                                    </div>
                                    {isFetchingMembers && (
                                        <p className="text-sm text-(--ib-muted)">Loading members...</p>
                                    )}
                                    {!isFetchingMembers && paginatedMembers.map((member) => (
                                        <div key={member.id} className="flex items-start justify-between gap-3 rounded-xl bg-[#f4f7fc] px-3 py-3">
                                            <div>
                                                <p className="font-bold text-foreground">{memberName(member)}</p>
                                                <p className="text-xs text-(--ib-muted)">{member.phone || member.email || "No contact"}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Dropdown
                                                    size="sm"
                                                    value={pendingRoles[member.id] ?? member.role}
                                                    onValueChange={(val) =>
                                                        setPendingRoles((prev) => ({ ...prev, [member.id]: val }))
                                                    }
                                                    options={memberRoleOptions}
                                                    containerClassName="w-36"
                                                />
                                                {pendingRoles[member.id] && pendingRoles[member.id] !== member.role && (
                                                    <button
                                                        type="button"
                                                        className="ib-btn-primary py-1.5 text-xs"
                                                        onClick={() => changeMemberRole(member.id)}
                                                        disabled={changingRoleUserId === member.id}
                                                    >
                                                        {changingRoleUserId === member.id ? "Saving..." : "Apply"}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {!isFetchingMembers && paginatedMembers.length === 0 && (
                                        <p className="rounded-xl bg-[#f4f7fc] px-3 py-4 text-center text-sm text-(--ib-muted)">
                                            No members found in this group.
                                        </p>
                                    )}
                                    <Pagination
                                        currentPage={membersPaginationMeta?.currentPage ?? membersPage}
                                        totalPages={membersPaginationMeta?.totalPages ?? 1}
                                        totalItems={membersPaginationMeta?.totalItems}
                                        itemCount={membersPaginationMeta?.itemCount ?? paginatedMembers.length}
                                        isLoading={isFetchingMembers}
                                        onPageChange={(nextPage) => {
                                            const boundedPage = Math.max(1, Math.min(nextPage, membersPaginationMeta?.totalPages ?? 1));
                                            setMembersPage(boundedPage);
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </section>
                )}
            </section>



            <Modal
                isOpen={isEditOpen && Boolean(editingGroup)}
                onClose={closeEditGroup}
                title={editingGroup ? `Edit ${editingGroup.name}` : "Edit Group"}
                description="Update the group profile, location, settings, or loan policy."
            >
                {editingGroup && (
                    <GroupForm
                        mode="edit"
                        initialValues={{
                            ...defaultGroupValues,
                            name: editingGroup.name,
                            purpose: editingGroup.purpose,
                            startDate: editingGroup.startDate ?? "",
                            description: editingGroup.description ?? "",
                            province: editingGroup.province ?? "",
                            district: editingGroup.district ?? "",
                            sector: editingGroup.sector ?? "",
                            cell: editingGroup.cell ?? "",
                            village: editingGroup.village ?? "",
                            meetingLocation: editingGroup.meetingLocation ?? "",
                            contactPhone: editingGroup.contactPhone ?? "",
                            foundedBy: editingGroup.foundedBy ?? "",
                            registrationNumber: editingGroup.registrationNumber ?? "",
                            notes: editingGroup.notes ?? "",
                            isActive: editingGroup.isActive,
                            contributionAmount: String(editingGroup.settings.contributionAmount),
                            contributionCurrency: editingGroup.settings.contributionCurrency,
                            contributionFrequency: editingGroup.settings.contributionFrequency,
                            meetingDay: editingGroup.settings.meetingDay,
                            allowLoans: editingGroup.settings.allowLoans,
                            maxLoanMultiplier: String(editingGroup.settings.maxLoanMultiplier),
                            gracePeriodDays: String(editingGroup.settings.gracePeriodDays),
                            penaltyRate: String(editingGroup.settings.penaltyRate ?? 0),
                            memberLimit: String(editingGroup.settings.memberLimit ?? 0),
                            interestRate: String(editingGroup.settings.loanSettings?.interestRate ?? 0),
                            maxDurationMonths: String(editingGroup.settings.loanSettings?.maxDurationMonths ?? 0),
                            collateralRequired: editingGroup.settings.loanSettings?.collateralRequired ?? false,
                            collateralTypes: editingGroup.settings.loanSettings?.collateralTypes?.join(", ") ?? "",
                            minContributionsForLoan: String(editingGroup.settings.loanSettings?.minContributionsForLoan ?? 0),
                        }}
                        submitLabel={isUpdatingGroup ? "Saving..." : "Save Changes"}
                        isSubmitting={isUpdatingGroup}
                        onCancel={closeEditGroup}
                        onSubmit={submitEditGroup}
                    />
                )}
            </Modal>

            {/* Add single member */}
            <Modal
                isOpen={isAddMemberOpen}
                onClose={() => setIsAddMemberOpen(false)}
                title="Add Member"
                description={selectedGroup ? `Add a new member to ${selectedGroup.name}.` : ""}
            >
                <div className="grid gap-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                            label="First name"
                            required
                            value={addMemberForm.firstName}
                            onChange={(e) => setAddMemberForm((p) => ({ ...p, firstName: e.target.value }))}
                            placeholder="e.g. Jean"
                        />
                        <Input
                            label="Last name"
                            required
                            value={addMemberForm.lastName}
                            onChange={(e) => setAddMemberForm((p) => ({ ...p, lastName: e.target.value }))}
                            placeholder="e.g. Mugisha"
                        />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                            label="Phone"
                            value={addMemberForm.phone}
                            onChange={(e) => setAddMemberForm((p) => ({ ...p, phone: e.target.value }))}
                            placeholder="+2507xxxxxxxx"
                        />
                        <Input
                            label="Email"
                            type="email"
                            value={addMemberForm.email}
                            onChange={(e) => setAddMemberForm((p) => ({ ...p, email: e.target.value }))}
                            placeholder="member@example.com"
                        />
                    </div>
                    <Dropdown
                        label="Role"
                        value={addMemberForm.role}
                        onValueChange={(val) => setAddMemberForm((p) => ({ ...p, role: val as UserRole }))}
                        options={memberRoleOptions}
                    />
                    <div className="flex justify-end gap-2 border-t border-(--ib-line) pt-4">
                        <button type="button" className="ib-btn-secondary" onClick={() => setIsAddMemberOpen(false)}>Cancel</button>
                        <button
                            type="button"
                            className="ib-btn-primary"
                            disabled={isAddingMember || !addMemberForm.firstName.trim() || !addMemberForm.lastName.trim()}
                            onClick={addMember}
                        >
                            <UserPlus size={16} />
                            {isAddingMember ? "Adding..." : "Add Member"}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Bulk import members */}
            <Modal
                isOpen={isImportOpen}
                onClose={() => setIsImportOpen(false)}
                title="Import Members via CSV"
                description="Upload a CSV file with columns: firstName, lastName, phone, email, role (optional)."
            >
                <div className="grid gap-4">
                    {importResults.length === 0 && (
                        <>
                            <label className="grid gap-1.5 text-sm font-semibold text-foreground">
                                CSV File
                                <div className="flex items-center gap-3 rounded-xl border border-dashed border-(--ib-line) bg-[#f4f7fc] px-4 py-5 text-sm text-(--ib-muted)">
                                    <FileText size={20} className="shrink-0" />
                                    <div className="flex-1">
                                        <p>Expected columns: <code className="rounded bg-slate-100 px-1">firstName, lastName, phone, email, role</code></p>
                                        <p className="mt-1 text-xs">Rows missing firstName or lastName are skipped.</p>
                                    </div>
                                </div>
                                <input
                                    type="file"
                                    accept=".csv,text/csv"
                                    className="mt-1 text-sm"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        const reader = new FileReader();
                                        reader.onload = (ev) => {
                                            const text = ev.target?.result as string;
                                            setImportRows(parseCSV(text));
                                        };
                                        reader.readAsText(file);
                                    }}
                                />
                            </label>

                            {importRows.length > 0 && (
                                <>
                                    <p className="text-sm font-semibold text-foreground">{importRows.length} row{importRows.length !== 1 ? "s" : ""} ready to import</p>
                                    <div className="max-h-60 overflow-y-auto rounded-xl border border-(--ib-line)">
                                        <table className="w-full text-sm">
                                            <thead className="sticky top-0 bg-[#f8fbff]">
                                                <tr>
                                                    {["First name", "Last name", "Phone", "Email", "Role"].map((h) => (
                                                        <th key={h} className="px-3 py-2 text-left text-xs font-bold text-(--ib-muted)">{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {importRows.map((row, i) => (
                                                    <tr key={i} className="border-t border-(--ib-line)">
                                                        <td className="px-3 py-2">{row.firstName}</td>
                                                        <td className="px-3 py-2">{row.lastName}</td>
                                                        <td className="px-3 py-2 text-(--ib-muted)">{row.phone || "—"}</td>
                                                        <td className="px-3 py-2 text-(--ib-muted)">{row.email || "—"}</td>
                                                        <td className="px-3 py-2 capitalize">{row.role}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                        </>
                    )}

                    {importResults.length > 0 && (
                        <div className="grid gap-2">
                            <p className="text-sm font-semibold text-foreground">
                                Results: {importResults.filter((r) => r.status === "success").length} succeeded, {importResults.filter((r) => r.status === "error").length} failed
                            </p>
                            <div className="max-h-64 overflow-y-auto rounded-xl border border-(--ib-line)">
                                {importResults.map((r, i) => (
                                    <div key={i} className={`flex items-center justify-between gap-3 border-b border-(--ib-line) px-3 py-2 last:border-0 text-sm ${r.status === "success" ? "text-emerald-700" : "text-red-600"}`}>
                                        <span>{r.name}</span>
                                        <span className="text-xs">{r.status === "success" ? "✓ Imported" : `✗ ${r.message}`}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-2 border-t border-(--ib-line) pt-4">
                        <button type="button" className="ib-btn-secondary" onClick={() => setIsImportOpen(false)}>Close</button>
                        {importResults.length === 0 && (
                            <button
                                type="button"
                                className="ib-btn-primary"
                                disabled={isImporting || importRows.length === 0}
                                onClick={importMembers}
                            >
                                <Upload size={16} />
                                {isImporting ? `Importing ${importResults.length}/${importRows.length}...` : `Import ${importRows.length} Member${importRows.length !== 1 ? "s" : ""}`}
                            </button>
                        )}
                    </div>
                </div>
            </Modal>
        </div>
    );
}
