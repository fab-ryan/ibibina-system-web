/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCreateGroupMutation } from "@/api/group";
import GroupForm, { defaultGroupValues, toGroupPayload, type GroupFormValues } from "@/components/dashboard/group-form";
import { useToast } from "@/contexts/toast-context";

export default function CreateGroupPage() {
    const router = useRouter();
    const toast = useToast();
    const [createGroup, { isLoading }] = useCreateGroupMutation();
    

    async function handleCreate(values: GroupFormValues) {
        try {
            const response = await createGroup(toGroupPayload(values)).unwrap();
            toast.success("Group created", response?.message ?? "Group created successfully.");
            router.push("/dashboard/admin/organizations");
        } catch (error: any) {
            const message = error?.data?.message || "Failed to create group. Please try again.";
            toast.error("Error", message);
        }
    }


    return (
        <div className="grid gap-6">
            <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <Link href="/dashboard/admin/organizations" className="inline-flex items-center gap-2 text-sm font-bold text-(--ib-accent) hover:underline">
                        <ArrowLeft size={16} />
                        Back to groups
                    </Link>
                    <p className="panel-tag mt-4">Admin Console</p>
                    <h2 className="headline mt-2 text-2xl text-foreground sm:text-3xl">Register Group</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-(--ib-muted)">
                        Create the group profile, location, contribution settings, and loan policy before assigning a chairperson.
                    </p>
                </div>
            </header>

            <div className="rounded-xl border border-(--ib-line) bg-white shadow-sm">
                <div className="border-b border-(--ib-line) p-5">
                    <h3 className="headline text-xl text-foreground">Group Information</h3>
                    <p className="mt-1 text-sm text-(--ib-muted)">Fields match the backend group entity and settings object.</p>
                </div>

                <div className="p-5">
                    <GroupForm
                        mode="create"
                        initialValues={defaultGroupValues}
                        submitLabel={isLoading ? "Creating..." : "Register Group"}
                        isSubmitting={isLoading}
                        onCancel={() => router.push("/dashboard/admin/organizations")}
                        onSubmit={handleCreate}
                    />
                </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
                <CheckCircle2 size={18} />
                Validation is handled with yup and react-hook-form.
            </div>
        </div>
    );
}
