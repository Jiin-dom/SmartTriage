import bcrypt from 'bcrypt'
import { Pool } from 'pg'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

dotenv.config()

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    ca: fs.readFileSync(path.join(__dirname, '../certs/prod-ca-2021.crt')).toString(),
  },
})

async function fixPasswordHashes() {
  const password = 'Password123!'
  
  // Generate proper bcrypt hash
  const saltRounds = 10
  const passwordHash = await bcrypt.hash(password, saltRounds)
  
  console.log('Generated password hash:', passwordHash)
  console.log('Verifying hash works...')
  const isValid = await bcrypt.compare(password, passwordHash)
  console.log('Hash verification:', isValid ? '✓ PASSED' : '✗ FAILED')
  
  if (!isValid) {
    console.error('ERROR: Generated hash does not verify correctly!')
    process.exit(1)
  }
  
  // Update ALL users with the default password
  const updateResult = await pool.query(
    `UPDATE public.users 
     SET password_hash = $1 
     WHERE email LIKE '%@example.com'`,
    [passwordHash]
  )
  console.log(`Updated ${updateResult.rowCount} user(s) with correct password hash`)
  
  // Verify the updates
  const verifyResult = await pool.query(
    `SELECT email, password_hash FROM public.users 
     WHERE email LIKE '%@example.com'`
  )
  
  console.log('\nVerifying database updates:')
  for (const user of verifyResult.rows) {
    const testCompare = await bcrypt.compare(password, user.password_hash)
    console.log(`${user.email}: ${testCompare ? '✓ VERIFIED' : '✗ FAILED'}`)
  }
  
  await pool.end()
  console.log('\n✓ Password hash update complete!')
}

fixPasswordHashes().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})

