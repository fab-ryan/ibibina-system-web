import {
  CreateUserRequestPayload,
  UserCreatedResponse,
  UsersPaginationResponse,
  UsersStaticsResponse,
} from "@/types";
import { api } from "../apiEntry";

export const usersApi = api.injectEndpoints({
  endpoints: (build) => ({
    getUsers: build.query<
      UsersPaginationResponse,
      {
        role?: string;
        status?: string;
        search?: string;
        groupId?: string;
        page?: number;
        limit?: number;
      }
    >({
      query: ({ role, status, search, groupId, page, limit }) => {
        const params = new URLSearchParams();
        if (role) params.append("role", role);
        if (status) params.append("status", status);
        if (search) params.append("search", search);
        if (groupId) params.append("groupId", groupId);
        if (page) params.append("page", page.toString());
        if (limit) params.append("limit", limit.toString());
        return {
          url: `/users?${params.toString()}`,
          method: "GET",
        };
      },
    }),
    getUsersStatics: build.query<UsersStaticsResponse, void>({
      query: () => ({
        url: "/users/stats",
        method: "GET",
      }),
    }),
    createUser: build.mutation<UserCreatedResponse, CreateUserRequestPayload>({
      query: (newUser) => ({
        url: "/users",
        method: "POST",
        body: newUser,
      }),
    }),
    updateUser: build.mutation<
      UserCreatedResponse,
      { userId: string; data: Partial<CreateUserRequestPayload> }
    >({
      query: ({ userId, data }) => ({
        url: `/users/${userId}`,
        method: "PUT",
        body: data,
      }),
    }),
    deleteUser: build.mutation<{ success: boolean; message?: string }, string>({
      query: (userId) => ({
        url: `/users/${userId}`,
        method: "DELETE",
      }),
    }),
  }),
});

export const {
  useLazyGetUsersQuery,
  useGetUsersStaticsQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
} = usersApi;
