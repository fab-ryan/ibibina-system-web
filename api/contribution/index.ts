import { api } from "@/api/apiEntry";
import {
  BulkRecordPayload,
  ContributionFilter,
  ContributionGroupSummaryResponse,
  ContributionResponse,
  ContributionsListResponse,
  GeneratePeriodPayload,
  MemberCycleProgressResponse,
  PayContributionPayload,
  RecordContributionPayload,
  WaiveContributionPayload,
} from "@/types/res/contribution";
import { BaseResponse } from "@/types/res/base";

export const contributionApi = api.injectEndpoints({
  endpoints: (build) => ({
    getContributions: build.query<
      ContributionsListResponse,
      ContributionFilter
    >({
      query: (filters) => ({
        url: "/contributions",
        params: {
          ...filters,
          status: filters.status || undefined,
        },
      }),
      providesTags: ["Contributions"],
    }),

    getContributionGroupSummary: build.query<
      ContributionGroupSummaryResponse,
      { groupId: string; period?: string }
    >({
      query: ({ groupId, period }) => ({
        url: `/contributions/summary/group/${groupId}`,
        params: period ? { period } : {},
      }),
      providesTags: ["Contributions"],
    }),

    getMemberCycleProgress: build.query<
      MemberCycleProgressResponse,
      { groupId?: string; userId?: string; year?: number }
    >({
      query: (params) => ({
        url: "/contributions/summary/member/cycle-progress",
        params,
      }),
      providesTags: ["Contributions"],
    }),

    recordContribution: build.mutation<
      ContributionResponse,
      RecordContributionPayload
    >({
      query: (body) => ({
        url: "/contributions",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Contributions"],
    }),

    bulkRecordContributions: build.mutation<
      BaseResponse<unknown>,
      BulkRecordPayload
    >({
      query: (body) => ({
        url: "/contributions/bulk",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Contributions"],
    }),

    generatePeriodContributions: build.mutation<
      BaseResponse<unknown>,
      GeneratePeriodPayload
    >({
      query: (body) => ({
        url: "/contributions/generate-period",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Contributions"],
    }),

    markPeriodMissed: build.mutation<
      BaseResponse<unknown>,
      { groupId: string; period: string }
    >({
      query: ({ groupId, period }) => ({
        url: `/contributions/groups/${groupId}/periods/${period}/mark-missed`,
        method: "PATCH",
      }),
      invalidatesTags: ["Contributions"],
    }),

    payContribution: build.mutation<
      ContributionResponse,
      { id: string; data: PayContributionPayload }
    >({
      query: ({ id, data }) => ({
        url: `/contributions/${id}/pay`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Contributions"],
    }),

    waiveContribution: build.mutation<
      ContributionResponse,
      { id: string; data: WaiveContributionPayload }
    >({
      query: ({ id, data }) => ({
        url: `/contributions/${id}/waive`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["Contributions"],
    }),

    updateContribution: build.mutation<
      ContributionResponse,
      { id: string; data: Partial<RecordContributionPayload> }
    >({
      query: ({ id, data }) => ({
        url: `/contributions/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["Contributions"],
    }),

    deleteContribution: build.mutation<void, string>({
      query: (id) => ({
        url: `/contributions/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Contributions"],
    }),
  }),
});

export const {
  useGetContributionsQuery,
  useLazyGetContributionsQuery,
  useGetContributionGroupSummaryQuery,
  useLazyGetContributionGroupSummaryQuery,
  useGetMemberCycleProgressQuery,
  useRecordContributionMutation,
  useBulkRecordContributionsMutation,
  useGeneratePeriodContributionsMutation,
  useMarkPeriodMissedMutation,
  usePayContributionMutation,
  useWaiveContributionMutation,
  useUpdateContributionMutation,
  useDeleteContributionMutation,
} = contributionApi;
