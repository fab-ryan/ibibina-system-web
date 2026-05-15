import { BaseResponse, PaginatedResponse } from "./base";
import { User } from "./auth";

export type UsersPaginationResponse = PaginatedResponse<User[]>;
export type UsersStaticsResponse = BaseResponse<{
  totolUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  adminUsers: number;
}>;


