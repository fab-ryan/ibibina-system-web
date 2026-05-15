import DashboardLayout from "@/components/dashboard/dashboardLayout";

export default function DashboardRouteLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <DashboardLayout>{children}</DashboardLayout>;
}
