// Supabase integration — optional. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env to enable.
export const hasSupabase = !!(
  import.meta.env.VITE_SUPABASE_URL &&
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export const supabase = null; // replace with createClient(...) if @supabase/supabase-js is installed
