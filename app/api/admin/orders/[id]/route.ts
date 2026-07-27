import { NextRequest, NextResponse } from "next/server";
import { requestIsAdmin } from "@/lib/admin-auth";
import { updateOrderStatus, type OrderStatus } from "@/lib/orders";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!requestIsAdmin(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const body = (await request.json()) as { status?: unknown };
    const status = body.status as OrderStatus;
    const order = await updateOrderStatus(id, status);
    return NextResponse.json({ ok: true, order });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Order could not be updated.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
