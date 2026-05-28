import { api } from "@/api/apiEntry";
import { BaseResponse } from "@/types/res/base";
import {
  GetGroupLoansResponse,
  GetRepaymentScheduleResponse,
  ItemsItem,
} from "@/types/res/loan";

export const loanApi = api.injectEndpoints({
  endpoints: (build) => ({
    getLoans: build.query<
      GetGroupLoansResponse,
      {
        groupId?: string;
        status?: string;
        page?: number;
        limit?: number;
      }
    >({
      query: ({ groupId, status, page, limit }) => ({
        url: "/loans/",
        params: { groupId, status, page, limit },
      }),
      providesTags: ["Loans"],
    }),

    approveLoan: build.mutation<
      BaseResponse<ItemsItem>,
      { id: string; notes?: string; approvedAmount: number | undefined }
    >({
      query: ({ id, notes, approvedAmount }) => ({
        url: `/loans/${id}/approve`,
        method: "POST",
        body: { approvalNotes: notes, approvedAmount },
      }),
      invalidatesTags: ["Loans"],
    }),

    rejectLoan: build.mutation<
      BaseResponse<ItemsItem>,
      { id: string; reason: string }
    >({
      query: ({ id, reason }) => ({
        url: `/loans/${id}/reject`,
        method: "POST",
        body: { reason },
      }),
      invalidatesTags: ["Loans"],
    }),

    disburseLoan: build.mutation<
      BaseResponse<ItemsItem>,
      { id: string; disbursedAmount?: number; notes?: string }
    >({
      query: ({ id, disbursedAmount, notes }) => ({
        url: `/loans/${id}/disburse`,
        method: "POST",
        body: { disbursedAmount, notes },
      }),
      invalidatesTags: ["Loans"],
    }),
    getSummary: build.query<
      BaseResponse<{
        groupId: string;
        totalLoans: number;
        totalDisbursed: number;
        totalRepaid: number;
        pendingCount: number;
        activeCount: number;
        closedCount: number;
        defaultedCount: number;
      }>,
      {
        groupId?: string;
      }
    >({
      query: ({ groupId }) => ({
        url: `/loans/group/${groupId}/summary`,
        method: "GET",
      }),
      providesTags: ["Loans"],
    }),

    requestLoan: build.mutation<
      BaseResponse<ItemsItem>,
      {
        requestedAmount: number;
        termMonths: number;
        purpose: string;
        collateralDescription?: string;
        groupId?: string;
        userId?: string;
        notes?: string;
      }
    >({
      query: (body) => ({
        url: "/loans",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Loans"],
    }),

    getLoanById: build.query<BaseResponse<ItemsItem>, { id: string }>({
      query: ({ id }) => ({ url: `/loans/${id}` }),
      providesTags: ["Loans"],
    }),

    getMyLoans: build.query<GetGroupLoansResponse, void>({
      query: () => ({ url: "/loans/my" }),
      providesTags: ["Loans"],
    }),

    getLoanEligibility: build.query<
      BaseResponse<{ eligible: boolean; maxAmount: number; reason?: string }>,
      void
    >({
      query: () => ({ url: "/loans/eligibility" }),
    }),

    getRepaymentSchedule: build.query<
      GetRepaymentScheduleResponse,
      { id: string; status?: string; page?: number; limit?: number }
    >({
      query: ({ id, status, page, limit }) => ({
        url: `/loans/${id}/schedule`,
        params: { status, page, limit },
      }),
      providesTags: ["Loans"],
    }),

    recordRepayment: build.mutation<
      BaseResponse<{ id: string; status: string; amountPaid: number }>,
      {
        id: string;
        data: {
          amountPaid: number;
          paymentMethod?: string;
          paidAt?: string;
          momoRef?: string;
          bankRef?: string;
          notes?: string;
        };
      }
    >({
      query: ({ id, data }) => ({
        url: `/loans/${id}/repay`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Loans"],
    }),

    markRepaymentMissed: build.mutation<
      BaseResponse<{ id: string; status: string }>,
      { id: string; repaymentId: string; notes?: string }
    >({
      query: ({ id, repaymentId, notes }) => ({
        url: `/loans/${id}/repayments/${repaymentId}/miss`,
        method: "PATCH",
        body: { notes },
      }),
      invalidatesTags: ["Loans"],
    }),
  }),
});

export const {
  useGetLoansQuery,
  useLazyGetLoansQuery,
  useApproveLoanMutation,
  useRejectLoanMutation,
  useDisburseLoanMutation,
  useGetSummaryQuery,
  useRequestLoanMutation,
  useGetLoanByIdQuery,
  useLazyGetLoanByIdQuery,
  useGetMyLoansQuery,
  useLazyGetMyLoansQuery,
  useGetLoanEligibilityQuery,
  useLazyGetLoanEligibilityQuery,
  useGetRepaymentScheduleQuery,
  useLazyGetRepaymentScheduleQuery,
  useRecordRepaymentMutation,
  useMarkRepaymentMissedMutation,
} = loanApi;
