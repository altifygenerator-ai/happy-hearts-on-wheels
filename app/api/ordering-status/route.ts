import { NextResponse } from "next/server";
import { getOrderingStatus } from "@/lib/square-hours";

export const runtime = "nodejs";

export async function GET() {
  const status = await getOrderingStatus();
  return NextResponse.json(status, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
