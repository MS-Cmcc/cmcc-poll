import { createClient } from "@supabase/supabase-js";

// Server-side client with service role (bypasses RLS)
export function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Support both SUPABASE_SERVICE_ROLE_KEY (old) and SUPABASE_SECRET_KEY (new Supabase UI)
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Supabase env vars not set");
  return createClient(url, key, { auth: { persistSession: false } });
}

// Client-side client with anon/publishable key (RLS applies — used for Realtime in display panel)
export function getAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Support both old name (ANON_KEY) and new Supabase dashboard name (PUBLISHABLE_KEY)
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars not set");
  return createClient(url, key);
}
