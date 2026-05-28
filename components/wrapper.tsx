"use client";
import { AuthProvider } from "@/contexts/auth-context";
import { ToastProvider } from "@/contexts/toast-context";
import Toaster from "@/components/ui/toaster";
import { Provider } from "react-redux";
import { store, persistor } from "@/store";
import { PersistGate } from "redux-persist/integration/react";
import AppLoading from "@/components/app-loading";
import RouteProgress from "@/components/route-progress";
import { Suspense } from "react";

export default function Wrapper({ children }: { children: React.ReactNode }) {
    return (
        <Provider store={store}>
            <PersistGate loading={<AppLoading />} persistor={persistor}>
                <AuthProvider>
                    <ToastProvider>
                        <Suspense>
                            <RouteProgress />
                        </Suspense>
                        {children}
                        <Toaster />
                    </ToastProvider>
                </AuthProvider>
            </PersistGate>
        </Provider>
    );
}