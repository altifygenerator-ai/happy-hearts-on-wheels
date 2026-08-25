import type { Metadata } from "next";
import { cookies } from "next/headers";
import { STAFF_COOKIE_NAME, staffAuthConfigured, validStaffToken } from "@/lib/staff-auth";
import { squareApprovalConfigured } from "@/lib/square";
import { StaffOrders } from "./StaffOrders";

export const metadata: Metadata = {
  title: "Staff Order Approval",
  robots: { index: false, follow: false },
};

export default async function StaffOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const cookieStore = await cookies();
  const authenticated = validStaffToken(cookieStore.get(STAFF_COOKIE_NAME)?.value);
  const params = await searchParams;

  if (!authenticated) {
    return (
      <div className="staff-login-page">
        <section className="staff-login-card">
          <img src="/images/happy-hearts-header-mark.webp" alt="" width="86" height="86" />
          <p>HAPPY HEARTS STAFF</p>
          <h1>Order approval</h1>
          {!staffAuthConfigured() ? (
            <div className="staff-error">Set STAFF_ORDER_PASSWORD in Vercel before using this page.</div>
          ) : null}
          {params.error === "invalid" ? <div className="staff-error">That password was not correct.</div> : null}
          <form action="/api/staff/login" method="post">
            <label>
              Staff password
              <input type="password" name="password" required autoComplete="current-password" />
            </label>
            <button type="submit">Open orders</button>
          </form>
        </section>
      </div>
    );
  }

  if (!squareApprovalConfigured()) {
    return (
      <div className="staff-login-page">
        <section className="staff-login-card">
          <p>SETUP NEEDED</p>
          <h1>Approval mode is not enabled yet.</h1>
          <p>Set SQUARE_PAYMENT_MODE=approval and add SQUARE_APPLICATION_ID in Vercel after the new payment flow has been tested.</p>
        </section>
      </div>
    );
  }

  return <StaffOrders />;
}
