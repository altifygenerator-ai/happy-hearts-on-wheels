import type { Metadata } from "next";
import { AdminDashboard } from "./AdminDashboard";

export const metadata: Metadata = {
  title: "Order Dashboard",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <div className="admin-page">
      <AdminDashboard />
    </div>
  );
}
