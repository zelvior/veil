import { NextResponse } from "next/server";
import { clearAllCookies, cookieCount } from "@/lib/cookie-jar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const cleared = cookieCount();
  clearAllCookies();
  return NextResponse.json({ ok: true, cleared });
}

export async function GET() {
  return NextResponse.json({ cookies: cookieCount() });
}
