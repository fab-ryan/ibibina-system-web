/* eslint-disable @typescript-eslint/no-explicit-any */
import { PaginatedResponse, BaseResponse } from "./base";

export type GroupPaginationResponse = PaginatedResponse<Group[]>;
export type GetActiveGroupsResponse = BaseResponse<Group[]>;
export interface Group {
  id: string;
  name: string;
  groupe_code: string;
  purpose: string;
  startDate: null;
  description: string;
  province: null;
  district: null;
  sector: null;
  cell: null;
  village: null;
  meetingLocation: null;
  contactPhone: null;
  foundedBy: null;
  registrationNumber: null;
  notes: null;
  isActive: boolean;
  settings: Settings;
  createdAt: Date;
  updatedAt: Date;
}
export interface Settings {
  additional: Record<string, any>;
  allowLoans: boolean;
  meetingDay: string;
  penaltyRate: number;
  gracePeriodDays: number;
  maxLoanMultiplier: number;
  contributionAmount: number;
  contributionCurrency: string;
  contributionFrequency: string;
  loanSettings?: {
    interestRate: number;
    maxDurationMonths: number;
    collateralRequired: boolean;
    collateralTypes?: string[];
    /** Minimum paid contributions before a member may apply for a loan */
    minContributionsForLoan?: number;
  };
}
