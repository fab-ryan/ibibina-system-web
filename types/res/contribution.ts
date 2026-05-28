import { BaseResponse, PaginatedResponse } from "./base";
import { User } from "./auth";

export type ContributionStatus =
  | "pending"
  | "paid"
  | "partial"
  | "missed"
  | "waived";

export interface Contribution {
  id: string;
  userId: string;
  groupId: string;
  period?: string;
  dueDate: string;
  amount: number;
  paidAmount?: number;
  currency: string;
  cycleNumber?: number;
  status: ContributionStatus;
  notes?: string;
  waivedBy?: string;
  waivedAt?: string;
  waiveReason?: string;
  createdAt: string;
  updatedAt: string;
  user?: User;
}

export interface ContributionGroupSummary {
  groupId: string;
  currency: string;
  totalExpected: number;
  totalCollected: number;
  totalPending: number;
  totalMissed: number;
  collectionRate: number;
  paidCount: number;
  pendingCount: number;
  missedCount: number;
  waivedCount: number;
  partialCount: number;
  period?: string;
}

export type MemberCycleProgressStatus =
  | "paid"
  | "missed"
  | "upcoming"
  | "future";

export interface MemberCycleProgressItem {
  label: string;
  status: MemberCycleProgressStatus;
}

export interface MemberCycleProgress {
  cadence: "weekly" | "monthly";
  groupId: string;
  year: number;
  periods: MemberCycleProgressItem[];
}

export interface RecordContributionPayload {
  userId?: string;
  period?: string;
  dueDate: string;
  amount?: number;
  paidAmount?: number;
  currency?: string;
  cycleNumber?: number;
  status?: ContributionStatus;
  notes?: string;
}

export interface BulkRecordPayload {
  period?: string;
  dueDate: string;
  amount?: number;
  currency?: string;
  paidUserIds: string[];
}

export interface GeneratePeriodPayload {
  period?: string;
  dueDate: string;
  amount?: number;
  currency?: string;
}

export type PaymentMethod = "cash" | "momo" | "bank" | "cheque" | "other";

export interface PayContributionPayload {
  paymentMethod: PaymentMethod;
  paidAmount: number;
  paidAt: string;
  momoRef?: string;
  bankRef?: string;
  referenceFileUrl?: string;
  notes?: string;
  phoneNumber?: string;
}

export interface WaiveContributionPayload {
  reason: string;
}

export interface ContributionFilter {
  groupId?: string;
  userId?: string;
  period?: string;
  status?: ContributionStatus | "";
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export type ContributionsListResponse = PaginatedResponse<Contribution[]>;
export type ContributionResponse = BaseResponse<Contribution>;
export type ContributionGroupSummaryResponse =
  BaseResponse<ContributionGroupSummary>;
export type MemberCycleProgressResponse = BaseResponse<MemberCycleProgress>;
