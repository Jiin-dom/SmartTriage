import bcrypt from 'bcrypt'
import { Pool } from 'pg'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

// Load .env from server/ or project root
const serverEnv = path.join(__dirname, '../.env')
const rootEnv = path.join(__dirname, '../../.env')
if (fs.existsSync(serverEnv)) dotenv.config({ path: serverEnv })
else if (fs.existsSync(rootEnv)) dotenv.config({ path: rootEnv })
else dotenv.config()

// Optional SSL: use cert only if it exists (e.g. Supabase); otherwise connect without SSL for local dev
const certPath = path.join(__dirname, '../certs/prod-ca-2021.crt')
const sslConfig =
  fs.existsSync(certPath) && process.env.DATABASE_URL
    ? { ca: fs.readFileSync(certPath).toString() }
    : process.env.DATABASE_URL?.includes('supabase') || process.env.DATABASE_URL?.includes('sslmode=require')
      ? { rejectUnauthorized: false }
      : undefined

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ...(sslConfig && { ssl: sslConfig }),
})

const DEFAULT_PASSWORD = 'Password123!'

async function fixPasswordHashes() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set. Set it in server/.env or in the environment.')
    process.exit(1)
  }

  console.log('Generating bcrypt hash for default password...')
  const saltRounds = 10
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, saltRounds)

  const isValid = await bcrypt.compare(DEFAULT_PASSWORD, passwordHash)
  if (!isValid) {
    console.error('ERROR: Generated hash does not verify correctly.')
    process.exit(1)
  }
  console.log('Hash verification: ✓ PASSED\n')

  // Update all @example.com users with the correct hash
  const updateResult = await pool.query(
    `UPDATE public.users
     SET password_hash = $1
     WHERE email LIKE '%@example.com'`,
    [passwordHash]
  )

  const updated = updateResult.rowCount ?? 0
  console.log(`Updated ${updated} user(s) with correct password hash (Password123!).`)

  if (updated === 0) {
    const countResult = await pool.query(
      `SELECT COUNT(*) as n FROM public.users WHERE email LIKE '%@example.com'`
    )
    const n = parseInt(countResult.rows[0]?.n ?? '0', 10)
    if (n === 0) {
      console.log('No @example.com users found in the database. Nothing to fix.')
    }
  } else {
    const verifyResult = await pool.query(
      `SELECT email FROM public.users WHERE email LIKE '%@example.com'`
    )
    console.log('\nVerified users (can log in and change password with Password123!):')
    for (const row of verifyResult.rows) {
      console.log(`  - ${row.email}`)
    }
  }

  await pool.end()
  console.log('\n✓ Password hash fix complete. You can remove the dev bypass once all users use proper hashes.')
}

fixPasswordHashes().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
