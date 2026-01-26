import { pool } from '../db'
import { analyzeTicket } from './aiService'

export interface TicketFilters {
  status?: string
  priority?: string
  search?: string
  limit: number
  offset: number
  role: string
  userId: string
  department?: string
  assignedTo?: string
  dateFrom?: string
  dateTo?: string
  deadlineFrom?: string
  deadlineTo?: string
  tags?: string[]
}

export interface CreateTicketInput {
  title: string
  description: string
  priority?: 'low' | 'medium' | 'high' | 'critical'
  createdBy: string
  assignedTo?: string | null
  deadline?: string | null
  department?: string | null
  tags?: string[]
}

export interface AISortSuggestion {
  ticketIds: string[]
  explanation: string
  reasoning: {
    criticalCount: number
    highCount: number
    factors: string[]
  }
}

export async function listTickets(filters: TicketFilters) {
  const conditions: string[] = []
  const params: any[] = []
  let paramIndex = 1

  // Role-based access control
  if (filters.role !== 'admin') {
    conditions.push(`(t.assigned_to = $${paramIndex} OR t.created_by = $${paramIndex})`)
    params.push(filters.userId)
    paramIndex++
  }

  // Status filter
  if (filters.status) {
    conditions.push(`t.status = $${paramIndex}`)
    params.push(filters.status)
    paramIndex++
  }

  // Priority filter
  if (filters.priority) {
    conditions.push(`t.priority = $${paramIndex}`)
    params.push(filters.priority)
    paramIndex++
  }

  // Search filter
  if (filters.search) {
    conditions.push(`(t.title ILIKE $${paramIndex} OR t.description ILIKE $${paramIndex})`)
    params.push(`%${filters.search}%`)
    paramIndex++
  }

  // Department filter
  if (filters.department) {
    conditions.push(`t.department = $${paramIndex}`)
    params.push(filters.department)
    paramIndex++
  }

  // Assigned to filter
  if (filters.assignedTo) {
    conditions.push(`t.assigned_to = $${paramIndex}`)
    params.push(filters.assignedTo)
    paramIndex++
  }

  // Date range filters
  if (filters.dateFrom) {
    conditions.push(`t.created_at >= $${paramIndex}`)
    params.push(filters.dateFrom)
    paramIndex++
  }

  if (filters.dateTo) {
    conditions.push(`t.created_at <= $${paramIndex}`)
    params.push(filters.dateTo)
    paramIndex++
  }

  // Deadline filters
  if (filters.deadlineFrom) {
    conditions.push(`t.deadline >= $${paramIndex}`)
    params.push(filters.deadlineFrom)
    paramIndex++
  }

  if (filters.deadlineTo) {
    conditions.push(`t.deadline <= $${paramIndex}`)
    params.push(filters.deadlineTo)
    paramIndex++
  }

  // Tags filter
  if (filters.tags && filters.tags.length > 0) {
    conditions.push(`EXISTS (
      SELECT 1 FROM public.ticket_tags tt 
      WHERE tt.ticket_id = t.id 
      AND tt.tag = ANY($${paramIndex}::text[])
    )`)
    params.push(filters.tags)
    paramIndex++
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  // Count query
  const countQuery = `
    SELECT COUNT(*) as total
    FROM public.tickets t
    ${whereClause}
  `
  const countResult = await pool.query(countQuery, params)
  const total = parseInt(countResult.rows[0].total, 10)

  // Data query
  params.push(filters.limit)
  params.push(filters.offset)

  const dataQuery = `
    SELECT 
      t.id,
      t.title,
      t.description,
      t.status,
      t.priority,
      t.deadline,
      t.department,
      t.created_at,
      t.updated_at,
      t.created_by,
      t.assigned_to,
      ai.predicted_category as category,
      ai.priority_level as ai_priority_level,
      ai.priority_score as ai_priority_score,
      creator.name as created_by_name,
      assignee.name as assigned_to_name
    FROM public.tickets t
    LEFT JOIN public.users creator ON t.created_by = creator.id
    LEFT JOIN public.users assignee ON t.assigned_to = assignee.id
    LEFT JOIN public.ticket_ai_analysis ai ON t.id = ai.ticket_id
    ${whereClause}
    ORDER BY t.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `

  const { rows } = await pool.query(dataQuery, params)

  return { rows, total }
}

export async function createTicket(input: CreateTicketInput) {
  // Run AI analysis
  const aiAnalysis = analyzeTicket({
    title: input.title,
    description: input.description,
  })

  // Insert ticket
  const ticketResult = await pool.query(
    `INSERT INTO public.tickets (
      title, description, priority, created_by, assigned_to, deadline, department
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, title, description, status, priority, deadline, department, created_at, created_by, assigned_to`,
    [
      input.title,
      input.description,
      input.priority || aiAnalysis.priority_level,
      input.createdBy,
      input.assignedTo || null,
      input.deadline || null,
      input.department || null,
    ]
  )

  const ticket = ticketResult.rows[0]
  
  if (!ticket || !ticket.id) {
    throw new Error('Failed to create ticket: no ticket returned from database')
  }

  // Insert AI analysis into separate table
  await pool.query(
    `INSERT INTO public.ticket_ai_analysis (
      ticket_id, predicted_category, category_confidence, urgency_score, urgency_level,
      sentiment_score, sentiment_label, priority_score, priority_level,
      summary, suggested_steps, explanation_json
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    ON CONFLICT (ticket_id) DO UPDATE SET
      predicted_category = EXCLUDED.predicted_category,
      category_confidence = EXCLUDED.category_confidence,
      urgency_score = EXCLUDED.urgency_score,
      urgency_level = EXCLUDED.urgency_level,
      sentiment_score = EXCLUDED.sentiment_score,
      sentiment_label = EXCLUDED.sentiment_label,
      priority_score = EXCLUDED.priority_score,
      priority_level = EXCLUDED.priority_level,
      summary = EXCLUDED.summary,
      suggested_steps = EXCLUDED.suggested_steps,
      explanation_json = EXCLUDED.explanation_json,
      analyzed_at = now()`,
    [
      ticket.id,
      aiAnalysis.predicted_category,
      aiAnalysis.category_confidence,
      aiAnalysis.urgency_score,
      aiAnalysis.urgency_level,
      aiAnalysis.sentiment_score,
      aiAnalysis.sentiment_label,
      aiAnalysis.priority_score,
      aiAnalysis.priority_level,
      aiAnalysis.summary,
      aiAnalysis.suggested_steps,
      JSON.stringify(aiAnalysis.explanation_json),
    ]
  )

  // Add tags if provided
  if (input.tags && input.tags.length > 0) {
    for (const tag of input.tags) {
      await pool.query(
        `INSERT INTO public.ticket_tags (ticket_id, tag) VALUES ($1, $2)`,
        [ticket.id, tag.trim()]
      )
    }
  }

  // Log activity
  await logTicketActivity(ticket.id, input.createdBy, 'created', {
    title: input.title,
    status: 'open',
    priority: ticket.priority,
  })

  return ticket
}

export async function getTicketDetails(ticketId: string) {
  const { rows } = await pool.query(
    `SELECT 
      t.*,
      creator.name as created_by_name,
      creator.email as created_by_email,
      assignee.name as assigned_to_name,
      assignee.email as assigned_to_email,
      ai.predicted_category,
      ai.category_confidence,
      ai.urgency_score,
      ai.urgency_level,
      ai.sentiment_score,
      ai.sentiment_label,
      ai.priority_score,
      ai.priority_level,
      ai.summary,
      ai.suggested_steps,
      ai.explanation_json
    FROM public.tickets t
    LEFT JOIN public.users creator ON t.created_by = creator.id
    LEFT JOIN public.users assignee ON t.assigned_to = assignee.id
    LEFT JOIN public.ticket_ai_analysis ai ON t.id = ai.ticket_id
    WHERE t.id = $1`,
    [ticketId]
  )

  if (rows.length === 0) {
    return null
  }

  const ticket = rows[0]

  // Get tags
  const tagsResult = await pool.query(
    `SELECT tag FROM public.ticket_tags WHERE ticket_id = $1 ORDER BY tag`,
    [ticketId]
  )
  ticket.tags = tagsResult.rows.map((r) => r.tag)

  // Get attachments
  const attachmentsResult = await pool.query(
    `SELECT id, filename, file_path, file_size, mime_type, uploaded_by, created_at
     FROM public.ticket_attachments 
     WHERE ticket_id = $1 
     ORDER BY created_at DESC`,
    [ticketId]
  )
  ticket.attachments = attachmentsResult.rows

  return ticket
}

export async function updateTicket(
  ticketId: string,
  fields: {
    status?: string
    assignedTo?: string | null
    priority?: string
    title?: string
    description?: string
    deadline?: string | null
    department?: string | null
  },
  userId?: string
) {
  const updates: string[] = []
  const params: any[] = []
  let paramIndex = 1

  if (fields.status !== undefined) {
    updates.push(`status = $${paramIndex}`)
    params.push(fields.status)
    paramIndex++
  }

  if (fields.priority !== undefined) {
    updates.push(`priority = $${paramIndex}`)
    params.push(fields.priority)
    paramIndex++
  }

  if (fields.assignedTo !== undefined) {
    updates.push(`assigned_to = $${paramIndex}`)
    params.push(fields.assignedTo)
    paramIndex++
  }

  if (fields.title !== undefined) {
    updates.push(`title = $${paramIndex}`)
    params.push(fields.title)
    paramIndex++
  }

  if (fields.description !== undefined) {
    updates.push(`description = $${paramIndex}`)
    params.push(fields.description)
    paramIndex++
  }

  if (fields.deadline !== undefined) {
    updates.push(`deadline = $${paramIndex}`)
    params.push(fields.deadline)
    paramIndex++
  }

  if (fields.department !== undefined) {
    updates.push(`department = $${paramIndex}`)
    params.push(fields.department)
    paramIndex++
  }

  if (updates.length === 0) {
    return null
  }

  updates.push(`updated_at = NOW()`)
  params.push(ticketId)

  const { rows } = await pool.query(
    `UPDATE public.tickets SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    params
  )

  if (rows.length === 0) {
    return null
  }

  const ticket = rows[0]

  // Log activity
  if (userId) {
    await logTicketActivity(ticketId, userId, 'updated', fields)
  }

  return ticket
}

export async function addComment(ticketId: string, userId: string, message: string) {
  const { rows } = await pool.query(
    `INSERT INTO public.ticket_comments (ticket_id, user_id, message)
     VALUES ($1, $2, $3)
     RETURNING id, ticket_id, user_id, message, created_at`,
    [ticketId, userId, message]
  )

  const comment = rows[0]

  // Get user name
  const userResult = await pool.query(`SELECT name FROM public.users WHERE id = $1`, [userId])
  if (userResult.rows.length > 0) {
    comment.user_name = userResult.rows[0].name
  }

  // Log activity
  await logTicketActivity(ticketId, userId, 'commented', { message })

  return comment
}

export async function listComments(ticketId: string) {
  const { rows } = await pool.query(
    `SELECT 
      c.id, c.ticket_id, c.user_id, c.message, c.created_at,
      u.name as user_name, u.email as user_email
    FROM public.ticket_comments c
    LEFT JOIN public.users u ON c.user_id = u.id
    WHERE c.ticket_id = $1
    ORDER BY c.created_at ASC`,
    [ticketId]
  )

  return rows
}

export async function getTicketSummary() {
  const { rows } = await pool.query(`
    SELECT 
      COUNT(*) FILTER (WHERE status = 'open') as open_count,
      COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_count,
      COUNT(*) FILTER (WHERE status = 'resolved') as resolved_count,
      COUNT(*) FILTER (WHERE priority = 'critical') as critical_count,
      COUNT(*) FILTER (WHERE priority = 'high') as high_count,
      COUNT(*) FILTER (WHERE priority = 'medium') as medium_count,
      COUNT(*) FILTER (WHERE priority = 'low') as low_count,
      COUNT(*) as total_count
    FROM public.tickets
  `)

  return rows[0]
}

export async function smartAssignTicket(ticketId: string) {
  // Get ticket
  const ticketResult = await pool.query(`SELECT * FROM public.tickets WHERE id = $1`, [ticketId])
  if (ticketResult.rows.length === 0) {
    return null
  }

  // Find agent with least assigned open/in-progress tickets
  const agentResult = await pool.query(
    `SELECT 
      u.id, u.name, u.email,
      COUNT(t.id) as ticket_count
    FROM public.users u
    LEFT JOIN public.tickets t ON u.id = t.assigned_to 
      AND t.status IN ('open', 'in_progress')
    WHERE u.role = 'agent' AND u.is_active = true
    GROUP BY u.id, u.name, u.email
    ORDER BY ticket_count ASC, u.name ASC
    LIMIT 1`
  )

  if (agentResult.rows.length === 0) {
    return null
  }

  const agent = agentResult.rows[0]

  // Assign ticket
  await pool.query(`UPDATE public.tickets SET assigned_to = $1 WHERE id = $2`, [agent.id, ticketId])

  // Log activity
  await logTicketActivity(ticketId, agent.id, 'assigned', { assigned_to: agent.id, assigned_to_name: agent.name })

  return {
    ticket_id: ticketId,
    assigned_to: agent.id,
    assigned_to_name: agent.name,
  }
}

export async function exportTickets(format: 'csv' | 'json') {
  const { rows } = await pool.query(`
    SELECT 
      t.id, t.title, t.description, t.status, t.priority, t.deadline, t.department,
      t.created_at, t.updated_at,
      creator.name as created_by_name,
      assignee.name as assigned_to_name,
      ai.predicted_category, ai.priority_level
    FROM public.tickets t
    LEFT JOIN public.users creator ON t.created_by = creator.id
    LEFT JOIN public.users assignee ON t.assigned_to = assignee.id
    LEFT JOIN public.ticket_ai_analysis ai ON t.id = ai.ticket_id
    ORDER BY t.created_at DESC
  `)

  if (format === 'json') {
    return JSON.stringify(rows, null, 2)
  }

  // CSV format
  if (rows.length === 0) {
    return 'No tickets found'
  }

  const headers = Object.keys(rows[0])
  const csvRows = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = row[header]
          if (value === null || value === undefined) return ''
          const stringValue = String(value)
          // Escape quotes and wrap in quotes if contains comma or newline
          if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
            return `"${stringValue.replace(/"/g, '""')}"`
          }
          return stringValue
        })
        .join(',')
    ),
  ]

  return csvRows.join('\n')
}

export async function getTicketActivity(ticketId: string) {
  try {
    const { rows } = await pool.query(
      `SELECT 
        id, ticket_id, user_id, action, metadata, created_at,
        (SELECT name FROM public.users WHERE id = ta.user_id) as user_name
      FROM public.ticket_activity ta
      WHERE ticket_id = $1
      ORDER BY created_at DESC
      LIMIT 100`,
      [ticketId]
    )
    return rows
  } catch (err: any) {
    // If ticket_activity table doesn't exist, return empty array
    // Check both error code and message
    if (err.code === '42P01' || err.message?.includes('does not exist') || err.message?.includes('ticket_activity')) {
      return []
    }
    throw err
  }
}

export async function suggestTicketSort(filters: TicketFilters): Promise<AISortSuggestion> {
  // Build query similar to listTickets but get all tickets
  const conditions: string[] = []
  const params: any[] = []
  let paramIndex = 1

  if (filters.role !== 'admin') {
    conditions.push(`(t.assigned_to = $${paramIndex} OR t.created_by = $${paramIndex})`)
    params.push(filters.userId)
    paramIndex++
  }

  if (filters.status) {
    conditions.push(`t.status = $${paramIndex}`)
    params.push(filters.status)
    paramIndex++
  }

  if (filters.priority) {
    conditions.push(`t.priority = $${paramIndex}`)
    params.push(filters.priority)
    paramIndex++
  }

  if (filters.search) {
    conditions.push(`(t.title ILIKE $${paramIndex} OR t.description ILIKE $${paramIndex})`)
    params.push(`%${filters.search}%`)
    paramIndex++
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const sql = `
    SELECT 
      t.id,
      t.status,
      t.priority,
      t.created_at,
      ai.ai_priority_score,
      ai.ai_priority_level,
      ai.ai_urgency_score,
      ai.ai_sentiment_label,
      ai.predicted_category as category,
      CASE t.status
        WHEN 'open' THEN 1
        WHEN 'in_progress' THEN 2
        WHEN 'resolved' THEN 3
        ELSE 4
      END as status_order
    FROM public.tickets t
    LEFT JOIN public.ticket_ai_analysis ai ON t.id = ai.ticket_id
    ${whereClause}
    ORDER BY t.created_at DESC
  `

  const { rows } = await pool.query(sql, params)

  // AI sorting logic: Multi-factor scoring
  const scoredTickets = rows.map((ticket) => {
    let score = 0

    // Factor 1: AI Priority Score (0-10) - highest weight
    if (ticket.ai_priority_score != null) {
      score += Number(ticket.ai_priority_score) * 10
    } else {
      // Fallback: use priority field if AI analysis doesn't exist
      const priorityScores: Record<string, number> = { critical: 10, high: 7, medium: 4, low: 1 }
      score += (priorityScores[ticket.priority] || 0) * 10
    }

    // Factor 2: Status priority (open > in_progress > resolved)
    score += (4 - ticket.status_order) * 5

    // Factor 3: Urgency boost
    if (ticket.ai_urgency_score != null) {
      if (ticket.ai_urgency_score >= 7) score += 15
      else if (ticket.ai_urgency_score >= 3) score += 8
    }

    // Factor 4: Sentiment boost
    if (ticket.ai_sentiment_label === 'angry') score += 10
    else if (ticket.ai_sentiment_label === 'frustrated') score += 5

    // Factor 5: Critical categories get boost
    if (ticket.category && ['Authentication', 'Database', 'API'].includes(ticket.category)) {
      score += 5
    }

    // Factor 6: Age penalty (older tickets get slight boost if high priority)
    const ageHours = (Date.now() - new Date(ticket.created_at).getTime()) / (1000 * 60 * 60)
    if (ticket.ai_priority_score != null && Number(ticket.ai_priority_score) >= 7 && ageHours > 24) {
      score += 3 // Escalate old high-priority tickets
    }

    return {
      ...ticket,
      sortScore: score,
    }
  })

  // Sort by calculated score (descending)
  scoredTickets.sort((a, b) => b.sortScore - a.sortScore)

  const sortedIds = scoredTickets.map((t) => t.id)

  // Generate explanation
  const criticalCount = scoredTickets.filter((t) => t.ai_priority_level === 'critical').length
  const highCount = scoredTickets.filter((t) => t.ai_priority_level === 'high').length

  const factors: string[] = []
  if (criticalCount > 0) factors.push(`${criticalCount} critical priority ticket${criticalCount > 1 ? 's' : ''}`)
  if (highCount > 0) factors.push(`${highCount} high priority ticket${highCount > 1 ? 's' : ''}`)

  const topTicket = scoredTickets[0]
  if (topTicket) {
    if (topTicket.ai_sentiment_label === 'angry') {
      factors.push('high customer frustration detected')
    }
    if (topTicket.ai_urgency_score >= 7) {
      factors.push('urgent issues requiring immediate attention')
    }
  }

  const explanation = `I've sorted ${scoredTickets.length} ticket${scoredTickets.length !== 1 ? 's' : ''} based on AI priority scores, urgency levels, customer sentiment, and ticket status. ${factors.length > 0 ? `Key factors: ${factors.join(', ')}.` : ''} The highest priority tickets are now at the top.`

  return {
    ticketIds: sortedIds,
    explanation,
    reasoning: {
      criticalCount,
      highCount,
      factors,
    },
  }
}

export async function deleteTicket(ticketId: string, userId: string) {
  // Check if ticket exists
  const ticketResult = await pool.query(`SELECT id FROM public.tickets WHERE id = $1`, [ticketId])
  if (ticketResult.rows.length === 0) {
    return null
  }

  // Delete related records first (in case CASCADE is not set up)
  // Delete comments
  await pool.query(`DELETE FROM public.ticket_comments WHERE ticket_id = $1`, [ticketId])
  
  // Delete tags
  await pool.query(`DELETE FROM public.ticket_tags WHERE ticket_id = $1`, [ticketId])
  
  // Delete AI analysis
  await pool.query(`DELETE FROM public.ticket_ai_analysis WHERE ticket_id = $1`, [ticketId])
  
  // Delete attachments
  await pool.query(`DELETE FROM public.ticket_attachments WHERE ticket_id = $1`, [ticketId])
  
  // Delete activity logs (if table exists)
  try {
    await pool.query(`DELETE FROM public.ticket_activity WHERE ticket_id = $1`, [ticketId])
  } catch (err: any) {
    // If ticket_activity table doesn't exist, ignore the error
    // Error code 42P01 = undefined_table in PostgreSQL
    // Also check error message in case code format differs
    if (err.code !== '42P01' && !err.message?.includes('does not exist') && !err.message?.includes('ticket_activity')) {
      throw err
    }
    // Silently ignore if table doesn't exist
  }
  
  // Finally, delete the ticket
  await pool.query(`DELETE FROM public.tickets WHERE id = $1`, [ticketId])

  return { success: true, ticketId }
}

// Helper function to log ticket activity
async function logTicketActivity(
  ticketId: string,
  userId: string,
  action: string,
  metadata: Record<string, any>
) {
  try {
    await pool.query(
      `INSERT INTO public.ticket_activity (ticket_id, user_id, action, metadata)
       VALUES ($1, $2, $3, $4)`,
      [ticketId, userId, action, JSON.stringify(metadata)]
    )
  } catch (err: any) {
    // Activity logging is non-critical, so we don't throw
    // Only log if it's not a "table doesn't exist" error
    if (err.code !== '42P01' && !err.message?.includes('does not exist') && !err.message?.includes('ticket_activity')) {
      console.error('Failed to log ticket activity:', err)
    }
    // Silently ignore if table doesn't exist
  }
}

