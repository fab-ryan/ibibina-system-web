import { PaginatedResponse, BaseResponse } from "./base";
import { User } from "./auth";

// ── Transaction ──────────────────────────────────────────────────────────────

export type TransactionType =
  | "contribution"
  | "loan_disbursement"
  | "loan_repayment"
  | "penalty"
  | "penalty_payment"
  | "withdrawal"
  | "deposit";

export type TransactionDirection = "credit" | "debit";

export type TransactionApprovalStatus =
  | "pending_approval"
  | "approved"
  | "rejected";

export interface Transaction {
  id: string;
  groupId: string;
  userId: string;
  user?: User;
  type: TransactionType;
  direction: TransactionDirection;
  amount: string | number;
  currency: string;
  referenceId: string | null;
  referenceType: string | null;
  paymentMethod: string | null;
  momoRef: string | null;
  bankRef: string | null;
  phoneNumber?: string | null;
  referenceFileUrl?: string | null;
  paidAt?: string | null;
  description: string | null;
  notes: string | null;
  recordedBy: string | null;
  approvalStatus?: TransactionApprovalStatus | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  transactionDate: string;
  createdAt: string;
  updatedAt: string;
}

export type GetTransactionsResponse = PaginatedResponse<Transaction[]>;
export type GetTransactionResponse = BaseResponse<Transaction>;

// ── Penalty ───────────────────────────────────────────────────────────────────

export type PenaltyStatus = "pending" | "paid" | "waived";

export type PenaltyReason =
  | "late_payment"
  | "missed_payment"
  | "missed_meeting"
  | "rule_violation"
  | "other";

export type PaymentMethod = "momo" | "bank" | "cash" | "cheque";

export interface Penalty {
  id: string;
  groupId: string;
  userId: string;
  user?: User;
  contributionId?: string | null;
  reason: PenaltyReason;
  description?: string | null;
  amount: string | number;
  currency: string;
  status: PenaltyStatus;
  paymentMethod?: PaymentMethod | null;
  paidAt?: string | null;
  momoRef?: string | null;
  bankRef?: string | null;
  issuedById?: string | null;
  issuedBy?: User | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type GetPenaltiesResponse = PaginatedResponse<Penalty[]>;
export type GetPenaltyResponse = BaseResponse<Penalty>;

// ── Penalty summary ───────────────────────────────────────────────────────────

export interface PenaltyGroupSummary {
  groupId: string;
  totalCount: number;
  pendingCount: number;
  paidCount: number;
  waivedCount: number;
  totalAmount: number;
  pendingAmount: number;
  collectedAmount: number;
  currency: string;
}

export interface PenaltyMemberSummary {
  userId: string;
  groupId: string;
  totalCount: number;
  pendingCount: number;
  paidCount: number;
  totalAmount: number;
  pendingAmount: number;
  currency: string;
}

// ── Request payloads ─────────────────────────────────────────────────────────

export interface IssuePenaltyPayload {
  userId: string;
  groupId: string;
  contributionId?: string;
  reason: PenaltyReason;
  description?: string;
  amount: number;
  currency?: string;
}

export interface SettlePenaltyPayload {
  paymentMethod: PaymentMethod;
  paidAt?: string;
  momoRef?: string;
  bankRef?: string;
  notes?: string;
}

export interface WaivePenaltyPayload {
  reason: string;
}
