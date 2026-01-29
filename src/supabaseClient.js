import { createClient } from "@supabase/supabase-js";

// Read from Vite environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Hard fail early if missing (VERY IMPORTANT)
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Supabase environment variables are missing");
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);
