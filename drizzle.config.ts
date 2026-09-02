import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Next usa .env.local; lo cargamos también para los comandos de drizzle-kit.
config({ path: ".env.local" });
config({ path: ".env" });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
