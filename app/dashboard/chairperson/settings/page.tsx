/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect } from "react";
import { useLazyGetGroupByIdQuery, useUpdateGroupMutation } from "@/api/group";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/contexts/toast-context";
import GroupForm, {
    defaultGroupValues,
    toGroupPayload,
    type ContributionFrequency,
    type GroupFormValues,
    type GroupPurpose,
    type MeetingDay,
} from "@/components/dashboard/group-form";

const VALID_PURPOSES: GroupPurpose[] = [
    "savings", "netgrowth", "investment", "social-support", "agriculture", "other",
];

function normalizePurpose(value: string | undefined | null): GroupPurpose {
    return VALID_PURPOSES.includes((value || "") as GroupPurpose)
        ? (value as GroupPurpose)
        : "other";
}

export default function ChairpersonSettingsPage() {
    const { user } = useAuth();
    const toast = useToast();
    const groupId = user?.groupId ?? user?.group?.id;

    const [fetchGroup, { data: groupData, isLoading, error }] = useLazyGetGroupByIdQuery();
    const [updateGroup, { isLoading: isUpdating }] = useUpdateGroupMutation();

    useEffect(() => {
        if (groupId) fetchGroup(groupId);
    }, [fetchGroup, groupId]);

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
                group.settings?.loanSettings?.minContributionsForLoan ?? 0,
            ),
        }
        : undefined;

    async function handleUpdate(values: GroupFormValues) {
        if (!groupId) return;
        try {
            const response = await updateGroup({
                groupId,
                data: toGroupPayload(values),
            }).unwrap();
            toast.success("Settings saved", response?.message ?? "Group updated successfully.");
        } catch (err: any) {
            toast.error("Error", err?.data?.message ?? "Failed to save settings. Please try again.");
        }
    }

    return (
        <div className="grid gap-6">
            <header>
                <p className="panel-tag">Group Operations</p>
                <h2 className="headline mt-2 text-2xl text-(--ib-ink) sm:text-3xl">
                    {isLoading ? "Loading..." : group ? `Settings — ${group.name}` : "Group Settings"}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-(--ib-muted)">
                    Update your group profile, location, contribution rules, and loan policy.
                </p>
            </header>

            {isLoading && (
                <div className="rounded-xl border border-(--ib-line) bg-white p-10 text-center text-sm text-(--ib-muted) shadow-sm">
                    Loading group data...
                </div>
            )}

            {!isLoading && error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
                    Failed to load group settings. Please reload the page.
                </div>
            )}

            {!isLoading && !error && initialValues && (
                <div className="rounded-xl border border-(--ib-line) bg-white shadow-sm">
                    <div className="border-b border-(--ib-line) p-5">
                        <h3 className="headline text-xl text-(--ib-ink)">Group Information</h3>
                        <p className="mt-1 text-sm text-(--ib-muted)">Changes are applied immediately on submit.</p>
                    </div>
                    <div className="p-5">
                        <GroupForm
                            mode="edit"
                            initialValues={initialValues}
                            submitLabel={isUpdating ? "Saving..." : "Save Changes"}
                            isSubmitting={isUpdating}
                            onSubmit={handleUpdate}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
