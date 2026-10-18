import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const items = await db.bookmark.findMany({ orderBy: { createdAt: "desc" } });
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
  const existing = await db.bookmark.findFirst({ where: { url } });
  if (existing) return NextResponse.json({ item: existing });
  const item = await db.bookmark.create({
    data: { url, title: title || url, favicon: favicon || null },
  });
  return NextResponse.json({ item });
}

export async function DELETE(req: NextRequest) {
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
}
