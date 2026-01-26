-- Add deadline column to tickets table
ALTER TABLE public.tickets
ADD COLUMN IF NOT EXISTS deadline TIMESTAMP WITH TIME ZONE;

-- Add index for deadline queries (useful for filtering/sorting by deadline)
CREATE INDEX IF NOT EXISTS idx_tickets_deadline ON public.tickets(deadline) WHERE deadline IS NOT NULL;


