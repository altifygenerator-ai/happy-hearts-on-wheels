import { NextResponse } from "next/server";
import { STAFF_COOKIE_NAME } from "@/lib/staff-auth";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/staff/orders", request.url), 303);
  response.cookies.set(STAFF_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return response;
}
