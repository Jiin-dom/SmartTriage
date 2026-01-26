import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import {
  listTickets,
  createTicket,
  getTicketDetails,
  addComment,
  listComments,
  updateTicket,
  getTicketSummary,
  smartAssignTicket,
  exportTickets,
  getTicketActivity,
  suggestTicketSort,
  deleteTicket,
  reAnalyzeTicket,
} from '../services/ticketService'
import { z } from 'zod'
import { validate } from '../utils/validate'

const router = Router()

const createTicketSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  assignedTo: z.string().uuid().nullable().optional(),
  deadline: z.string().datetime().nullable().optional(),
})

const commentSchema = z.object({
  message: z.string().min(1),
})

const updateTicketSchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  assignedTo: z.string().uuid().nullable().optional(),
  title: z.string().min(3).optional(),
  description: z.string().min(10).optional(),
  deadline: z.string().datetime().nullable().optional(),
})

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { status, priority, search } = req.query

    const page = Math.max(1, Number(req.query.page) || 1)
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20))
    const offset = (page - 1) * pageSize

    const user = (req as any).user as { sub: string; role: string; email: string }

    const result = await listTickets({
      status: typeof status === 'string' ? status : undefined,
      priority: typeof priority === 'string' ? priority : undefined,
      search: typeof search === 'string' ? search : undefined,
      limit: pageSize,
      offset,
      role: user.role,
      userId: user.sub
    })

    res.json({
      data: result.rows,
      pagination: {
        page,
        pageSize,
        total: result.total
      }
    })
  } catch (err) {
    next(err)
  }
})

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const body = validate(createTicketSchema, req.body)
    const user = (req as any).user as { sub: string; role: string }

    const result = await createTicket({
      title: body.title,
      description: body.description,
      priority: body.priority,
      createdBy: user.sub,
      assignedTo: body.assignedTo ?? null,
      deadline: body.deadline ?? null,
    })

    res.status(201).json({ ticket: result })
  } catch (err) {
    next(err)
  }
})

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params
    if (!id || Array.isArray(id)) {
      return res.status(400).json({ error: 'Invalid ticket ID' })
    }
    const ticket = await getTicketDetails(id)
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' })
    }
    res.json(ticket)
  } catch (err) {
    next(err)
  }
})

router.post('/:id/re-analyze', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params
    if (!id || Array.isArray(id)) {
      return res.status(400).json({ error: 'Invalid ticket ID' })
    }
    const { reAnalyzeTicket } = await import('../services/ticketService')
    const updatedTicket = await reAnalyzeTicket(id)
    res.json(updatedTicket)
  } catch (err: any) {
    if (err.message === 'Ticket not found') {
      return res.status(404).json({ error: err.message })
    }
    next(err)
  }
})

router.get('/:id/comments', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params
    if (!id || Array.isArray(id)) {
      return res.status(400).json({ error: 'Invalid ticket ID' })
    }
    const comments = await listComments(id)
    res.json({ data: comments })
  } catch (err) {
    next(err)
  }
})

router.post('/:id/comments', requireAuth, async (req, res, next) => {
  try {
    const body = validate(commentSchema, req.body)
    const { id } = req.params
    if (!id || Array.isArray(id)) {
      return res.status(400).json({ error: 'Invalid ticket ID' })
    }
    const user = (req as any).user as { sub: string }

    const comment = await addComment(id, user.sub, body.message)
    res.status(201).json(comment)
  } catch (err) {
    next(err)
  }
})

router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const body = validate(updateTicketSchema, req.body)
    const { id } = req.params
    if (!id || Array.isArray(id)) {
      return res.status(400).json({ error: 'Invalid ticket ID' })
    }
    const user = (req as any).user as { sub: string }
    const updated = await updateTicket(
      id,
      {
        status: body.status,
        priority: body.priority,
        assignedTo: body.assignedTo,
        title: body.title,
        description: body.description,
        deadline: body.deadline,
      },
      user.sub
    )
    if (!updated) {
      return res.status(404).json({ error: 'Ticket not found or no changes' })
    }
    res.json(updated)
  } catch (err) {
    next(err)
  }
})

router.get('/summary/stats', requireAuth, async (_req, res, next) => {
  try {
    const summary = await getTicketSummary()
    res.json(summary)
  } catch (err) {
    next(err)
  }
})

router.post('/:id/smart-assign', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params
    if (!id || Array.isArray(id)) {
      return res.status(400).json({ error: 'Invalid ticket ID' })
    }
    const result = await smartAssignTicket(id)
    if (!result) {
      return res.status(404).json({ error: 'No available agents to assign' })
    }
    res.json(result)
  } catch (err) {
    next(err)
  }
})

router.get('/export/:format', requireAuth, async (req, res, next) => {
  try {
    const { format } = req.params
    if (format !== 'csv' && format !== 'json') {
      return res.status(400).json({ error: 'Format must be csv or json' })
    }
    const data = await exportTickets(format as 'csv' | 'json')
    res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename=tickets-${Date.now()}.${format}`)
    res.send(data)
  } catch (err) {
    next(err)
  }
})

router.get('/:id/activity', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params
    if (!id || Array.isArray(id)) {
      return res.status(400).json({ error: 'Invalid ticket ID' })
    }
    const activity = await getTicketActivity(id)
    res.json({ data: activity })
  } catch (err) {
    next(err)
  }
})

// Simple admin check helper
function requireAdmin(req: any, res: any, next: any) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }
  next()
}

router.post('/suggest-sort', requireAuth, async (req, res, next) => {
  try {
    const { status, priority, search } = req.query
    const user = (req as any).user as { sub: string; role: string; email: string }

    const suggestion = await suggestTicketSort({
      status: typeof status === 'string' ? status : undefined,
      priority: typeof priority === 'string' ? priority : undefined,
      search: typeof search === 'string' ? search : undefined,
      limit: 1000, // Get all tickets for sorting
      offset: 0,
      role: user.role,
      userId: user.sub,
    })

    res.json(suggestion)
  } catch (err) {
    next(err)
  }
})

router.delete('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params
    if (!id || Array.isArray(id)) {
      return res.status(400).json({ error: 'Invalid ticket ID' })
    }
    const user = (req as any).user as { sub: string }

    console.log('DELETE /api/tickets/:id called with id:', id, 'user:', user.sub)
    const result = await deleteTicket(id, user.sub)
    if (!result) {
      return res.status(404).json({ error: 'Ticket not found' })
    }
    console.log('Ticket deleted successfully:', id)
    res.json({ success: true, message: 'Ticket deleted successfully' })
  } catch (err) {
    console.error('Error deleting ticket:', err)
    next(err)
  }
})

export default router

