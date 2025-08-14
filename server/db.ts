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

// Create pool with connection configuration for standard PostgreSQL
export const pool = new Pool({ 
  connectionString: connectionString,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const db = drizzle(pool, { schema });