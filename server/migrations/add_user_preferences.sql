-- Migration: Add user preferences columns
-- Run this in your Supabase SQL editor or via psql

-- Add notification_preferences column (JSONB)
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{}'::jsonb;

-- Add ai_preferences column (JSONB)
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS ai_preferences JSONB DEFAULT '{}'::jsonb;

-- Add indexes for better query performance (optional)
CREATE INDEX IF NOT EXISTS idx_users_notification_prefs ON public.users USING GIN (notification_preferences);
CREATE INDEX IF NOT EXISTS idx_users_ai_prefs ON public.users USING GIN (ai_preferences);


