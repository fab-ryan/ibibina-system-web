/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useLazyGetGroupByIdQuery, useUpdateGroupMutation } from "@/api/group";
import GroupForm, {
    defaultGroupValues,
    toGroupPayload,
    type GroupFormValues,
    type GroupPurpose,
    type ContributionFrequency,
    type MeetingDay,
} from "@/components/dashboard/group-form";
import { useToast } from "@/contexts/toast-context";

const VALID_PURPOSES: GroupPurpose[] = [
    "savings", "netgrowth", "investment", "social-support", "agriculture", "other",
];

function normalizePurpose(value: string | undefined | null): GroupPurpose {
    return VALID_PURPOSES.includes((value || "") as GroupPurpose)
        ? (value as GroupPurpose)
        : "other";
}

export default function EditGroupPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const toast = useToast();

    const [fetchGroup, { data: groupData, isLoading, error }] = useLazyGetGroupByIdQuery();
    const [updateGroup, { isLoading: isUpdating }] = useUpdateGroupMutation();

    useEffect(() => {
        if (params.id) {
            fetchGroup(params.id);
        }
    }, [fetchGroup, params.id]);

    const group = groupData?.data;

    const initialValues: GroupFormValues | undefined = group
        ? {
            ...defaultGroupValues,
            name: group.name,
            purpose: normalizePurpose(group.purpose),
            startDate: group.startDate ? String(group.startDate) : "",
            description: group.description ?? "",
            province: group.province ?? "",
            district: group.district ?? "",
            sector: group.sector ?? "",
            cell: group.cell ?? "",
            village: group.village ?? "",
            meetingLocation: group.meetingLocation ?? "",
            contactPhone: group.contactPhone ?? "",
            foundedBy: group.foundedBy ?? "",
            registrationNumber: group.registrationNumber ?? "",
            notes: group.notes ?? "",
            isActive: group.isActive,
            contributionAmount: String(group.settings?.contributionAmount ?? 1000),
            contributionCurrency: group.settings?.contributionCurrency ?? "RWF",
            contributionFrequency: (group.settings?.contributionFrequency === "monthly"
                ? "monthly"
                : "weekly") as ContributionFrequency,
            meetingDay: (group.settings?.meetingDay ?? "saturday") as MeetingDay,
            allowLoans: group.settings?.allowLoans ?? true,
            maxLoanMultiplier: String(group.settings?.maxLoanMultiplier ?? 3),
            gracePeriodDays: String(group.settings?.gracePeriodDays ?? 7),
            penaltyRate: String(group.settings?.penaltyRate ?? 0.05),
            memberLimit: String((group.settings as any)?.memberLimit ?? 50),
            interestRate: String(group.settings?.loanSettings?.interestRate ?? 0),
            maxDurationMonths: String(group.settings?.loanSettings?.maxDurationMonths ?? 0),
            collateralRequired: group.settings?.loanSettings?.collateralRequired ?? false,
            collateralTypes: group.settings?.loanSettings?.collateralTypes?.join(", ") ?? "",
            minContributionsForLoan: String(
                group.settings?.loanSettings?.minContributionsForLoan ?? 0
            ),
        }
        : undefined;

    async function handleUpdate(values: GroupFormValues) {
        if (!params.id) return;
        try {
            const response = await updateGroup({
                groupId: params.id,
                data: toGroupPayload(values),
            }).unwrap();
            toast.success("Group updated", response?.message ?? "Group updated successfully.");
            router.push("/dashboard/admin/organizations");
        } catch (error: any) {
            const message = error?.data?.message || "Failed to update group. Please try again.";
            toast.error("Error", message);
        }
    }

    return (
        <div className="grid gap-6">
            <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <Link
                        href="/dashboard/admin/organizations"
                        className="inline-flex items-center gap-2 text-sm font-bold text-(--ib-accent) hover:underline"
                    >
                        <ArrowLeft size={16} />
                        Back to groups
                    </Link>
                    <p className="panel-tag mt-4">Admin Console</p>
                    <h2 className="headline mt-2 text-2xl text-foreground sm:text-3xl">
                        {isLoading ? "Loading..." : group ? `Edit — ${group.name}` : "Group not found"}
                    </h2>
                    {group && (
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-(--ib-muted)">
                            Update the group profile, location, contribution settings, and loan policy.
                        </p>
                    )}
                </div>
            </header>

            {isLoading && (
                <div className="rounded-xl border border-(--ib-line) bg-white p-10 text-center text-sm text-(--ib-muted) shadow-sm">
                    Loading group data...
                </div>
            )}

            {!isLoading && error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
                    Failed to load group. Please go back and try again.
                </div>
            )}

            {!isLoading && !error && initialValues && (
                <div className="rounded-xl border border-(--ib-line) bg-white shadow-sm">
                    <div className="border-b border-(--ib-line) p-5">
                        <h3 className="headline text-xl text-foreground">Group Information</h3>
                        <p className="mt-1 text-sm text-(--ib-muted)">Changes are saved immediately on submit.</p>
                    </div>
                    <div className="p-5">
                        <GroupForm
                            mode="edit"
                            initialValues={initialValues}
                            submitLabel={isUpdating ? "Saving..." : "Save Changes"}
                            isSubmitting={isUpdating}
                            onCancel={() => router.push("/dashboard/admin/organizations")}
                            onSubmit={handleUpdate}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
