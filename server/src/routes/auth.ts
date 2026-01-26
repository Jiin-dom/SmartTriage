import { Router } from 'express'
import { z } from 'zod'
import { login } from '../services/authService'
import { validate } from '../utils/validate'

const router = Router()

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
})

router.post('/login', async (req, res, next) => {
  try {
    const body = validate(loginSchema, req.body)
    const result = await login(body.email, body.password)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

export default router

