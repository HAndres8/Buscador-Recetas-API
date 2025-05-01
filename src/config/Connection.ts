import { createClient, SupabaseClient } from "@supabase/supabase-js"
import { Database } from "types/database"

let supabase: SupabaseClient<Database> | null = null

const ConnectionSupabase = () => {
   if(!supabase){
      supabase = createClient<Database>(
         process.env.SUPABASE_URL!,
         process.env.SUPABASE_ANON_KEY!,
      )
   }
   
   return supabase
}

export default ConnectionSupabase