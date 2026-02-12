
import { createClient } from '@supabase/supabase-js';

// Fixed import.meta.env to process.env
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não configuradas. " +
    "A autenticação e persistência remota não funcionarão corretamente."
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder-url.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);
