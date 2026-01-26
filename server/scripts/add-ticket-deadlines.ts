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

async function addTicketDeadlines() {
  try {
    // First, ensure the deadline column exists (run migration if needed)
    console.log('Checking if deadline column exists...')
    try {
      await pool.query(`SELECT deadline FROM public.tickets LIMIT 1`)
      console.log('✓ Deadline column exists')
    } catch (err: any) {
      if (err.code === '42703') { // Column does not exist
        console.log('Deadline column not found. Running migration...')
        await pool.query(`
          ALTER TABLE public.tickets
          ADD COLUMN IF NOT EXISTS deadline TIMESTAMP WITH TIME ZONE
        `)
        await pool.query(`
          CREATE INDEX IF NOT EXISTS idx_tickets_deadline 
          ON public.tickets(deadline) 
          WHERE deadline IS NOT NULL
        `)
        console.log('✓ Migration completed - deadline column added')
      } else {
        throw err
      }
    }

    // Fetch all tickets that don't have a deadline
    const result = await pool.query(
      `SELECT id, title, created_at FROM public.tickets WHERE deadline IS NULL ORDER BY created_at DESC`
    )

    const tickets = result.rows
    console.log(`Found ${tickets.length} ticket(s) without deadlines`)

    if (tickets.length === 0) {
      console.log('No tickets to update. Exiting.')
      await pool.end()
      return
    }

    // Define deadline options: today, tomorrow, next week, in two weeks
    const now = new Date()
    const today = new Date(now)
    today.setHours(17, 0, 0, 0) // Set to 5 PM today

    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(17, 0, 0, 0) // Set to 5 PM tomorrow

    const nextWeek = new Date(now)
    nextWeek.setDate(nextWeek.getDate() + 7)
    nextWeek.setHours(17, 0, 0, 0) // Set to 5 PM next week

    const twoWeeks = new Date(now)
    twoWeeks.setDate(twoWeeks.getDate() + 14)
    twoWeeks.setHours(17, 0, 0, 0) // Set to 5 PM in two weeks

    const deadlineOptions = [today, tomorrow, nextWeek, twoWeeks]

    // Update tickets with random deadlines
    let updatedCount = 0
    for (const ticket of tickets) {
      // Randomly select a deadline option
      const randomIndex = Math.floor(Math.random() * deadlineOptions.length)
      const randomDeadline = deadlineOptions[randomIndex]
      const deadlineISO = randomDeadline.toISOString()

      await pool.query(
        `UPDATE public.tickets SET deadline = $1, updated_at = now() WHERE id = $2`,
        [deadlineISO, ticket.id]
      )

      const deadlineLabel = 
        randomIndex === 0 ? 'today' :
        randomIndex === 1 ? 'tomorrow' :
        randomIndex === 2 ? 'next week' :
        'in two weeks'

      console.log(`✓ Updated ticket "${ticket.title.substring(0, 50)}..." - deadline: ${deadlineLabel} (${deadlineISO})`)
      updatedCount++
    }

    console.log(`\n✓ Successfully updated ${updatedCount} ticket(s) with deadlines`)
    
    // Show summary
    const summaryResult = await pool.query(
      `SELECT 
        COUNT(*) FILTER (WHERE deadline::date = CURRENT_DATE) as today,
        COUNT(*) FILTER (WHERE deadline::date = CURRENT_DATE + INTERVAL '1 day') as tomorrow,
        COUNT(*) FILTER (WHERE deadline::date >= CURRENT_DATE + INTERVAL '7 days' AND deadline::date < CURRENT_DATE + INTERVAL '14 days') as next_week,
        COUNT(*) FILTER (WHERE deadline::date >= CURRENT_DATE + INTERVAL '14 days' AND deadline::date < CURRENT_DATE + INTERVAL '21 days') as two_weeks
      FROM public.tickets
      WHERE deadline IS NOT NULL`
    )

    const summary = summaryResult.rows[0]
    console.log('\nDeadline distribution:')
    console.log(`  Today: ${summary.today}`)
    console.log(`  Tomorrow: ${summary.tomorrow}`)
    console.log(`  Next week: ${summary.next_week}`)
    console.log(`  In two weeks: ${summary.two_weeks}`)

  } catch (err) {
    console.error('Error:', err)
    throw err
  } finally {
    await pool.end()
  }
}

addTicketDeadlines().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})

