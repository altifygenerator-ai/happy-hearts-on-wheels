import { NextResponse } from "next/server";
import { getMenuCatalog } from "@/lib/square-catalog";

export async function GET() {
  const catalog = await getMenuCatalog();
  return NextResponse.json(catalog, {
    headers: { "Cache-Control": "no-store" },
  });
}
