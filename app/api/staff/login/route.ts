import { NextResponse } from "next/server";
import {
  STAFF_COOKIE_NAME,
  staffAuthConfigured,
  staffSessionToken,
  validStaffPassword,
} from "@/lib/staff-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!staffAuthConfigured()) {
    return NextResponse.redirect(new URL("/staff/orders?error=not-configured", request.url), 303);
  }
  const form = await request.formData();
  const password = String(form.get("password") || "");
  if (!validStaffPassword(password)) {
    return NextResponse.redirect(new URL("/staff/orders?error=invalid", request.url), 303);
  }
  const response = NextResponse.redirect(new URL("/staff/orders", request.url), 303);
  response.cookies.set(STAFF_COOKIE_NAME, staffSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
