import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const items = await db.quickLink.findMany({ orderBy: { position: "asc" } });
  return NextResponse.json({ items });
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
  const count = await db.quickLink.count();
  const item = await db.quickLink.create({
    data: { url, title, icon: icon || null, color: color || null, position: count },
  });
  return NextResponse.json({ item });
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
  const data: Record<string, unknown> = {};
  if (url !== undefined) data.url = url;
  if (title !== undefined) data.title = title;
  if (icon !== undefined) data.icon = icon;
  if (color !== undefined) data.color = color;
  if (position !== undefined) data.position = position;
  const item = await db.quickLink.update({ where: { id }, data });
  return NextResponse.json({ item });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (id) {
    await db.quickLink.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "id required" }, { status: 400 });
}
