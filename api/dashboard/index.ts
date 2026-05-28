import { api } from "@/api/apiEntry";
import {
  ContributionOverviewQueryParams,
  ContributionOverviewResponse,
  FinanceDashboardResponse,
  FinanceReportResponse,
} from "@/types/res/dashboard";

export const dashboardApi = api.injectEndpoints({
  overrideExisting: true,
  endpoints: (build) => ({
    getFinanceDashboard: build.query<FinanceDashboardResponse, void>({
      query: () => ({ url: "/dashboard/staff/overview", method: "GET" }),
    }),
    getContributionOverview: build.query<
      ContributionOverviewResponse,
      ContributionOverviewQueryParams
    >({
      query: (params) => ({
        url: "/dashboard/staff/contributions",
        method: "GET",
        params,
      }),
    }),
    getFinanceReport: build.query<FinanceReportResponse, void>({
      query: () => ({ url: "/dashboard/staff/finance", method: "GET" }),
    }),
  }),
});

export const {
  useGetFinanceDashboardQuery,
  useGetContributionOverviewQuery,
  useGetFinanceReportQuery,
} = dashboardApi;
