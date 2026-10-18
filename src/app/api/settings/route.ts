import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULTS: Record<string, string> = {
  searchEngine: "https://duckduckgo.com/?q={q}",
  browserProfile: "chrome-win",
  theme: "system",
  showBookmarksBar: "true",
};

export async function GET() {
  const rows = await db.setting.findMany();
  const map: Record<string, string> = { ...DEFAULTS };
  rows.forEach((r) => (map[r.id] = r.value));
  return NextResponse.json({ settings: map });
}

export async function PUT(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Record<string, string>;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(body)) {
    const value = String(v);
    await db.setting.upsert({
      where: { id: k },
      create: { id: k, value },
      update: { value },
    });
    out[k] = value;
  }
  return NextResponse.json({ settings: out });
}
