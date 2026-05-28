import { User } from "./auth";
import { PaginatedResponse, BaseResponse } from "./base";

export type RepaymentStatus = "pending" | "paid" | "partial" | "missed";

export interface LoanRepayment {
  id: string;
  loanId: string;
  installmentNumber: number;
  dueDate: string;
  principalAmount: string | number;
  interestAmount: string | number;
  totalAmount: string | number;
  amountPaid: string | number | null;
  status: RepaymentStatus;
  paidAt: string | null;
  paymentMethod: string | null;
  momoRef: string | null;
  bankRef: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type GetRepaymentScheduleResponse = BaseResponse<{
  items: LoanRepayment[];
  meta: {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
  };
}>;

export interface ItemsItem {
  id: string;
  userId: string;
  user: User;
  groupId: string;
  requestedAmount: string;
  disbursedAmount: null;
  currency: string;
  interestRate: null;
  termMonths: number;
  totalDue: null;
  installmentAmount: null;
  totalInstallments: null;
  remainingBalance: null;
  status: string;
  purpose: string;
  collateralDescription: null;
  approvedById: null;
  approvedAt: null;
  approvalNotes: null;
  rejectedById: null;
  rejectedAt: null;
  rejectionReason: null;
  disbursedById: null;
  disbursedAt: null;
  firstRepaymentDate: null;
  closedAt: null;
  settingsSnapshot: null;
  notes: null;
  createdAt: string;
  updatedAt: string;
}

export type GetGroupLoansResponse = PaginatedResponse<ItemsItem[]>;
