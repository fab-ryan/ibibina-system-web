/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Controller, Resolver, useForm, useWatch } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { UserPlus } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useCreateUserMutation } from "@/api/users";
import { useToast } from "@/contexts/toast-context";
import { Dropdown, Input } from "@/components/ui";
import Button from "@/components/ui/button";
import type { UserRole, UserStatus } from "@/types";

// ── Constants ────────────────────────────────────────────────────────────────
const phoneRegex = /^(?:\+250|0)?7[2389]\d{7}$/;

const roleOptions = [
    { label: "Member", value: "member" },
    { label: "Secretary", value: "secretary" },
    { label: "Finance", value: "finance" },
];

const statusOptions = [
    { label: "Active", value: "active" },
    { label: "Inactive", value: "inactive" },
    { label: "Suspended", value: "suspended" },
];

// ── Schema ───────────────────────────────────────────────────────────────────
const schema = yup.object({
    firstName: yup.string().required("First name is required."),
    lastName: yup.string().required("Last name is required."),
    phone: yup
        .string()
        .required("Phone number is required.")
        .matches(phoneRegex, "Enter a valid Rwandan phone number (+2507XXXXXXXX)."),
    email: yup.string().email("Enter a valid email address.").default(""),
    role: yup
        .mixed<UserRole>()
        .oneOf(["member", "secretary", "finance"])
        .required()
        .default("member"),
    status: yup
        .mixed<UserStatus>()
        .oneOf(["active", "inactive", "suspended"])
        .required()
        .default("active"),
});

type FormData = {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    role: UserRole;
    status: UserStatus;
};

const defaultValues: FormData = {
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    role: "member",
    status: "active",
};

// ── Page ─────────────────────────────────────────────────────────────────────
export default function AddGroupMemberPage() {
    const { user } = useAuth();
    const groupId = user?.groupId ?? user?.group?.id;
    const toast = useToast();

    const [createUser, { isLoading: isCreating }] = useCreateUserMutation();

    const {
        register,
        handleSubmit,
        control,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<FormData>({
        resolver: yupResolver(schema) as unknown as Resolver<FormData>,
        defaultValues,
    });

    const watchedRole = useWatch({ control, name: "role" });

    async function onSubmit(data: FormData) {
        if (isCreating) return;
        try {
            const res = await createUser({
                firstName: data.firstName,
                lastName: data.lastName,
                phone: data.phone || undefined,
                email: data.email || undefined,
                role: data.role,
                status: data.status,
                groupId: groupId || undefined,
            }).unwrap();

            if (res.success) {
                toast.success("Member added", res.message ?? "User was created and added to your group.");
                reset(defaultValues);
            }
        } catch (err: any) {
            toast.error("Error", err?.data?.message ?? "Failed to create user. Please try again.");
        }
    }

    return (
        <div className="grid gap-6">
            <header>
                <p className="panel-tag">Group Operations</p>
                <h2 className="headline mt-2 text-2xl text-(--ib-ink) sm:text-3xl">Add Member</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-(--ib-muted)">
                    Register a new member or officer in your group. Non-admin users access the system using their phone
                    number and a PIN issued by the backend.
                </p>
            </header>

            <form
                className="rounded-xl border border-(--ib-line) bg-white p-6 shadow-sm"
                onSubmit={handleSubmit(onSubmit)}
                noValidate
            >
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
                    <Input
                        label="Phone"
                        placeholder="+2507xxxxxxxx"
                        error={errors.phone?.message}
                        {...register("phone")}
                    />
                    <Input
                        label="Email (optional)"
                        type="email"
                        placeholder="name@example.com"
                        error={errors.email?.message}
                        {...register("email")}
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
                    <Controller
                        name="status"
                        control={control}
                        render={({ field }) => (
                            <Dropdown
                                label="Status"
                                value={field.value}
                                onValueChange={field.onChange}
                                options={statusOptions}
                                error={errors.status?.message}
                            />
                        )}
                    />
                </div>

                <div className="mt-5 rounded-xl border border-(--ib-line) bg-[#f4f7fc] p-4">
                    <p className="text-sm font-semibold text-(--ib-ink)">Access setup</p>
                    <p className="mt-1 text-sm text-(--ib-muted)">
                        {watchedRole === "finance"
                            ? "Finance officers can record contributions and manage loan disbursements."
                            : watchedRole === "secretary"
                                ? "Secretaries can manage meeting records and member communications."
                                : "Members can view contributions, request loans, and attend meetings."}
                        {" "}A PIN will be issued automatically by the backend upon account creation.
                    </p>
                </div>

                <div className="mt-5 flex justify-end border-t border-(--ib-line) pt-4">
                    <Button type="submit" loading={isSubmitting} loadingText="Adding…">
                        <UserPlus size={16} />
                        Add to Group
                    </Button>
                </div>
            </form>
        </div>
    );
}

