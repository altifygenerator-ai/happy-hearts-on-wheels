import { NextResponse } from "next/server";
import {
  getSquarePaymentClientConfig,
  squareApprovalModeEnabled,
} from "@/lib/square";

export const runtime = "nodejs";

export async function GET() {
  const config = getSquarePaymentClientConfig();
  return NextResponse.json(
    {
      mode: squareApprovalModeEnabled() ? "approval" : "hosted",
      enabled: Boolean(config),
      ...(config ?? {}),
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
