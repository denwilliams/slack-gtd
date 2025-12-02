import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import * as schema from "./schema";

let schemaInitialized = false;

export async function ensureSchema() {
  if (schemaInitialized) {
    return;
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log("Running database migrations...");
    const db = drizzle({ client: pool, schema });

    // Run migrations from the drizzle folder
    await migrate(db, { migrationsFolder: "./drizzle" });

    schemaInitialized = true;
    console.log("Migrations completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
    // Mark as initialized even on error to prevent retry loops
    schemaInitialized = true;
    throw error;
  } finally {
    // Close the pool connection
    await pool.end();
  }
}
