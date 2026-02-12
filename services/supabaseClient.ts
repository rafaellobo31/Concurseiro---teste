
import { createClient } from '@supabase/supabase-js';

// No Vite, variáveis de ambiente prefixadas com VITE_ devem ser acessadas via import.meta.env
// Fix: Cast import.meta to any to resolve TS error when env property is not recognized
const metaEnv = (import.meta as any).env;
const supabaseUrl = metaEnv?.VITE_SUPABASE_URL;
const supabaseAnonKey = metaEnv?.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não configuradas no ambiente Vite. " +
    "A autenticação e persistência remota não funcionarão corretamente."
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder-url.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);
