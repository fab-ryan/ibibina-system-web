import { BaseResponse } from "@/types/res/base";
import { api } from "../apiEntry";
import {
  GetActiveGroupsResponse,
  Group,
  GroupPaginationResponse,
  User,
} from "@/types";

type CreateGroupPayload = {
  name: string;
  purpose: string;
  startDate?: string;
  description?: string;
  province?: string;
  district?: string;
  sector?: string;
  cell?: string;
  village?: string;
  meetingLocation?: string;
  contactPhone?: string;
  foundedBy?: string;
  registrationNumber?: string;
  notes?: string;
  isActive?: boolean;
  settings: {
    contributionAmount: number;
    contributionCurrency: string;
    contributionFrequency: string;
    meetingDay: string;
    allowLoans: boolean;
    maxLoanMultiplier: number;
    gracePeriodDays: number;
    penaltyRate?: number;
    memberLimit?: number;
    additional?: Record<string, string | number | boolean>;
    loanSettings?: {
      interestRate: number;
      maxDurationMonths: number;
      collateralRequired: boolean;
      collateralTypes?: string[];
      minContributionsForLoan?: number;
      maxLoanMultiplier: number;
    };
  };
};

type CreateGroupResponse = {
  success: boolean;
  message?: string;
  data?: { id: string };
};

type UpdateGroupPayload = {
  groupId: string;
  data: Partial<CreateGroupPayload>;
};

export const groupApi = api.injectEndpoints({
  endpoints: (build) => ({
    getGroups: build.query<
      GroupPaginationResponse,
      { search?: string; page?: number; limit?: number } | void
    >({
      query: (params) => {
        const urlParams = new URLSearchParams();
        if (params?.search) urlParams.append("search", params.search);
        if (params?.page) urlParams.append("page", params.page.toString());
        if (params?.limit) urlParams.append("limit", params.limit.toString());
        return { url: `/groups?${urlParams.toString()}`, method: "GET" };
      },
    }),
    getActiveGroups: build.query<GetActiveGroupsResponse, void>({
      query: () => ({ url: "/groups/active", method: "GET" }),
    }),
    createGroup: build.mutation<CreateGroupResponse, CreateGroupPayload>({
      query: (data) => ({
        url: "/groups",
        method: "POST",
        body: data,
      }),
    }),
    updateGroup: build.mutation<CreateGroupResponse, UpdateGroupPayload>({
      query: ({ groupId, data }) => ({
        url: `/groups/${groupId}`,
        method: "PATCH",
        body: data,
      }),
    }),
    assignChairperson: build.mutation<
      CreateGroupResponse,
      { groupId: string; userId: string }
    >({
      query: ({ groupId, userId }) => ({
        url: `/groups/${groupId}/assign-chairperson`,
        method: "PATCH",
        body: { userId },
      }),
      invalidatesTags: ["Groups", "Users"],
    }),
    changeMembershipRole: build.mutation<
      CreateGroupResponse,
      { groupId: string; userId: string; newRole: string }
    >({
      query: ({ groupId, userId, newRole }) => ({
        url: `/groups/${groupId}/assign-role`,
        method: "PATCH",
        body: { userId, role: newRole },
      }),
      invalidatesTags: ["Groups", "Users"],
    }),
    getGroupById: build.query<BaseResponse<Group>, string>({
      query: (groupId) => ({
        url: `/groups/${groupId}`,
        method: "GET",
      }),
    }),
    getGroupMembers: build.query<
      BaseResponse<{
        chairperson: User[];
        secretary: User[];
        finance: User[];
        member: User[];
      }>,
      { groupId: string }
    >({
      query: ({ groupId }) => ({
        url: `/groups/${groupId}/members`,
        method: "GET",
      }),
    }),
  }),
});

export const {
  useLazyGetGroupsQuery,
  useGetActiveGroupsQuery,
  useCreateGroupMutation,
  useUpdateGroupMutation,
  useAssignChairpersonMutation,
  useChangeMembershipRoleMutation,
  useGetGroupByIdQuery,
  useLazyGetGroupByIdQuery,
useLazyGetGroupMembersQuery} = groupApi;
