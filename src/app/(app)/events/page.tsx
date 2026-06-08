import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EventsClient from './EventsClient'

export default async function EventsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/auth/register')

  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  const timeStr = now.toTimeString().slice(0, 8)

  // Upcoming: future bookings with open invites
  const { data: upcoming } = await supabase
    .from('bookings')
    .select('*, premise:premises(name, icon), participants:booking_participants(apt_number, profile_id)')
    .eq('community_id', profile.community_id)
    .eq('status', 'confirmed')
    .eq('invite_open', true)
    .gte('date', todayStr)
    .order('date')
    .order('slot_start')
    .limit(20)

  // Live: bookings happening right now
  const { data: live } = await supabase
    .from('bookings')
    .select('*, premise:premises(name, icon), participants:booking_participants(apt_number, profile_id)')
    .eq('community_id', profile.community_id)
    .eq('status', 'confirmed')
    .eq('date', todayStr)
    .lte('slot_start', timeStr)
    .gte('slot_end', timeStr)
    .order('slot_start')

  // Past: completed events from last 30 days
  const thirtyAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const { data: past } = await supabase
    .from('bookings')
    .select('*, premise:premises(name, icon), participants:booking_participants(apt_number)')
    .eq('community_id', profile.community_id)
    .eq('status', 'confirmed')
    .lt('date', todayStr)
    .gte('date', thirtyAgo)
    .order('date', { ascending: false })
    .limit(10)

  // Community voice for past events
  const { data: voicePosts } = await supabase
    .from('community_voice')
    .select('*')
    .eq('community_id', profile.community_id)
    .eq('trigger_type', 'event_completed')
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <EventsClient
      upcoming={upcoming || []}
      live={live || []}
      past={past || []}
      voicePosts={voicePosts || []}
      profile={profile}
    />
  )
}
