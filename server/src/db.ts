import fs from "fs";
import path from "path";
import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    ca: fs.readFileSync(path.join(__dirname, "../certs/prod-ca-2021.crt")).toString(),
  },
});
