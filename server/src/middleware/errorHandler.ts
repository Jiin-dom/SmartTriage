import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  console.error(err)

  if (err instanceof ZodError) {
    const message =
      err.errors?.[0]?.message ||
      'Request validation failed. Please check required fields and formats.'
    return res.status(400).json({ error: message })
  }

  const status = err?.status ?? 500
  const message = err?.message ?? 'Server error'
  res.status(status).json({ error: message })
}

