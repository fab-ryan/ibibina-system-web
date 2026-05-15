"use client";
import { AuthProvider } from "@/contexts/auth-context";
import { ToastProvider } from "@/contexts/toast-context";
import Toaster from "@/components/ui/toaster";
import { Provider } from "react-redux";
import { store } from "@/store";
export default function Wrapper({ children }: { children: React.ReactNode }) {
    return (
        <Provider store={store}>
            <AuthProvider>
                <ToastProvider>
                    {children}
                    <Toaster />
                </ToastProvider>
            </AuthProvider>
        </Provider>
    );
}