export interface CreateUserRequestPayload {
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  role: UserRole;
  groupId?: string;
  password?: string;
  status?: UserStatus;
  isEmailVerified?: boolean;
}

export type UserRole = "admin" | "chairperson" | "secretary" | "finance" | "member";
export type UserStatus = "active" | "inactive" | "suspended";
