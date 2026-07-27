import { NextRequest, NextResponse } from "next/server";
import { requestIsAdmin } from "@/lib/admin-auth";
import { listOrders } from "@/lib/orders";

export async function GET(request: NextRequest) {
  if (!requestIsAdmin(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const orders = await listOrders();
    return NextResponse.json({ ok: true, orders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Orders could not be loaded.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
