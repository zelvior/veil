import { PrismaClient } from '@prisma/client'

/**
 * Graceful database client with in-memory fallback.
 *
 * On Vercel (or any serverless platform), the filesystem is read-only
 * and SQLite databases cannot be used. This module attempts to connect
 * to the real database; if that fails, it falls back to an in-memory
 * store so the proxy still works (history/bookmarks won't persist
 * across cold starts, but the app won't crash).
 *
 * For production persistence on Vercel, set DATABASE_URL to a
 * PostgreSQL connection string (Vercel Postgres, Supabase, Neon, etc.)
 * and change the Prisma provider to "postgresql".
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/** Try to create a real Prisma client. Returns null if it fails. */
function createPrismaClient(): PrismaClient | null {
  try {
    const client = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query'] : [],
    })
    return client
  } catch (e) {
    console.warn('[db] Prisma client initialization failed, using in-memory fallback:', (e as Error).message)
    return null
  }
}

/** The real Prisma client, or null if unavailable. */
export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production' && db) globalForPrisma.prisma = db

/** Whether the real database is available. */
export const hasDatabase = db !== null
