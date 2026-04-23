import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

// Prisma 7 requires a driver adapter.
// DATABASE_URL format: "file:./dev.db" (relative to project root)
function createPrismaClient() {
  const rawUrl = process.env.DATABASE_URL ?? 'file:./dev.db'
  // Strip the "file:" prefix to get the actual file path
  // better-sqlite3 adapter expects a file path string
  const dbUrl = rawUrl.replace(/^file:/, '')
  const adapter = new PrismaBetterSqlite3({ url: dbUrl })
  return new PrismaClient({ adapter })
}

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

const prisma = globalThis.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma

export default prisma
