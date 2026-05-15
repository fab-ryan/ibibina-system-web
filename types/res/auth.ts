import { BaseResponse } from "./base";
import { Group } from "./group";

export type AuthResponse = BaseResponse<{
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
  user: User;
}>

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  password: string;
  role: string;
  status: string;
  isEmailVerified: boolean;
  profilePicture: string | null;
  refreshToken: string;
  createdAt: Date;
  updatedAt: Date;
  groupId?: string;
  group?: Group;
  user_code?: string;
}
export interface Tokens {
  accessToken: string;
  refreshToken: string;
}


export type UserCreatedResponse = BaseResponse<User>;