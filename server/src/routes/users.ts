import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import {
  listUsers,
  getUserProfile,
  updateUserRole,
  updateUserActive,
  updatePassword,
  updateUserPreferences,
  createUser,
} from '../services/userService'
import { z } from 'zod'
import { validate } from '../utils/validate'

const router = Router()

// Simple admin check helper
function requireAdmin(req: any, res: any, next: any) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }
  next()
}

router.get('/', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const users = await listUsers()
    res.json({ data: users })
  } catch (err) {
    next(err)
  }
})

router.post('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(1),
      email: z.string().email(),
      role: z.enum(['admin', 'agent']),
      password: z.string().min(8),
    })
    const body = validate(schema, req.body)
    const user = await createUser({
      name: body.name,
      email: body.email,
      role: body.role,
      password: body.password,
    })
    res.status(201).json(user)
  } catch (err) {
    next(err)
  }
})

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const userId = (req as any).user.sub
    const profile = await getUserProfile(userId)
    if (!profile) {
      return res.status(404).json({ error: 'User not found' })
    }
    res.json(profile)
  } catch (err) {
    next(err)
  }
})

router.patch('/me/password', requireAuth, async (req, res, next) => {
  try {
    const userId = (req as any).user.sub
    const schema = z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(8),
    })
    const body = validate(schema, req.body)
    await updatePassword(userId, body.currentPassword, body.newPassword)
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

router.patch('/me/preferences', requireAuth, async (req, res, next) => {
  try {
    const userId = (req as any).user.sub
    const schema = z.object({
      notification_preferences: z.record(z.any()).optional(),
      ai_preferences: z.record(z.any()).optional(),
    })
    const body = validate(schema, req.body)
    const result = await updateUserPreferences(userId, body)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

router.patch('/:id/role', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const schema = z.object({ role: z.enum(['admin', 'agent']) })
    const body = validate(schema, req.body)
    const { id } = req.params
    const user = await updateUserRole(id, body.role)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    res.json(user)
  } catch (err) {
    next(err)
  }
})

router.patch('/:id/active', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const schema = z.object({ isActive: z.boolean() })
    const body = validate(schema, req.body)
    const { id } = req.params
    const user = await updateUserActive(id, body.isActive)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    res.json(user)
  } catch (err) {
    next(err)
  }
})

export default router
