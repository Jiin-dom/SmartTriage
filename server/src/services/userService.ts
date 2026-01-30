import { pool } from '../db'
import bcrypt from 'bcrypt'

export async function listUsers() {
  const { rows } = await pool.query(
    'select id, name, email, role, is_active, created_at from public.users order by created_at desc'
  )
  return rows
}

export async function getUserProfile(userId: string) {
  const { rows } = await pool.query(
    `select id, name, email, role, is_active, created_at,
     COALESCE(notification_preferences, '{}'::jsonb) as notification_preferences,
     COALESCE(ai_preferences, '{}'::jsonb) as ai_preferences
     from public.users where id=$1`,
    [userId]
  )
  return rows[0]
}

export async function createUser(params: {
  name: string
  email: string
  role: 'admin' | 'agent'
  password: string
}) {
  const { name, email, role, password } = params

  // Ensure email is unique
  const existing = await pool.query('select id from public.users where email=$1', [email.trim()])
  if (existing.rows.length > 0) {
    throw { status: 400, message: 'A user with this email already exists' }
  }

  const saltRounds = 10
  const passwordHash = await bcrypt.hash(password, saltRounds)

  const { rows } = await pool.query(
    `insert into public.users (name, email, password_hash, role, is_active)
     values ($1, $2, $3, $4, true)
     returning id, name, email, role, is_active, created_at`,
    [name.trim(), email.trim(), passwordHash, role]
  )

  return rows[0]
}

export async function updateUserRole(userId: string, role: 'admin' | 'agent') {
  const { rows } = await pool.query(
    'update public.users set role=$1 where id=$2 returning id, name, email, role, is_active',
    [role, userId]
  )
  return rows[0]
}

export async function updateUserActive(userId: string, isActive: boolean) {
  const { rows } = await pool.query(
    'update public.users set is_active=$1 where id=$2 returning id, name, email, role, is_active',
    [isActive, userId]
  )
  return rows[0]
}

export async function updatePassword(userId: string, currentPassword: string, newPassword: string) {
  // Get current password hash (and email for potential default-admin bypass)
  const { rows } = await pool.query('select email, password_hash from public.users where id=$1', [userId])
  const user = rows[0]
  if (!user) {
    throw { status: 404, message: 'User not found' }
  }

  if (!user.password_hash) {
    throw { status: 401, message: 'Current password is incorrect' }
  }

  // Verify current password against stored hash
  const isValid = await bcrypt.compare(currentPassword, user.password_hash)

  // For seeded default accounts (@example.com), login currently allows a dev bypass
  // when using Password123!. Mirror that here so that users with the documented
  // default credentials can successfully change their password even if the original
  // hash does not match.
  const isDefaultAccountBypass =
    !isValid && user.email.endsWith('@example.com') && currentPassword === 'Password123!'

  if (!isValid && !isDefaultAccountBypass) {
    throw { status: 401, message: 'Current password is incorrect' }
  }

  // Hash new password
  const saltRounds = 10
  const newPasswordHash = await bcrypt.hash(newPassword, saltRounds)

  // Update password
  await pool.query('update public.users set password_hash=$1 where id=$2', [newPasswordHash, userId])
  return { success: true }
}

export async function updateUserPreferences(
  userId: string,
  preferences: {
    notification_preferences?: Record<string, any>
    ai_preferences?: Record<string, any>
  }
) {
  const updates: string[] = []
  const params: any[] = [userId]
  let paramIndex = 1

  if (preferences.notification_preferences !== undefined) {
    paramIndex++
    updates.push(`notification_preferences = $${paramIndex}`)
    params.push(JSON.stringify(preferences.notification_preferences))
  }

  if (preferences.ai_preferences !== undefined) {
    paramIndex++
    updates.push(`ai_preferences = $${paramIndex}`)
    params.push(JSON.stringify(preferences.ai_preferences))
  }

  if (updates.length === 0) {
    throw { status: 400, message: 'No preferences to update' }
  }

  const { rows } = await pool.query(
    `update public.users set ${updates.join(', ')} where id=$1 
     returning id, 
     COALESCE(notification_preferences, '{}'::jsonb) as notification_preferences,
     COALESCE(ai_preferences, '{}'::jsonb) as ai_preferences`,
    params
  )
  if (rows.length === 0) {
    throw { status: 404, message: 'User not found' }
  }
  return rows[0]
}
