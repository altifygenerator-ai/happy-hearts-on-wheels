import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

export const ADMIN_COOKIE_NAME = "happy_hearts_admin";

function sessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || "";
}

export function adminIsConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD && sessionSecret());
}

export function createAdminToken() {
  return createHmac("sha256", sessionSecret())
    .update("happy-hearts-orders-admin-v1")
    .digest("hex");
}

export function validAdminPassword(password: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const suppliedBuffer = Buffer.from(password);
  const expectedBuffer = Buffer.from(expected);
  if (suppliedBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(suppliedBuffer, expectedBuffer);
}

export function requestIsAdmin(request: NextRequest) {
  if (!adminIsConfigured()) return false;
  const supplied = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!supplied) return false;
  const expected = createAdminToken();
  const suppliedBuffer = Buffer.from(supplied);
  const expectedBuffer = Buffer.from(expected);
  if (suppliedBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(suppliedBuffer, expectedBuffer);
}
