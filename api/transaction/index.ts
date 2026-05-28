import { api } from "@/api/apiEntry";
import { BaseResponse } from "@/types/res/base";
import {
  GetPenaltiesResponse,
  GetPenaltyResponse,
  GetTransactionResponse,
  GetTransactionsResponse,
  IssuePenaltyPayload,
  PenaltyGroupSummary,
  PenaltyMemberSummary,
  PenaltyReason,
  PenaltyStatus,
  SettlePenaltyPayload,
  WaivePenaltyPayload,
} from "@/types/res/transaction";

export const transactionApi = api.injectEndpoints({
  endpoints: (build) => ({
    // ── Transactions ────────────────────────────────────────────────────────
    getTransactions: build.query<
      GetTransactionsResponse,
      {
        groupId?: string;
        type?: string;
        userId?: string;
        page?: number;
        limit?: number;
      }
    >({
      query: (params) => ({ url: "/transactions", params }),
      providesTags: ["Transactions"],
    }),

    getTransactionById: build.query<GetTransactionResponse, { id: string }>({
      query: ({ id }) => ({ url: `/transactions/${id}` }),
      providesTags: ["Transactions"],
    }),

    approveTransaction: build.mutation<GetTransactionResponse, { id: string }>({
      query: ({ id }) => ({
        url: `/transactions/${id}/approve`,
        method: "PATCH",
      }),
      invalidatesTags: ["Transactions"],
    }),

    rejectTransaction: build.mutation<
      GetTransactionResponse,
      { id: string; reason?: string }
    >({
      query: ({ id, reason }) => ({
        url: `/transactions/${id}/reject`,
        method: "PATCH",
        body: reason ? { reason } : {},
      }),
      invalidatesTags: ["Transactions"],
    }),

    // ── Penalties ────────────────────────────────────────────────────────────
    getPenalties: build.query<
      GetPenaltiesResponse,
      {
        groupId?: string;
        status?: PenaltyStatus;
        reason?: PenaltyReason;
        userId?: string;
        contributionId?: string;
        from?: string;
        to?: string;
        page?: number;
        limit?: number;
      }
    >({
      query: (params) => ({ url: "/penalties", params }),
      providesTags: ["Penalties"],
    }),

    getGroupPenaltySummary: build.query<
      BaseResponse<PenaltyGroupSummary>,
      { groupId: string }
    >({
      query: ({ groupId }) => ({ url: `/penalties/summary/group/${groupId}` }),
      providesTags: ["Penalties"],
    }),

    getMemberPenaltySummary: build.query<
      BaseResponse<PenaltyMemberSummary>,
      { userId: string; groupId: string }
    >({
      query: ({ userId, groupId }) => ({
        url: `/penalties/summary/member/${userId}`,
        params: { groupId },
      }),
      providesTags: ["Penalties"],
    }),

    issuePenalty: build.mutation<GetPenaltyResponse, IssuePenaltyPayload>({
      query: (body) => ({
        url: "/penalties",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Penalties", "Transactions"],
    }),

    settlePenalty: build.mutation<
      GetPenaltyResponse,
      { id: string; data: SettlePenaltyPayload }
    >({
      query: ({ id, data }) => ({
        url: `/penalties/${id}/settle`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["Penalties", "Transactions"],
    }),

    waivePenalty: build.mutation<
      GetPenaltyResponse,
      { id: string; data: WaivePenaltyPayload }
    >({
      query: ({ id, data }) => ({
        url: `/penalties/${id}/waive`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["Penalties", "Transactions"],
    }),
  }),
});

export const {
  useGetTransactionsQuery,
  useLazyGetTransactionsQuery,
  useGetTransactionByIdQuery,
  useApproveTransactionMutation,
  useRejectTransactionMutation,
  useGetPenaltiesQuery,
  useLazyGetPenaltiesQuery,
  useGetGroupPenaltySummaryQuery,
  useGetMemberPenaltySummaryQuery,
  useIssuePenaltyMutation,
  useSettlePenaltyMutation,
  useWaivePenaltyMutation,
} = transactionApi;
