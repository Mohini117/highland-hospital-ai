import AdminSidebar from "@/components/organisms/admin/admin-sidebar";
import AdminHeader from "@/components/organisms/admin/admin-header";
import { requireAdmin } from "@/lib/auth-guard";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireAdmin();

  return (
    <div className="flex min-h-screen bg-background-1">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader />
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
