import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/memory-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const limit = Number(req.nextUrl.searchParams.get("limit") || 100);
  const q = req.nextUrl.searchParams.get("q");
  try {
    const db = getDB();
    const items = await db.history.findMany({
      where: q ? { OR: [{ url: { contains: q } }, { title: { contains: q } }] } : undefined,
      orderBy: { visitedAt: "desc" },
      take: Math.min(Math.max(limit, 1), 500),
    });
    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json({ items: [], error: "db_unavailable" });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { url, title, favicon } = body as {
    url?: string;
    title?: string;
    favicon?: string;
  };
  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });
  try {
    const db = getDB();
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
  } catch (e) {
    // DB unavailable (e.g., Vercel without database) — return 200 with
    // a synthetic item so the client UI doesn't see an error. History
    // just won't persist, which is acceptable.
    return NextResponse.json({
      item: { id: "ephemeral", url, title: title || "", favicon: favicon || null, visitedAt: new Date().toISOString() },
      warn: "db_unavailable",
    });
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  try {
    const db = getDB();
    if (id) {
      await db.history.delete({ where: { id } });
      return NextResponse.json({ ok: true });
    }
    const all = req.nextUrl.searchParams.get("all");
    if (all) {
      await db.history.deleteMany();
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "specify id or all" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ ok: true, warn: "db_unavailable" });
  }
}
