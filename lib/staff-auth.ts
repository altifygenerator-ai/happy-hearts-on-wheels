import { createHash, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

export const STAFF_COOKIE_NAME = "happy_hearts_staff";

function staffPassword() {
  return process.env.STAFF_ORDER_PASSWORD || "";
}

function expectedToken() {
  const password = staffPassword();
  if (!password) return "";
  return createHash("sha256")
    .update(`happy-hearts-staff:${password}:${process.env.NEXT_PUBLIC_SITE_URL || "site"}`)
    .digest("hex");
}

export function staffAuthConfigured() {
  return staffPassword().length >= 8;
}

export function validStaffPassword(value: string) {
  const expected = Buffer.from(staffPassword());
  const received = Buffer.from(value);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export function validStaffToken(value?: string) {
  if (!value || !staffAuthConfigured()) return false;
  const expected = Buffer.from(expectedToken());
  const received = Buffer.from(value);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export function staffSessionToken() {
  return expectedToken();
}

export function requestIsStaff(request: NextRequest) {
  return validStaffToken(request.cookies.get(STAFF_COOKIE_NAME)?.value);
}
