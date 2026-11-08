import 'dotenv/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../generated/prisma/client.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set — copy .env.example to .env and fill it in');
}

/**
 * TiDB/MySQL TLS: Prisma's schema engine reads `sslaccept`/`sslmode` from the
 * URL, the `mariadb` driver does not — so we build the pool config ourselves
 * and honour the same params.
 *
 *   sslaccept=skip-verify → TLS, don't verify the server cert
 *   sslaccept=strict      → TLS, verify the server cert
 *   sslmode=<anything but disable> → TLS (verify unless no-verify)
 *   no TLS param / disable → plain connection
 */
function buildConfig(url: string) {
  const parsed = new URL(url);
  const sslAccept = parsed.searchParams.get('sslaccept');
  const sslMode = parsed.searchParams.get('sslmode') ?? parsed.searchParams.get('ssl-mode');
  parsed.searchParams.delete('sslaccept');
  parsed.searchParams.delete('sslmode');
  parsed.searchParams.delete('ssl-mode');

  let ssl: { rejectUnauthorized: boolean } | undefined;
  if (sslAccept === 'skip-verify') {
    ssl = { rejectUnauthorized: false };
  } else if (sslAccept === 'strict') {
    ssl = { rejectUnauthorized: true };
  } else if (sslMode && sslMode !== 'disable') {
    ssl = { rejectUnauthorized: sslMode !== 'no-verify' };
  }

  return {
    host: parsed.hostname,
    port: Number(parsed.port || 3306),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: decodeURIComponent(parsed.pathname.replace(/^\//, '')) || undefined,
    // `connectTimeout` is the mariadb option name (not connectionTimeout).
    connectTimeout: 30_000,
    ...(ssl ? { ssl } : {}),
  };
}

const adapter = new PrismaMariaDb(buildConfig(connectionString));

export const prisma = new PrismaClient({ adapter });
