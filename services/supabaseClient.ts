import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type SupabaseInit = { ok: boolean; error?: string };

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function isHttpsUrl(v: string): boolean {
  try {
    const u = new URL(v);
    return u.protocol === 'https:';
  } catch {
    return false;
  }
}

const metaEnv = (import.meta as any).env;
const rawUrl = metaEnv.VITE_SUPABASE_URL;
const rawAnonKey = metaEnv.VITE_SUPABASE_ANON_KEY;

let supabase: SupabaseClient | null = null;
let supabaseInit: SupabaseInit = { ok: true };

if (!isNonEmptyString(rawUrl)) {
  supabaseInit = { ok: false, error: '[Supabase] VITE_SUPABASE_URL ausente.' };
} else if (!isHttpsUrl(rawUrl)) {
  supabaseInit = { ok: false, error: '[Supabase] VITE_SUPABASE_URL inválida (exige https://).' };
} else if (!isNonEmptyString(rawAnonKey)) {
  supabaseInit = { ok: false, error: '[Supabase] VITE_SUPABASE_ANON_KEY ausente.' };
} else {
  supabase = createClient(rawUrl.trim(), rawAnonKey.trim(), {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
}

if (!supabaseInit.ok) console.error(supabaseInit.error);

export { supabase, supabaseInit };
