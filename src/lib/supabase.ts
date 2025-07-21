import { createClient } from '@supabase/supabase-js'

// Use environment variables with fallback values for debugging
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wslesjisswdhtgpfleym.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzbGVzamlzc3dkaHRncGZsZXltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwODQxNDAsImV4cCI6MjA2ODY2MDE0MH0.bVsBlR9s74GkDFOeZ5APKcxoBwQMQ-VTAYwljQHubn8'

console.log('Supabase URL:', supabaseUrl)
console.log('Using environment variables:', !!process.env.NEXT_PUBLIC_SUPABASE_URL)

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
