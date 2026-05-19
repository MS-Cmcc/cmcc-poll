import { getAnonClient } from "@/lib/db/client";

export function getSessionChannel(sessionId: string) {
  const supabase = getAnonClient();
  return supabase.channel(`session:${sessionId}`);
}

export function getServiceSessionChannel(sessionId: string) {
  // Use anon client for realtime; service client doesn't support realtime
  return getSessionChannel(sessionId);
}
