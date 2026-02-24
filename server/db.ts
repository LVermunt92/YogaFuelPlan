import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

const { Pool } = pg;

// Build connection string from individual PostgreSQL environment variables
const connectionString = process.env.DATABASE_URL || 
  `postgresql://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}`;

if (!connectionString || connectionString === 'postgresql://:::/' ) {
  throw new Error(
    "Database credentials must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ 
  connectionString: connectionString,
  max: 10,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 10000,
});

export const db = drizzle(pool, { schema });