import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const limit = Number(req.nextUrl.searchParams.get("limit") || 100);
  const q = req.nextUrl.searchParams.get("q");
  const items = await db.history.findMany({
    where: q ? { OR: [{ url: { contains: q } }, { title: { contains: q } }] } : undefined,
    orderBy: { visitedAt: "desc" },
    take: Math.min(Math.max(limit, 1), 500),
  });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { url, title, favicon } = body as {
    url?: string;
    title?: string;
    favicon?: string;
  };
  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });
  // de-dup identical url within last minute, otherwise insert
  const recent = await db.history.findFirst({
    where: { url, visitedAt: { gt: new Date(Date.now() - 60_000) } },
    orderBy: { visitedAt: "desc" },
  });
  if (recent) {
    return NextResponse.json({ item: recent });
  }
  const item = await db.history.create({
    data: { url, title: title || "", favicon: favicon || null },
  });
  return NextResponse.json({ item });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (id) {
    await db.history.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  }
  const all = req.nextUrl.searchParams.get("all");
  if (all) {
    await db.history.deleteMany({});
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "specify id or all" }, { status: 400 });
}
