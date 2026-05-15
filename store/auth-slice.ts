import { User } from "@/types";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type AuthState = {
  token: string | null;
  refreshToken?: string | null;
  user: User | null;
  isAuthenticated: boolean;
};

const initialState: AuthState = {
  token: null,
  refreshToken: null,
  user: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials(
      state,
      action: PayloadAction<{
        token: string;
        refreshToken?: string;
        user: User;
      }>,
    ) {
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken || null;
      state.user = action.payload.user;
      state.isAuthenticated = true;
    },
    logout(state) {
      state.token = null;
      state.refreshToken = null;
      state.user = null;
      state.isAuthenticated = false;
    },
    setTokens(
      state,
      action: PayloadAction<{
        token: string;
        refreshToken?: string;
      }>,
    ) {
      state.token = action.payload.token;
      if (action.payload.refreshToken) {
        state.refreshToken = action.payload.refreshToken;
      }
      state.isAuthenticated = true;
    },
    setUser(state, action: PayloadAction<User>) {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
  },
});

export const { setCredentials, logout, setTokens, setUser } = authSlice.actions;
export default authSlice.reducer;
