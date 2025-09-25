import { createClient } from "@supabase/supabase-js"

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
) 

export const supabaseGameForSmart = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL_GAMEFORSMART!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_GAMEFORSMART!
)