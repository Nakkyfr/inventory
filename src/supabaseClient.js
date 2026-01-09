import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ldqnmfuydiimkptukcho.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkcW5tZnV5ZGlpbWtwdHVrY2hvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNDE0OTEsImV4cCI6MjA4MjkxNzQ5MX0.3mKb4X1f1WlMHqwcFd-f8gGUhggWrEfTtO-EYwr2m_U';

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);
