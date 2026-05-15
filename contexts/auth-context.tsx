"use client";

import { logout as logoutAction, setTokens, setUser } from "@/store/auth-slice";
import type { AppDispatch, RootState } from "@/store";
import type { User } from "@/types";
import { createContext, useContext, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";

type AuthContextValue = {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    logout: () => void;
    setTokens?: (token: string, refreshToken?: string) => void;
    setUser?: (user: User) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const dispatch = useDispatch<AppDispatch>();
    const { user, token, isAuthenticated } = useSelector(
        (state: RootState) => state.auth,
    );

    const value = useMemo(
        () => ({
            user,
            token,
            isAuthenticated,
            logout: () => dispatch(logoutAction()),
            setTokens: (token: string, refreshToken?: string) => {
                dispatch(setTokens({ token, refreshToken }));
            },
            setUser: (user: User) => {
                dispatch(setUser(user));
            },
        }),
        [dispatch, isAuthenticated, token, user],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}