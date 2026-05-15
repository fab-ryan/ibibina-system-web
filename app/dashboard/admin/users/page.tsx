/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
    CheckCircle2,
    CircleSlash,
    Edit3,
    Eye,
    KeyRound,
    Mail,
    MoreHorizontal,
    Plus,
    Search,
    ShieldCheck,
    Trash2,
    UserPlus,
    Users,
} from "lucide-react";
import { Dropdown, Input, Modal, Table, type TableHeader } from "@/components/ui";
import { useEffect, useMemo, useState } from "react";
import {
    useCreateUserMutation,
    useDeleteUserMutation,
    useGetUsersStaticsQuery,
    useLazyGetUsersQuery,
    useUpdateUserMutation,
} from "@/api/users";
import { useGetActiveGroupsQuery } from "@/api/group";
import { User, UserRole, UserStatus } from "@/types";
import * as yup from "yup";
import { useForm, Controller, Resolver, useWatch } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import Button from "@/components/ui/button";
import { useToast } from "@/contexts/toast-context";


type UserGroup = {
    id: string;
    name: string;
};

type AdminUser = {
    id: string;
    firstName?: string;
    lastName?: string;
    user_code?: string;
    email?: string;
    phone?: string;
    role: UserRole;
    groupId?: string;
    group?: UserGroup;
    status: UserStatus;
    isEmailVerified: boolean;
    profilePicture?: string;
    createdAt: string;
    updatedAt: string;
};

// ── Yup schema ────────────────────────────────────────────────
const phoneRegex = /^(?:\+250|0)?7[2389]\d{7}$/;

const userSchema = yup.object({
    firstName: yup.string().required("First name is required."),
    lastName: yup.string().required("Last name is required."),
    email: yup
        .string()
        .email("Enter a valid email address.")
        .when("role", {
            is: "admin",
            then: (schema) => schema.required("Email is required for admin accounts."),
            otherwise: (schema) => schema.default(""),
        }),
    phone: yup
        .string()
        .when("role", {
            is: (role: string) => role !== "admin",
            then: (schema) =>
                schema
                    .required("Phone number is required for non-admin users.")
                    .matches(phoneRegex, "Enter a valid Rwandan phone number (+2507XXXXXXXX)."),
            otherwise: (schema) =>
                schema
                    .default("")
                    .test("optional-phone", "Enter a valid Rwandan phone number (+2507XXXXXXXX).", (value) =>
                        !value || phoneRegex.test(value),
                    ),
        }),
    role: yup
        .mixed<UserRole>()
        .oneOf(["admin", "chairperson", "secretary", "finance", "member"])
        .required()
        .default("member"),
    status: yup
        .mixed<UserStatus>()
        .oneOf(["active", "inactive", "suspended"])
        .required()
        .default("active"),
    groupId: yup.string().default(""),
    isEmailVerified: yup.boolean().default(false),
});



type UserFormData = {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    role: UserRole;
    status: UserStatus;
    groupId: string;
    isEmailVerified: boolean;
    password?: string;
};

const defaultFormValues: UserFormData = {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    role: "member",
    status: "active",
    groupId: "",
    isEmailVerified: false,
    password: "password123", // Default password for new users (should be changed on first login)
};

const roles: UserRole[] = ["admin", "chairperson", "secretary", "finance", "member"];
const statuses: Array<"all" | UserStatus> = ["all", "active", "inactive", "suspended"];
const roleOptions = roles.map((role) => ({ label: titleCase(role), value: role }));
const statusOptions = statuses.map((status) => ({ label: titleCase(status), value: status }));
const userStatusOptions = statuses
    .filter((status) => status !== "all")
    .map((status) => ({ label: titleCase(status), value: status }));

const pageSizeOptions = [
    { label: "10 / page", value: "10" },
    { label: "20 / page", value: "20" },
    { label: "50 / page", value: "50" },
];

const userTableHeaders: TableHeader[] = [
    { key: "select", label: "", className: "w-12 px-4 py-4" },
    { key: "user", label: "User", className: "px-4 py-4" },
    { key: "role", label: "Role", className: "px-4 py-4" },
    { key: "group", label: "Group", className: "px-4 py-4" },
    { key: "status", label: "Status", className: "px-4 py-4" },
    { key: "created", label: "Created", className: "px-4 py-4" },
    { key: "updated", label: "Updated", className: "px-4 py-4" },
    { key: "actions", label: "Actions", className: "px-4 py-4 text-right" },
];

function fullName(user: Pick<AdminUser, "firstName" | "lastName" | "email" | "phone">) {
    const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
    return name || user.email || user.phone || "Unnamed user";
}

function titleCase(value: string) {
    return value
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

function initials(user: Pick<AdminUser, "firstName" | "lastName" | "email" | "phone">) {
    return fullName(user)
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
}

function formatDate(value: string | Date | undefined | null) {
    if (!value) return "-";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    return new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
    }).format(date);
}

function statusClasses(status: UserStatus) {
    if (status === "active") return "border-emerald-200 bg-emerald-50 text-emerald-700";
    if (status === "inactive") return "border-amber-200 bg-amber-50 text-amber-700";
    return "border-rose-200 bg-rose-50 text-rose-700";
}

function roleClasses(role: UserRole) {
    if (role === "admin") return "bg-[#0b3978] text-white";
    if (role === "chairperson") return "bg-indigo-50 text-indigo-700";
    if (role === "secretary") return "bg-violet-50 text-violet-700";
    if (role === "finance") return "bg-cyan-50 text-cyan-700";
    return "bg-slate-100 text-slate-700";
}

function normalizeApiUser(user: User): AdminUser {
    const normalizedRole: UserRole = roles.includes(user.role as UserRole)
        ? (user.role as UserRole)
        : "member";
    const normalizedStatus: UserStatus = ["active", "inactive", "suspended"].includes(user.status)
        ? (user.status as UserStatus)
        : "inactive";

    return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone ?? undefined,
        role: normalizedRole,
        groupId: user.groupId,
        group: user.group ? { id: user.group.id, name: user.group.name } : undefined,
        status: normalizedStatus,
        isEmailVerified: user.isEmailVerified,
        profilePicture: user.profilePicture ?? undefined,
        createdAt: String(user.createdAt),
        updatedAt: String(user.updatedAt),
    };
}

export default function AdminUsersPage() {
    const [query, setQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<(typeof statuses)[number]>("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [menuUserId, setMenuUserId] = useState<string | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isResettingPasswordOpen, setIsResettingPasswordOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
    const [viewingUser, setViewingUser] = useState<AdminUser | null>(null);
    const [actionUser, setActionUser] = useState<AdminUser | null>(null);
    const [actionType, setActionType] = useState<"suspend" | "activate" | "delete" | null>(null);
    const [createUser, { isLoading: isCreating }] = useCreateUserMutation();
    const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();
    const [deleteUserMutation, { isLoading: isDeleting }] = useDeleteUserMutation();
    const toast = useToast();

    const {
        register,
        handleSubmit,
        control,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<UserFormData>({
        resolver: yupResolver(userSchema) as unknown as Resolver<UserFormData>,
        defaultValues: defaultFormValues,
    });



    const watchedRole = useWatch({ control, name: "role" });

    const [fetchUsers, { isLoading, isFetching, isError, data }] = useLazyGetUsersQuery();
    const { data: usersStatics } = useGetUsersStaticsQuery();
    const { data: groupsData } = useGetActiveGroupsQuery();
    const groupOptions = useMemo(
        () => [
            { label: "No group", value: "" },
            ...(groupsData?.data ?? []).map((g) => ({ label: g.name, value: g.id })),
        ],
        [groupsData?.data],
    );
    const apiUsers = useMemo(
        () => (data?.data?.items ?? []).map((user) => normalizeApiUser(user)),
        [data?.data?.items],
    );


    const filteredUsers = useMemo(() => {
        return data ? apiUsers : [];
    }, [apiUsers, data]);

    const paginationMeta = data?.data?.meta;

    const selectedCount = usersStatics?.data?.totolUsers ?? 0;
    const activeCount = usersStatics?.data?.activeUsers ?? 0;
    const pendingCount = usersStatics?.data?.inactiveUsers ?? 0;
    const adminCount = usersStatics?.data?.adminUsers ?? 0;

    useEffect(() => {
        fetchUsers({
            search: query || undefined,
            status: statusFilter === "all" ? undefined : statusFilter,
            page: currentPage,
            limit: pageSize,
        });
    }, [currentPage, fetchUsers, pageSize, query, statusFilter]);

    function openCreateDialog() {
        reset(defaultFormValues);
        setEditingUser(null);
        setIsCreateOpen(true);
    }

    function openEditDialog(user: AdminUser) {
        reset({
            firstName: user.firstName ?? "",
            lastName: user.lastName ?? "",
            email: user.email ?? "",
            phone: user.phone ?? "",
            role: user.role,
            status: user.status,
            groupId: user.groupId ?? "",
            isEmailVerified: user.isEmailVerified,
        });
        setEditingUser(user);
        setMenuUserId(null);
        setIsCreateOpen(true);
    }

    function openViewDialog(user: AdminUser) {
        setViewingUser(user);
        setMenuUserId(null);
    }

    function closeDialog() {
        setIsCreateOpen(false);
        setEditingUser(null);
        reset(defaultFormValues);
    }

    function closeViewDialog() {
        setViewingUser(null);
    }

    function openSuspendDialog(user: AdminUser) {
        setActionUser(user);
        setActionType(user.status === "active" ? "suspend" : "activate");
        setMenuUserId(null);
    }

    function openDeleteDialog(user: AdminUser) {
        setActionUser(user);
        setActionType("delete");
        setMenuUserId(null);
    }

    function closeActionDialog() {
        setActionUser(null);
        setActionType(null);
    }

    async function confirmAction() {
        if (!actionUser || !actionType) return;

        if (actionType === "delete") {
            try {
                const response = await deleteUserMutation(actionUser.id).unwrap();
                toast.success("User deleted", response?.message ?? "User was removed successfully.");
                setSelectedUsers((currentSelected) => currentSelected.filter((id) => id !== actionUser.id));
                await fetchUsers({
                    search: query || undefined,
                    status: statusFilter === "all" ? undefined : statusFilter,
                    page: currentPage,
                    limit: pageSize,
                });
                closeActionDialog();
            } catch (error: any) {
                const errMsg = error?.data?.message || "Failed to delete user. Please try again.";
                toast.error("Error", errMsg);
            }
            return;
        }

        const nextStatus: UserStatus = actionType === "suspend" ? "suspended" : "active";
        try {
            const response = await updateUser({
                userId: actionUser.id,
                data: { status: nextStatus },
            }).unwrap();
            toast.success(
                actionType === "suspend" ? "User suspended" : "User activated",
                response?.message ?? "User status updated successfully.",
            );
            await fetchUsers({
                search: query || undefined,
                status: statusFilter === "all" ? undefined : statusFilter,
                page: currentPage,
                limit: pageSize,
            });
            closeActionDialog();
        } catch (error: any) {
            const errMsg = error?.data?.message || "Failed to update user status. Please try again.";
            toast.error("Error", errMsg);
        }
    }

    async function submitUser(data: UserFormData) {
        if (editingUser) {
            if (isUpdating) return;
            await updateUser({
                userId: editingUser.id,
                data: {
                    firstName: data.firstName,
                    lastName: data.lastName,
                    email: data.email || undefined,
                    phone: data.phone || undefined,
                    role: data.role,
                    groupId: data.groupId || undefined,
                    status: data.status,
                    isEmailVerified: data.isEmailVerified,
                }
            }).unwrap().then((res) => {
                if (res.success) {
                    fetchUsers({
                        search: query || undefined,
                        status: statusFilter === "all" ? undefined : statusFilter,
                        page: currentPage,
                        limit: pageSize,
                    })
                    toast.success("Saved successfully", res?.message ?? "User updated");
                    closeDialog();

                }
            }).catch((err) => {
                const errMsg = err?.data?.message || "Failed to update user. Please try again.";
                toast.error("Error", errMsg);
            });
        } else {
            if (isCreating) return;
            await createUser({
                firstName: data.firstName,
                lastName: data.lastName,
                email: data.email || undefined,
                phone: data.phone || undefined,
                role: data.role,
                groupId: data.groupId || undefined,
                status: data.status,
                isEmailVerified: data.isEmailVerified,
                password: data.password || undefined,
            }).unwrap().then((res) => {
                if (res.success) {
                    fetchUsers({
                        search: query || undefined,
                        status: statusFilter === "all" ? undefined : statusFilter,
                        page: currentPage,
                        limit: pageSize,
                    })
                    toast.success("Saved successfully", res?.message ?? "User created");
                    closeDialog();

                }
            }).catch((err) => {
                const errMsg = err?.data?.message || "Failed to create user. Please try again.";
                toast.error("Error", errMsg);
            });
        }
    }

    function toggleSelected(userId: string) {
        setSelectedUsers((currentSelected) =>
            currentSelected.includes(userId)
                ? currentSelected.filter((id) => id !== userId)
                : [...currentSelected, userId],
        );
    }

    function toggleAllVisible() {
        if (filteredUsers && filteredUsers.length === 0) return;
        const visibleIds = filteredUsers && filteredUsers.map((user) => user.id);
        if (!visibleIds) return;
        const allVisibleSelected = visibleIds.every((id) => selectedUsers.includes(id));

        setSelectedUsers((currentSelected) =>
            allVisibleSelected
                ? currentSelected.filter((id) => !visibleIds.includes(id))
                : Array.from(new Set([...currentSelected, ...visibleIds])),
        );
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    function updateStatus(_userId: string, _status: UserStatus) {
        // setUsers((currentUsers) =>
        //     currentUsers.map((user) =>
        //         user.id === userId ? { ...user, status, updatedAt: new Date().toISOString() } : user,
        //     ),
        // );
        setMenuUserId(null);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    function bulkUpdateStatus(_status: UserStatus) {
        // setUsers((currentUsers) =>
        //     currentUsers.map((user) =>
        //         selectedUsers.includes(user.id)
        //             ? { ...user, status, updatedAt: new Date().toISOString() }
        //             : user,
        //     ),
        // );
        setSelectedUsers([]);
    }

    return (
        <div className="flex flex-col gap-6">
            <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <p className="panel-tag">Admin Console</p>
                    <h2 className="headline mt-2 text-2xl text-foreground sm:text-3xl">User Management</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-(--ib-muted)">
                        Create accounts, assign roles, and control access across the IBIBINA network.
                    </p>
                </div>
                <button className="ib-btn-primary justify-center" onClick={openCreateDialog}>
                    <Plus size={16} />
                    Create User
                </button>
            </header>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                    {
                        label: "Total Users",
                        value: paginationMeta?.totalItems ?? filteredUsers.length,
                        icon: Users,
                        detail: "All registered accounts",
                    },
                    { label: "Active Users", value: activeCount, icon: CheckCircle2, detail: "Can access the portal" },
                    { label: "Inactive Users", value: pendingCount, icon: Mail, detail: "Awaiting activation or setup" },
                    { label: "Admins", value: adminCount, icon: ShieldCheck, detail: "Verified email access" },
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

            <section className="rounded-xl border border-(--ib-line) bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-(--ib-line) p-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-1 flex-col gap-3 sm:flex-row">
                        <label className="flex min-h-10 flex-1 items-center gap-2 rounded-xl border border-(--ib-line) bg-[#f4f7fc] px-3 text-sm text-(--ib-muted)">
                            <Search size={16} />
                            <input
                                value={query}
                                onChange={(event) => {
                                    setCurrentPage(1);
                                    setQuery(event.target.value);
                                }}
                                placeholder="Search names, codes, emails, phones, roles, or groups"
                                className="w-full bg-transparent text-foreground outline-none placeholder:text-[#375176]/55"
                            />
                        </label>
                        <Dropdown
                            aria-label="Filter users by status"
                            value={statusFilter}
                            onValueChange={(nextStatus) => {
                                setCurrentPage(1);
                                setStatusFilter(nextStatus as typeof statusFilter);
                            }}
                            options={statusOptions}
                            containerClassName="min-w-40"
                            className="min-h-10"
                        />
                        <Dropdown
                            aria-label="Rows per page"
                            value={String(pageSize)}
                            onValueChange={(nextLimit) => {
                                setCurrentPage(1);
                                setPageSize(Number(nextLimit));
                            }}
                            options={pageSizeOptions}
                            containerClassName="min-w-32"
                            className="min-h-10"
                        />
                    </div>

                    {selectedCount > 0 && (
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold text-(--ib-muted)">
                                {selectedCount} selected
                            </span>
                            <button className="ib-btn-secondary py-2 text-xs" onClick={() => bulkUpdateStatus("active")}>
                                Activate
                            </button>
                            <button className="ib-btn-secondary py-2 text-xs" onClick={() => bulkUpdateStatus("suspended")}>
                                Suspend
                            </button>
                        </div>
                    )}
                </div>

                {isError && (
                    <div className="border-b border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        Failed to load users. Please retry by changing filters or reloading.
                    </div>
                )}

                <Table
                    headers={[
                        {
                            ...userTableHeaders[0],
                            label: (
                                <input
                                    type="checkbox"
                                    checked={
                                        filteredUsers && filteredUsers.length > 0 &&
                                        filteredUsers.every((user) => selectedUsers.includes(user.id))
                                    }
                                    onChange={toggleAllVisible}
                                    aria-label="Select all visible users"
                                    className="h-4 w-4 rounded border-(--ib-line)"
                                />
                            ),
                        },
                        ...userTableHeaders.slice(1),
                    ]}
                    colSpan={8}
                    isLoading={isLoading || isFetching}
                    loadingText="Loading users..."
                    isEmpty={!isLoading && !isFetching && filteredUsers.length === 0}
                    emptyState={
                        <div className="grid min-h-56 place-items-center px-4 py-12 text-center">
                            <div>
                                <UserPlus className="mx-auto text-(--ib-muted)" size={32} />
                                <h3 className="mt-3 font-bold text-foreground">No users found</h3>
                                <p className="mt-1 text-sm text-(--ib-muted)">Adjust the filters or create a new user.</p>
                            </div>
                        </div>
                    }
                    pagination={{
                        currentPage: paginationMeta?.currentPage ?? currentPage,
                        totalPages: paginationMeta?.totalPages ?? 1,
                        totalItems: paginationMeta?.totalItems,
                        itemCount: paginationMeta?.itemCount ?? filteredUsers.length,
                        isLoading: isLoading || isFetching,
                        onPageChange: (nextPage) => {
                            const boundedPage = Math.max(1, Math.min(nextPage, paginationMeta?.totalPages ?? 1));
                            setCurrentPage(boundedPage);
                            setSelectedUsers([]);
                        },
                    }}
                >
                    {filteredUsers.map((user) => (
                        <tr key={user.id} className="transition-colors hover:bg-[#f4f7fc]/70">
                            <td className="px-4 py-4">
                                <input
                                    type="checkbox"
                                    checked={selectedUsers.includes(user.id)}
                                    onChange={() => toggleSelected(user.id)}
                                    aria-label={`Select ${fullName(user)}`}
                                    className="h-4 w-4 rounded border-(--ib-line)"
                                />
                            </td>
                            <td className="px-4 py-4">
                                <div className="flex items-center gap-3">
                                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#0b3978] text-xs font-bold text-white">
                                        {initials(user)}
                                    </span>
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="font-bold text-foreground">{fullName(user)}</p>
                                            {user?.user_code && (
                                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                                                    {user.user_code}
                                                </span>
                                            )}
                                        </div>
                                        <p className="truncate text-xs text-(--ib-muted)">
                                            {user.email || "No email"}
                                        </p>
                                        <p className="text-xs text-[#375176]/65">{user.phone || "No phone"}</p>
                                    </div>
                                </div>
                            </td>
                            <td className="px-4 py-4">
                                <div className="flex flex-col items-start gap-1">
                                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${roleClasses(user.role as UserRole)}`}>
                                        {titleCase(user.role)}
                                    </span>
                                    {user.role === "admin" && (
                                        <span className="text-[11px] font-semibold text-(--ib-muted)">
                                            {user.isEmailVerified ? "Email verified" : "Email not verified"}
                                        </span>
                                    )}
                                </div>
                            </td>
                            <td className="px-4 py-4 font-medium text-(--ib-muted)">
                                {user.group?.name || "No group"}
                            </td>
                            <td className="px-4 py-4">
                                <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${statusClasses(user.status as UserStatus)}`}>
                                    {titleCase(user.status)}
                                </span>
                            </td>
                            <td className="px-4 py-4 text-(--ib-muted)">{formatDate(user.createdAt)}</td>
                            <td className="px-4 py-4 text-(--ib-muted)">{formatDate(user.updatedAt)}</td>
                            <td className="relative px-4 py-4 text-right">
                                <button
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-(--ib-line) text-(--ib-muted) transition-colors hover:bg-[#f4f7fc]"
                                    onClick={() => setMenuUserId(menuUserId === user.id ? null : user.id)}
                                    aria-label={`Actions for ${fullName(user)}`}
                                >
                                    <MoreHorizontal size={18} />
                                </button>
                                {menuUserId === user.id && (
                                    <div className="absolute right-4 top-14 z-20 w-56 rounded-xl border border-(--ib-line) bg-white p-1.5 text-left shadow-xl">
                                        <button
                                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-(--ib-muted) hover:bg-[#f4f7fc]"
                                            onClick={() => openViewDialog(user)}
                                        >
                                            <Eye size={15} />
                                            View profile
                                        </button>
                                        <button
                                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-(--ib-muted) hover:bg-[#f4f7fc]"
                                            onClick={() => openEditDialog(user)}
                                        >
                                            <Edit3 size={15} />
                                            Edit user
                                        </button>
                                        <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-(--ib-muted) hover:bg-[#f4f7fc]"
                                            onClick={() => setIsResettingPasswordOpen(true)}
                                        >
                                            <KeyRound size={15} />
                                            Reset password or PIN
                                        </button>
                                        <button
                                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-(--ib-muted) hover:bg-[#f4f7fc]"
                                            onClick={() => openSuspendDialog(user)}
                                        >
                                            <CircleSlash size={15} />
                                            {user.status === "active" ? "Suspend access" : "Activate access"}
                                        </button>
                                        <button
                                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
                                            onClick={() => openDeleteDialog(user)}
                                        >
                                            <Trash2 size={15} />
                                            Delete user
                                        </button>
                                    </div>
                                )}
                            </td>
                        </tr>
                    ))}
                </Table>
            </section>

            <Modal
                isOpen={Boolean(viewingUser)}
                onClose={closeViewDialog}
                title={viewingUser ? fullName(viewingUser) : "User details"}
                description="Read-only account information for the selected user."
            >
                {viewingUser && (
                    <div className="grid gap-5">
                        <div className="flex items-start gap-4 rounded-xl border border-(--ib-line) bg-[#f4f7fc] p-4">
                            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#0b3978] text-sm font-bold text-white">
                                {initials(viewingUser)}
                            </span>
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h4 className="headline text-lg text-foreground">{fullName(viewingUser)}</h4>
                                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${roleClasses(viewingUser.role)}`}>
                                        {titleCase(viewingUser.role)}
                                    </span>
                                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${statusClasses(viewingUser.status)}`}>
                                        {titleCase(viewingUser.status)}
                                    </span>
                                </div>
                                <p className="mt-1 text-sm text-(--ib-muted)">{viewingUser.email || "No email address"}</p>
                                <p className="mt-1 text-sm text-(--ib-muted)">{viewingUser.phone || "No phone number"}</p>
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="rounded-xl border border-(--ib-line) bg-white p-4">
                                <p className="text-xs font-semibold uppercase tracking-wide text-[#375176]/70">Account</p>
                                <dl className="mt-3 grid gap-3 text-sm">
                                    <div>
                                        <dt className="text-(--ib-muted)">User ID</dt>
                                        <dd className="mt-1 break-all font-semibold text-foreground">{viewingUser.id}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-(--ib-muted)">User Code</dt>
                                        <dd className="mt-1 font-semibold text-foreground">{viewingUser.user_code || "Not assigned"}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-(--ib-muted)">Group</dt>
                                        <dd className="mt-1 font-semibold text-foreground">{viewingUser.group?.name || "No group"}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-(--ib-muted)">Email Verification</dt>
                                        <dd className="mt-1 font-semibold text-foreground">
                                            {viewingUser.role === "admin"
                                                ? viewingUser.isEmailVerified
                                                    ? "Verified"
                                                    : "Not verified"
                                                : "Not applicable"}
                                        </dd>
                                    </div>
                                </dl>
                            </div>

                            <div className="rounded-xl border border-(--ib-line) bg-white p-4">
                                <p className="text-xs font-semibold uppercase tracking-wide text-[#375176]/70">Activity</p>
                                <dl className="mt-3 grid gap-3 text-sm">
                                    <div>
                                        <dt className="text-(--ib-muted)">Created</dt>
                                        <dd className="mt-1 font-semibold text-foreground">{formatDate(viewingUser.createdAt)}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-(--ib-muted)">Last Updated</dt>
                                        <dd className="mt-1 font-semibold text-foreground">{formatDate(viewingUser.updatedAt)}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-(--ib-muted)">Primary Contact</dt>
                                        <dd className="mt-1 font-semibold text-foreground">
                                            {viewingUser.email || viewingUser.phone || "No contact details"}
                                        </dd>
                                    </div>
                                </dl>
                            </div>
                        </div>

                        <div className="flex justify-end border-t border-(--ib-line) pt-4">
                            <Button type="button" variant="secondary" onClick={closeViewDialog}>
                                Close
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            <Modal
                isOpen={Boolean(actionUser && actionType)}
                onClose={closeActionDialog}
                title={actionType === "delete" ? "Delete user" : actionType === "suspend" ? "Suspend user" : "Activate user"}
                description={
                    actionUser
                        ? actionType === "delete"
                            ? `This will permanently remove ${fullName(actionUser)} from the system.`
                            : actionType === "suspend"
                                ? `This will block ${fullName(actionUser)} from accessing the portal.`
                                : `This will restore access for ${fullName(actionUser)}.`
                        : ""
                }
            >
                {actionUser && (
                    <div className="grid gap-4">
                        <div className="rounded-xl border border-(--ib-line) bg-[#f4f7fc] p-4 text-sm text-(--ib-muted)">
                            <p>
                                <span className="font-semibold text-foreground">User:</span> {fullName(actionUser)}
                            </p>
                            <p className="mt-1">
                                <span className="font-semibold text-foreground">Role:</span> {titleCase(actionUser.role)}
                            </p>
                            <p className="mt-1">
                                <span className="font-semibold text-foreground">Current status:</span> {titleCase(actionUser.status)}
                            </p>
                        </div>
                        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                            <Button type="button" variant="secondary" onClick={closeActionDialog}>
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                variant={actionType === "delete" ? "danger" : "primary"}
                                loading={isUpdating || isDeleting}
                                loadingText={actionType === "delete" ? "Deleting..." : "Saving..."}
                                onClick={confirmAction}
                            >
                                {actionType === "delete"
                                    ? "Delete user"
                                    : actionType === "suspend"
                                        ? "Suspend access"
                                        : "Activate access"}
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            {isCreateOpen && (
                <Modal onClose={closeDialog} title={editingUser ? "Edit User" : "Create User"}
                    description={watchedRole === "admin"
                        ? "Admins use email and a password; email verification controls login."
                        : "Non-admin users use a Rwandan phone number and PIN."}
                    isOpen={isCreateOpen}
                >
                    <form className="grid gap-4 p-5" onSubmit={handleSubmit(submitUser)}>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Input
                                label="First name"
                                placeholder="E.g. Alice"
                                error={errors.firstName?.message}
                                {...register("firstName")}
                            />
                            <Input
                                label="Last name"
                                placeholder="E.g. Mugisha"
                                error={errors.lastName?.message}
                                {...register("lastName")}
                            />
                        </div>


                        <div className="grid gap-4 sm:grid-cols-2">
                            <Input
                                label={`Email${watchedRole === "admin" ? " *" : " (optional)"}`}
                                type="email"
                                placeholder="name@example.com"
                                error={errors.email?.message}
                                {...register("email")}
                            />
                            <Input
                                label={`Phone${watchedRole !== "admin" ? " *" : " (optional)"}`}
                                placeholder="+2507xxxxxxxx"
                                error={errors.phone?.message}
                                {...register("phone")}
                            />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <Controller
                                name="status"
                                control={control}
                                render={({ field }) => (
                                    <Dropdown
                                        label="Status"
                                        value={field.value}
                                        onValueChange={field.onChange}
                                        options={userStatusOptions}
                                        error={errors.status?.message}
                                    />
                                )}
                            />
                            <Controller
                                name="role"
                                control={control}
                                render={({ field }) => (
                                    <Dropdown
                                        label="Role"
                                        value={field.value}
                                        onValueChange={field.onChange}
                                        options={roleOptions}
                                        error={errors.role?.message}
                                    />
                                )}
                            />
                            {(watchedRole === "chairperson" || watchedRole === "finance" || watchedRole === "member") && (
                                <Controller
                                    name="groupId"
                                    control={control}
                                    render={({ field }) => (
                                        <Dropdown
                                            label="Group (optional)"
                                            value={field.value ?? ""}
                                            onValueChange={field.onChange}
                                            options={groupOptions}
                                            placeholder="No group"
                                            error={errors.groupId?.message}
                                        />
                                    )}
                                />
                            )}
                        </div>
                        {
                            watchedRole === 'admin' && (
                                <Input
                                    label="Temporary password"
                                    type="text"
                                    placeholder="password123"
                                    error={errors.password?.message}
                                    {...register("password")}
                                />
                            )
                        }

                        {watchedRole === "admin" && (
                            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-(--ib-line) bg-[#f4f7fc] px-3 py-3 text-sm font-semibold text-foreground">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-(--ib-line)"
                                    {...register("isEmailVerified")}
                                />
                                Mark email as verified
                            </label>
                        )}

                        <div className="flex flex-col-reverse gap-2 border-t border-(--ib-line) pt-4 sm:flex-row sm:justify-end">
                            <button type="button" className="ib-btn-secondary justify-center" onClick={closeDialog}>
                                Cancel
                            </button>
                            <Button type="submit" loading={isSubmitting} loadingText={editingUser ? "Saving…" : "Creating…"}>
                                {editingUser ? "Save Changes" : "Create User"}
                            </Button>
                        </div>
                    </form>

                </Modal>
            )}
            <Modal
                isOpen={isResettingPasswordOpen}
                onClose={() => setIsResettingPasswordOpen(false)}
                title="Reset password or PIN"
                description="Set a new temporary password or PIN for the user. They will be prompted to change it on their next login."
            >
                <div className="p-5">
                    <p className="mb-4 text-sm text-(--ib-muted)">
                        This will allow you to set a new temporary password (for admins) or PIN (for non-admins) for the user. They will be required to change it when they next log in.
                    </p>
                    <div className="">
                        <Button type="button" onClick={() => () => { }} className="ib-btn-primary w-full">
                            Set new temporary password/PIN
                        </Button>
                        <Button type="button" variant="secondary" onClick={() => setIsResettingPasswordOpen(false)} className="ib-btn-secondary w-full mt-2">
                            Cancel
                        </Button>

                    </div>
                </div>
            </Modal>
        </div>
    );
}
