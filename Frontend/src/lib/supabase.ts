import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey)

// Type for the iipc_data table
export interface IIPCData {
  id: number
  ark_url: string
  title: string
  date: string
  creator: string
  subject: string
  description: string
  item_type: string
  source_url: string
  full_text: string
  cleaned_text: string
  created_at: string
} 