import fs from "fs";
import path from "path";
import { Pool } from "pg";

const certPath = path.join(__dirname, "../certs/prod-ca-2021.crt");
const useSsl = fs.existsSync(certPath);

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ...(useSsl && {
    ssl: {
      ca: fs.readFileSync(certPath).toString(),
    },
  }),
});
