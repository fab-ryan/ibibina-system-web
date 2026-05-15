/* eslint-disable @typescript-eslint/no-explicit-any */
import { AuthResponse, User } from "@/types";
import { setCredentials } from "@/store/auth-slice";
import { api } from "../apiEntry";

type LoginRequest = { email: string; password: string };
type RegisterRequest = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
};
type ForgotPasswordRequest = { email: string };

type AuthUser = { id: string; fullName: string; email: string; phone?: string };
type RegisterResponse = { token: string; user: AuthUser };
type ForgotPasswordResponse = { message: string };

export const authApi = api.injectEndpoints({
  endpoints: (build) => ({
    login: build.mutation<AuthResponse, LoginRequest>({
      query: (credentials) => ({
        url: "/auth/login",
        method: "POST",
        body: {
          identifier: credentials.email,
          credential: credentials.password,
        },
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          const authData = data?.data;
          if (
            data?.success &&
            authData?.tokens?.accessToken &&
            authData?.user
          ) {
            dispatch(
              setCredentials({
                token: authData.tokens.accessToken,
                refreshToken: authData.tokens.refreshToken,
                user: authData.user,
              }),
            );
          }
        } catch {
          // Ignore here; page-level handler already displays login errors.
        }
      },
    }),
    register: build.mutation<RegisterResponse, RegisterRequest>({
      query: (body) => ({
        url: "/auth/register",
        method: "POST",
        body,
      }),
    }),
    forgotPassword: build.mutation<
      ForgotPasswordResponse,
      ForgotPasswordRequest
    >({
      query: (body) => ({
        url: "/auth/forgot-password",
        method: "POST",
        body,
      }),
    }),
    userDetails: build.query<User, void>({
      query: () => ({
        url: "/auth/me",
        method: "GET",
      }),
      transformResponse: (response: any) => response?.data ?? response,
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useForgotPasswordMutation,
  useUserDetailsQuery,
} = authApi;
