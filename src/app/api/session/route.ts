import { NextRequest, NextResponse } from "next/server";
import {
  getOrCreateSession,
  clearSessionCookies,
  sessionCount,
  getSessionCookieName,
  buildSessionCookieHeader,
  extractSessionId,
} from "@/lib/session-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/session — returns session info (cookie count, session count).
 * Used by the UI to show privacy status.
 */
export async function GET(req: NextRequest) {
  const incomingCookie = req.headers.get("cookie");
  const sessionId = extractSessionId(incomingCookie);
  const session = getOrCreateSession(sessionId);
  const isHttps =
    req.headers.get("x-forwarded-proto") === "https" ||
    req.nextUrl.protocol === "https:";

  const res = NextResponse.json({
    sessionId: session.id,
    cookieCount: session.cookies.length,
    activeSessions: sessionCount(),
    cookieName: getSessionCookieName(),
  });

  // Set the session cookie if it's new.
  if (!sessionId || sessionId !== session.id) {
    res.headers.set(
      "Set-Cookie",
      buildSessionCookieHeader(session.id, isHttps)
    );
  }
  return res;
}

/**
 * POST /api/session — clear cookies for the current session.
 * This is the "clear browsing data" action.
 */
export async function POST(req: NextRequest) {
  const incomingCookie = req.headers.get("cookie");
  const sessionId = extractSessionId(incomingCookie);
  const session = getOrCreateSession(sessionId);

  clearSessionCookies(session);

  return NextResponse.json({
    ok: true,
    cleared: true,
    sessionId: session.id,
  });
}
