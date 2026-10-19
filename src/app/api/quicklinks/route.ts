import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/memory-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getDB();
    const items = await db.quickLink.findMany();
    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json({ items: [], error: "db_unavailable" });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { url, title, icon, color } = body as {
    url?: string;
    title?: string;
    icon?: string;
    color?: string;
  };
  if (!url || !title)
    return NextResponse.json({ error: "url and title required" }, { status: 400 });
  try {
    const db = getDB();
    const count = await db.quickLink.count();
    const item = await db.quickLink.create({
      data: { url, title, icon: icon || null, color: color || null, position: count },
    });
    return NextResponse.json({ item });
  } catch (e) {
    return NextResponse.json({ ok: true, warn: "db_unavailable" });
  }
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { id, url, title, icon, color, position } = body as {
    id?: string;
    url?: string;
    title?: string;
    icon?: string;
    color?: string;
    position?: number;
  };
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  try {
    const db = getDB();
    const data: Record<string, unknown> = {};
    if (url !== undefined) data.url = url;
    if (title !== undefined) data.title = title;
    if (icon !== undefined) data.icon = icon;
    if (color !== undefined) data.color = color;
    if (position !== undefined) data.position = position;
    const item = await db.quickLink.update({ where: { id }, data });
    return NextResponse.json({ item });
  } catch (e) {
    return NextResponse.json({ ok: true, warn: "db_unavailable" });
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  try {
    const db = getDB();
    await db.quickLink.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: true, warn: "db_unavailable" });
  }
}
