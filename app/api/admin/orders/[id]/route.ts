import { NextResponse } from "next/server";

export async function PATCH() {
  return NextResponse.json(
    { ok: false, error: "This legacy endpoint is retired. Orders are managed in Square." },
    { status: 410 },
  );
}
