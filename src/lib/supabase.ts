import { createClient } from '@supabase/supabase-js'

// O ponto de exclamação (!) no final diz ao TypeScript: 
// "Pode confiar, essa variável vai existir, não me dê erro."
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)