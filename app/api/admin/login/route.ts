import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { ok: false, error: "The legacy website admin is retired. Use Square to manage orders." },
    { status: 410 },
  );
}
