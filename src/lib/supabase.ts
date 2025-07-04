import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Types for our meditation content
export interface MeditationContent {
  id: string
  title: string
  description: string
  category_id: string
  meditation_duration: number
  audio_url: string
  audio_file_duration?: number
  content_type?: string
  is_loop: boolean
  loop_start_time?: number
  loop_end_time?: number
  available_durations?: number[]
  default_duration?: number
  difficulty_level?: string
  benefits?: string[]
  instructions?: string
  cover_image_url?: string
  is_active: boolean
  created_at: string
  updated_at: string
  // Joined relation from query
  meditation_categories?: {
    name_turkish: string
    color: string
  }
}

export interface MeditationCategory {
  id: string
  name: string
  name_turkish: string
  description: string
  icon: string
  color: string
  content_count: number
}
