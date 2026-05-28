"use client";

import { usePathname } from "next/navigation";
import AdminTopBar from "@/components/dashboard/adminTopBar";
import DashboardSidebar from "@/components/dashboard/sidebar";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    return (
        <div className="flex h-screen flex-col overflow-hidden bg-[#f4f7fc]">
            {/* Topbar ─ full width, fixed height */}
            <AdminTopBar pathname={pathname} />

            {/* Body ─ sidebar + scrollable content */}
            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar ─ fixed width, full body height */}
                <DashboardSidebar pathname={pathname} />

                {/* Content ─ scrolls independently */}
                <main className="flex-1 overflow-y-auto">
                    <div className="mx-auto max-w-screen-2xl px-4 py-6 md:px-6 lg:px-8 lg:py-8 h-screen">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
