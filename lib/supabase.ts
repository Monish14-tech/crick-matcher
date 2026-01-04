import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    if (typeof window !== 'undefined') {
        console.warn("Supabase credentials missing. Please check your .env.local file.")
    }
}

// Export a dummy client if keys are missing to avoid crashes, 
// but it will fail on actual requests which we should handle in components.
export const supabase = (supabaseUrl && supabaseKey)
    ? createClient(supabaseUrl, supabaseKey)
    : null as any
