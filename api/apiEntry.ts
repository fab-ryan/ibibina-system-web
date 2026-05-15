/* eslint-disable @typescript-eslint/no-explicit-any */
import { RootState } from "@/store";
import { logout, setTokens } from "@/store/auth-slice";
import { apiUrl } from "@/utils";
import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const baseQuery = fetchBaseQuery({
  baseUrl: `${apiUrl}/api`,
  prepareHeaders: (headers, { getState }) => {
    const state = getState() as RootState;
    console.log("Preparing headers with auth token:", state?.auth?.token);
    if (state?.auth?.token) {
      headers.set("Authorization", `Bearer ${state.auth.token}`);
    }

    return headers;
  },
});

const refreshBaseQuery = fetchBaseQuery({
  baseUrl: `${apiUrl}/api`,
});

const isRefreshRequest = (args: string | FetchArgs) => {
  const url = typeof args === "string" ? args : args.url;
  return /\/auth\/(refresh|refresh-token)$/.test(url);
};

const extractTokens = (
  payload: unknown,
): { accessToken: string; refreshToken?: string } | null => {
  const data = payload as any;
  const accessToken =
    data?.data?.tokens?.accessToken ??
    data?.tokens?.accessToken ??
    data?.data?.accessToken ??
    data?.accessToken ??
    data?.token;

  const refreshToken =
    data?.data?.tokens?.refreshToken ??
    data?.tokens?.refreshToken ??
    data?.data?.refreshToken ??
    data?.refreshToken;

  if (!accessToken) return null;
  return { accessToken, refreshToken };
};

const baseQueryWithErrorHandling: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, apiContext, extraOptions) => {
  let result = await baseQuery(args, apiContext, extraOptions);

  const status = (result.error as FetchBaseQueryError | undefined)?.status;
  if (status === 401 && !isRefreshRequest(args)) {
    const state = apiContext.getState() as RootState;
    const refreshToken = state.auth.refreshToken;

    if (!refreshToken) {
      apiContext.dispatch(logout());
      return result;
    }

    // Try common refresh endpoints to match backend implementations.
    const refreshEndpoints = ["/auth/refresh"];
    let refreshed = false;

    for (const url of refreshEndpoints) {
      console.log(
        `Attempting token refresh via ${url}... ${refreshToken ? "with" : "without"} refresh token.`,
      );
      const refreshResult = await refreshBaseQuery(
        {
          url,
          method: "POST",
          body: { refreshToken },
        },
        apiContext,
        extraOptions,
      );

      if (refreshResult.data) {
        console.log("Token refresh successful:", refreshResult.data);
        const tokens = extractTokens(refreshResult.data);
        if (tokens?.accessToken) {
          apiContext.dispatch(
            setTokens({
              token: tokens.accessToken,
              refreshToken: tokens.refreshToken,
            }),
          );
          result = await baseQuery(args, apiContext, extraOptions);
          refreshed = true;
          break;
        }
      }
    }

    if (!refreshed) {
      // Refresh token is invalid/expired: clear auth state.
      apiContext.dispatch(logout());
    }
  }

  return result;
};

export const api = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithErrorHandling,
  endpoints: () => ({}), // Define your endpoints here
  tagTypes: ["Auth", "Activities", "Groups", "Users", "Loans", "Contributions"], // Add tag types for cache invalidation
});
