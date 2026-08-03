import { redirect } from "next/navigation";

export const metadata = {
  title: "Orders are managed in Square",
  robots: { index: false, follow: false },
};

export default function RetiredAdminPage() {
  redirect("/");
}
