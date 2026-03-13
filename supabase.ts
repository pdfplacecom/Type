import { createClient } from '@supabase/supabase-js';

// Clean up potential quotes or whitespace from secrets
const cleanEnvVar = (val?: string) => val ? val.replace(/^["']|["']$/g, '').trim() : '';

const rawUrl = cleanEnvVar(import.meta.env.VITE_SUPABASE_URL);
const supabaseAnonKey = cleanEnvVar(import.meta.env.VITE_SUPABASE_ANON_KEY);

let supabaseUrl = rawUrl;
if (supabaseUrl && !supabaseUrl.startsWith('http')) {
  supabaseUrl = `https://${supabaseUrl}`;
}

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn('Supabase credentials are not set. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment variables.');
}

// We use a syntactically valid URL to prevent URL parsing errors, 
// but we will prevent actual fetches in the UI if not configured.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder-key'
);
