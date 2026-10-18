import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/memory-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getDB();
    const items = await db.bookmark.findMany();
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
    const existing = await db.bookmark.findFirst({ where: { url } });
    if (existing) return NextResponse.json({ item: existing });
    const item = await db.bookmark.create({
      data: { url, title: title || url, favicon: favicon || null },
    });
    return NextResponse.json({ item });
  } catch (e) {
    return NextResponse.json({ error: "db_unavailable" }, { status: 503 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const db = getDB();
    const id = req.nextUrl.searchParams.get("id");
    if (id) {
      await db.bookmark.delete({ where: { id } });
      return NextResponse.json({ ok: true });
    }
    const url = req.nextUrl.searchParams.get("url");
    if (url) {
      await db.bookmark.deleteMany({ where: { url } });
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "specify id or url" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: "db_unavailable" }, { status: 503 });
  }
}
