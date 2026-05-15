/* eslint-disable react-hooks/incompatible-library */
"use client";

import { CircleDollarSign, Plus, Users } from "lucide-react";
import { Controller, Resolver, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useEffect } from "react";
import { Dropdown, Input } from "@/components/ui";
import { getProvinces, getDistricts, getSectors, getVillages, getCells } from "@/utils";


export type GroupPurpose =
    | "savings"
    | "netgrowth"
    | "investment"
    | "social-support"
    | "agriculture"
    | "other";

export type ContributionFrequency = "weekly" | "monthly";
export type MeetingDay =
    | "monday"
    | "tuesday"
    | "wednesday"
    | "thursday"
    | "friday"
    | "saturday"
    | "sunday";

export type GroupFormValues = {
    name: string;
    purpose: GroupPurpose;
    startDate: string;
    description: string;
    province: string;
    district: string;
    sector: string;
    cell: string;
    village: string;
    meetingLocation: string;
    contactPhone: string;
    foundedBy: string;
    registrationNumber: string;
    notes: string;
    isActive: boolean;
    contributionAmount: string;
    contributionCurrency: string;
    contributionFrequency: ContributionFrequency;
    meetingDay: MeetingDay;
    allowLoans: boolean;
    maxLoanMultiplier: string;
    gracePeriodDays: string;
    penaltyRate: string;
    memberLimit: string;
    interestRate: string;
    maxDurationMonths: string;
    collateralRequired: boolean;
    collateralTypes: string;
    minContributionsForLoan: string;
};

export const groupPurposeOptions = [
    { label: "Savings", value: "savings" },
    { label: "Netgrowth", value: "netgrowth" },
    { label: "Investment", value: "investment" },
    { label: "Social Support", value: "social-support" },
    { label: "Agriculture", value: "agriculture" },
    { label: "Other", value: "other" },
];

export const contributionFrequencyOptions = [
    { label: "Weekly", value: "weekly" },
    { label: "Monthly", value: "monthly" },
];

export const meetingDayOptions = [
    { label: "Monday", value: "monday" },
    { label: "Tuesday", value: "tuesday" },
    { label: "Wednesday", value: "wednesday" },
    { label: "Thursday", value: "thursday" },
    { label: "Friday", value: "friday" },
    { label: "Saturday", value: "saturday" },
    { label: "Sunday", value: "sunday" },
];

export const defaultGroupValues: GroupFormValues = {
    name: "",
    purpose: "savings",
    startDate: "",
    description: "",
    province: "",
    district: "",
    sector: "",
    cell: "",
    village: "",
    meetingLocation: "",
    contactPhone: "",
    foundedBy: "",
    registrationNumber: "",
    notes: "",
    isActive: true,
    contributionAmount: "1000",
    contributionCurrency: "RWF",
    contributionFrequency: "weekly",
    meetingDay: "saturday",
    allowLoans: true,
    maxLoanMultiplier: "3",
    gracePeriodDays: "7",
    penaltyRate: "0.05",
    memberLimit: "50",
    interestRate: "0.1",
    maxDurationMonths: "6",
    collateralRequired: false,
    collateralTypes: "land, livestock, equipment, savings, other",
    minContributionsForLoan: "3",
};

export const groupFormSchema = yup.object({
    name: yup.string().trim().required("Group name is required."),
    purpose: yup
        .mixed<GroupPurpose>()
        .oneOf(["savings", "netgrowth", "investment", "social-support", "agriculture", "other"])
        .required("Purpose is required."),
    startDate: yup.string().default(""),
    description: yup.string().default(""),
    province: yup.string().default(""),
    district: yup.string().default(""),
    sector: yup.string().default(""),
    cell: yup.string().default(""),
    village: yup.string().default(""),
    meetingLocation: yup.string().default(""),
    contactPhone: yup
        .string()
        .default("")
        .test("rw-phone", "Enter a valid Rwandan phone number.", (value) => {
            if (!value) return true;
            return /^(?:\+250|0)?7[2389]\d{7}$/.test(value);
        }),
    foundedBy: yup.string().default(""),
    registrationNumber: yup.string().default(""),
    notes: yup.string().default(""),
    isActive: yup.boolean().default(true),
    contributionAmount: yup.string().required("Contribution amount is required."),
    contributionCurrency: yup.string().trim().required("Currency is required."),
    contributionFrequency: yup
        .mixed<ContributionFrequency>()
        .oneOf(["weekly", "monthly"])
        .required("Contribution frequency is required."),
    meetingDay: yup
        .mixed<MeetingDay>()
        .oneOf(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"])
        .required("Meeting day is required."),
    allowLoans: yup.boolean().default(true),
    maxLoanMultiplier: yup.string().required("Max loan multiplier is required."),
    gracePeriodDays: yup.string().required("Grace period is required."),
    penaltyRate: yup.string().required("Penalty rate is required."),
    memberLimit: yup.string().required("Member limit is required."),
    interestRate: yup.string().required("Interest rate is required."),
    maxDurationMonths: yup.string().required("Loan duration is required."),
    collateralRequired: yup.boolean().default(false),
    collateralTypes: yup.string().default(""),
    minContributionsForLoan: yup.string().required("Minimum contributions is required."),
});

export type GroupFormSubmitValues = yup.InferType<typeof groupFormSchema>;

function toNumber(value: string) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function toStringArray(value: string) {
    return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
}

export function toGroupPayload(values: GroupFormSubmitValues) {
    return {
        name: values.name.trim(),
        purpose: values.purpose,
        startDate: values.startDate || undefined,
        description: values.description.trim() || undefined,
        province: values.province.trim() || undefined,
        district: values.district.trim() || undefined,
        sector: values.sector.trim() || undefined,
        cell: values.cell.trim() || undefined,
        village: values.village.trim() || undefined,
        meetingLocation: values.meetingLocation.trim() || undefined,
        contactPhone: values.contactPhone.trim() || undefined,
        foundedBy: values.foundedBy.trim() || undefined,
        registrationNumber: values.registrationNumber.trim() || undefined,
        notes: values.notes.trim() || undefined,
        isActive: values.isActive,
        settings: {
            contributionAmount: toNumber(values.contributionAmount),
            contributionCurrency: values.contributionCurrency.trim(),
            contributionFrequency: values.contributionFrequency,
            meetingDay: values.meetingDay,
            allowLoans: values.allowLoans,
            maxLoanMultiplier: toNumber(values.maxLoanMultiplier),
            gracePeriodDays: toNumber(values.gracePeriodDays),
            penaltyRate: toNumber(values.penaltyRate),
            memberLimit: toNumber(values.memberLimit),
            loanSettings: values.allowLoans
                ? {
                    interestRate: toNumber(values.interestRate),
                    maxDurationMonths: toNumber(values.maxDurationMonths),
                    collateralRequired: values.collateralRequired,
                    collateralTypes: toStringArray(values.collateralTypes),
                    minContributionsForLoan: toNumber(values.minContributionsForLoan),
                    maxLoanMultiplier: toNumber(values.maxLoanMultiplier),
                }
                : undefined,
        },
    };
}

export type GroupFormMode = "create" | "edit";

type GroupFormProps = {
    mode: GroupFormMode;
    initialValues?: Partial<GroupFormValues>;
    onSubmit: (values: GroupFormValues) => Promise<void> | void;
    onCancel?: () => void;
    submitLabel: string;
    isSubmitting?: boolean;
};

export default function GroupForm({
    mode,
    initialValues,
    onSubmit,
    onCancel,
    submitLabel,
    isSubmitting = false,
}: GroupFormProps) {
    const isEditMode = mode === "edit";
    const {
        register,
        handleSubmit,
        control,
        reset,
        watch,
        setValue,
        formState: { errors },
    } = useForm<GroupFormValues>({
        resolver: yupResolver(groupFormSchema) as unknown as Resolver<GroupFormValues>,
        defaultValues: { ...defaultGroupValues, ...initialValues },
    });

    const allowLoans = watch("allowLoans");
    const province = watch("province");
    const district = watch("district");
    const sector = watch("sector");
    const cell = watch("cell");

    useEffect(() => {
        reset({ ...defaultGroupValues, ...initialValues });
    }, [initialValues, reset]);

    return (
        <form
            className="grid gap-5"
            onSubmit={handleSubmit(async (values) => {
                await onSubmit(values);
            })}
            aria-label={isEditMode ? "Edit group form" : "Create group form"}
        >
            <div className="grid gap-4 md:grid-cols-2">
                <Input label="Group name" {...register("name")} error={errors.name?.message} placeholder="E.g. Kigali Savers"
                    required
                />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Controller
                    name="purpose"
                    control={control}
                    render={({ field }) => (
                        <Dropdown label="Purpose / theme" value={field.value} onValueChange={field.onChange} options={groupPurposeOptions} error={errors.purpose?.message} />
                    )}
                />
                <Input label="Start date" type="date" {...register("startDate")} error={errors.startDate?.message} />
                <Input label="Registration no." {...register("registrationNumber")} error={errors.registrationNumber?.message} placeholder="Official reference" />
            </div>

            <label className="grid gap-1.5 text-sm font-semibold text-foreground">
                Description
                <textarea
                    {...register("description")}
                    rows={3}
                    className="rounded-xl border border-(--ib-line) px-3 py-2 font-normal outline-none focus:border-(--ib-accent)"
                    placeholder="What this group does and who it serves"
                />
                {errors.description?.message && <span className="text-sm font-normal text-red-600">{errors.description.message}</span>}
            </label>

            <div className="grid gap-4 md:grid-cols-3">
                <Controller
                    name="province"
                    control={control}
                    render={({ field }) => (
                        <Dropdown
                            label="Province"
                            value={field.value}
                            onValueChange={(val) => {
                                field.onChange(val);
                                setValue("district", "");
                                setValue("sector", "");
                                setValue("cell", "");
                                setValue("village", "");
                            }}
                            options={getProvinces()}
                            error={errors.province?.message}
                        />
                    )}
                />
                <Controller
                    name="district"
                    control={control}
                    render={({ field }) => (
                        <Dropdown
                            label="District"
                            value={field.value}
                            onValueChange={(val) => {
                                field.onChange(val);
                                setValue("sector", "");
                                setValue("cell", "");
                                setValue("village", "");
                            }}
                            options={getDistricts(province)}
                            error={errors.district?.message}
                            disabled={!province}
                        />
                    )}
                />
                <Controller
                    name="sector"
                    control={control}
                    render={({ field }) => (
                        <Dropdown
                            label="Sector"
                            value={field.value}
                            onValueChange={(val) => {
                                field.onChange(val);
                                setValue("cell", "");
                                setValue("village", "");
                            }}
                            options={getSectors(province, district)}
                            error={errors.sector?.message}
                            disabled={!district}
                        />
                    )}
                />
                <Controller
                    name="cell"
                    control={control}
                    render={({ field }) => (
                        <Dropdown
                            label="Cell"
                            value={field.value}
                            onValueChange={(val) => {
                                field.onChange(val);
                                setValue("village", "");
                            }}
                            options={getCells(province, district, sector)}
                            error={errors.cell?.message}
                            disabled={!sector}
                        />
                    )}
                />
                <Controller
                    name="village"
                    control={control}
                    render={({ field }) => (
                        <Dropdown
                            label="Village"
                            value={field.value}
                            onValueChange={field.onChange}
                            options={getVillages(province, district, sector, cell)}
                            error={errors.village?.message}
                            disabled={!cell}
                        />
                    )}
                />
                <Input label="Meeting location" {...register("meetingLocation")} error={errors.meetingLocation?.message} />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Input label="Contact phone" {...register("contactPhone")} error={errors.contactPhone?.message} placeholder="+2507xxxxxxxx" />
                <Input label="Founded by" {...register("foundedBy")} error={errors.foundedBy?.message} />
                <label className="flex items-center gap-3 rounded-xl border border-(--ib-line) bg-[#f4f7fc] px-3 py-3 text-sm font-semibold text-foreground">
                    <input type="checkbox" {...register("isActive")} className="h-4 w-4 rounded border-(--ib-line)" />
                    Active group
                </label>
            </div>

            <section className="rounded-xl border border-(--ib-line) bg-[#f8fbff] p-4">
                <h4 className="font-bold text-foreground">Contribution Settings</h4>
                <div className="mt-4 grid gap-4 md:grid-cols-4">
                    <Input label="Amount" type="number" {...register("contributionAmount")} error={errors.contributionAmount?.message} />
                    <Input label="Currency" {...register("contributionCurrency")} error={errors.contributionCurrency?.message} />
                    <Controller
                        name="contributionFrequency"
                        control={control}
                        render={({ field }) => (
                            <Dropdown label="Frequency" value={field.value} onValueChange={field.onChange} options={contributionFrequencyOptions} error={errors.contributionFrequency?.message} />
                        )}
                    />
                    <Controller
                        name="meetingDay"
                        control={control}
                        render={({ field }) => (
                            <Dropdown label="Meeting day" value={field.value} onValueChange={field.onChange} options={meetingDayOptions} error={errors.meetingDay?.message} />
                        )}
                    />
                </div>
            </section>

            <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
                <CircleDollarSign size={18} />
                Loan settings will only apply if &quot;Allow loans&quot; is enabled. All loan-related fields are required when loans are allowed.
            </div>
            <section className="rounded-xl border border-(--ib-line) bg-white p-4">

                <div className="flex flex-col gap-3  items-start sm:justify-between">
                    <div className=" border border-(--ib-line) bg-[#f8fbff] p-4 rounded-xl w-full flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="">
                            <h4 className="flex items-center gap-2 font-bold text-foreground">
                                <CircleDollarSign size={18} />
                                Loan Settings
                            </h4>
                            <p className="text-xs text-(--ib-muted)">Configuration of loan settings for the group.</p>
                            <p className="text-xs text-(--ib-muted)">Configuration on Interest rating</p>
                        </div>
                        <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <input type="checkbox" {...register("allowLoans")} className="h-4 w-4 rounded border-(--ib-line)" />
                            Allow loans
                        </label>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-4 w-full">
                        <Input label="Max multiplier" type="number" {...register("maxLoanMultiplier")} error={errors.maxLoanMultiplier?.message}
                            placeholder="Number of time user can get interest"
                        />
                        <Input label="Grace days" type="number" {...register("gracePeriodDays")} error={errors.gracePeriodDays?.message}

                        />
                        <Input label="Penalty rate" type="number" step="0.01" {...register("penaltyRate")} error={errors.penaltyRate?.message} />
                        <Input label="Member limit" type="number" {...register("memberLimit")} error={errors.memberLimit?.message} />
                    </div>

                    {allowLoans && (
                        <div className="mt-4 grid gap-4 md:grid-cols-4 w-full">
                            <Input label="Interest rate" type="number" step="0.01" {...register("interestRate")} error={errors.interestRate?.message} />
                            <Input label="Max duration" type="number" {...register("maxDurationMonths")} error={errors.maxDurationMonths?.message} />
                            <Input label="Min contributions" type="number" {...register("minContributionsForLoan")} error={errors.minContributionsForLoan?.message} />
                            <Input label="Min contributions" type="number" {...register("minContributionsForLoan")} error={errors.minContributionsForLoan?.message} />
                            <label className="flex items-center gap-2 rounded-xl border border-(--ib-line) bg-[#f4f7fc] px-3 py-3 text-sm font-semibold text-foreground">
                                <input type="checkbox" {...register("collateralRequired")} className="h-4 w-4 rounded border-(--ib-line)" />
                                Collateral required
                            </label>
                            <Input label="Collateral types" {...register("collateralTypes")} error={errors.collateralTypes?.message} containerClassName="md:col-span-4" />
                        </div>
                    )}
                </div>
            </section>

            <label className="grid gap-1.5 text-sm font-semibold text-foreground">
                Notes
                <textarea
                    {...register("notes")}
                    rows={3}
                    className="rounded-xl border border-(--ib-line) px-3 py-2 font-normal outline-none focus:border-(--ib-accent)"
                    placeholder="Internal notes for administrators"
                />
                {errors.notes?.message && <span className="text-sm font-normal text-red-600">{errors.notes.message}</span>}
                {errors.notes?.message && <span className="text-sm font-normal text-red-600">{errors.notes.message}</span>}
            </label>
            <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
                <Users size={18} />
                You can create the group first, then assign a chairperson and members later.

            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-(--ib-line) pt-4 sm:flex-row sm:justify-end">
                {onCancel && (
                    <button type="button" className="ib-btn-secondary justify-center" onClick={onCancel}>
                        Cancel
                    </button>
                )}
                <button type="submit" className="ib-btn-primary justify-center" disabled={isSubmitting}>
                    <Plus size={16} />
                    {submitLabel}
                </button>
            </div>
        </form>
    );
}
