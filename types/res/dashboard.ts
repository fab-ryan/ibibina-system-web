import { BaseResponse } from "./base";

// ── Finance dashboard ────────────────────────────────────────────────────────

interface DashboardGroup {
  name: string;
  code: string;
  totalMembers: number;
  nextMeeting: string;
}

export interface FinanceDashboardStats {
  totalContributions: number;
  totalLoansIssued: number;
  pendingPenalties: number;
  interestEarned: number;
  cashOnHand: number;
  activeLoanCount: number;
}

export interface RecentActivityItem {
  id: string;
  type: "contribution" | "loan" | "penalty" | "repayment" | string;
  member: string;
  amount: number;
  date: string;
  status: "paid" | "pending" | "disbursed" | string;
}

export interface DashboardAlert {
  id: string;
  message: string;
  severity: "error" | "warning" | "info" | string;
}

export type FinanceDashboardResponse = BaseResponse<{
  group: DashboardGroup;
  stats: FinanceDashboardStats;
  recentActivity: RecentActivityItem[];
  alerts: DashboardAlert[];
}>;

// ── Contribution overview ────────────────────────────────────────────────────

export interface ContributionOverviewQueryParams {
  month?: string;
  year?: string;
}

export type ContributionOverviewResponse = BaseResponse<{
  totalCollected: number;
  expectedTotal: number;
  collectionRate: number;
  membersContributed: number;
  totalMembers: number;
  monthly: Array<{ month: string; collected: number; expected: number }>;
}>;

// ── Finance report ───────────────────────────────────────────────────────────

export interface FinanceReportSummary {
  totalContributions: number;
  totalLoansIssued: number;
  totalRepaid: number;
  interestEarned: number;
  pendingPenalties: number;
  cashOnHand: number;
  activeLoanCount: number;
  memberCount: number;
}

export interface FinanceReportMonthly {
  month: string;
  contributions: number;
  repayments: number;
  penalties: number;
}

export interface FinanceReportData {
  group: { name: string; code: string };
  summary: FinanceReportSummary;
  monthly: FinanceReportMonthly[];
}

export type FinanceReportResponse = BaseResponse<FinanceReportData>;
