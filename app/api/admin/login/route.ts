import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  adminIsConfigured,
  createAdminToken,
  validAdminPassword,
} from "@/lib/admin-auth";

export async function POST(request: Request) {
  if (!adminIsConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Admin access has not been configured." },
      { status: 503 },
    );
  }

  const body = (await request.json()) as { password?: unknown };
  const password = typeof body.password === "string" ? body.password : "";
  if (!validAdminPassword(password)) {
    return NextResponse.json({ ok: false, error: "Incorrect password." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE_NAME, createAdminToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
  return response;
}
