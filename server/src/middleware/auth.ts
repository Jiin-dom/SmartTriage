import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config'

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const token = header.slice(7)
  try {
    const payload = jwt.verify(token, config.jwtSecret)
    ;(req as any).user = payload
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

