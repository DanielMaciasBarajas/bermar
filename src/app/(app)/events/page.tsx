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
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [
    { data: todayBookings },
    { data: weekBookings },
    { data: announcements },
    { data: socialProposals },
  ] = await Promise.all([
    supabase
      .from('bookings')
      .select('*, premise:premises(name, icon, name_translations), participants:booking_participants(apt_number, profile_id)')
      .eq('community_id', profile.community_id)
      .eq('status', 'confirmed')
      .eq('date', todayStr)
      .order('slot_start'),

    supabase
      .from('bookings')
      .select('*, premise:premises(name, icon, name_translations), participants:booking_participants(apt_number, profile_id)')
      .eq('community_id', profile.community_id)
      .eq('status', 'confirmed')
      .gt('date', todayStr)
      .lte('date', sevenDaysLater)
      .order('date')
      .order('slot_start'),

    supabase
      .from('admin_announcements')
      .select('*')
      .eq('community_id', profile.community_id)
      .eq('active', true)
      .order('created_at', { ascending: false }),

    supabase
      .from('proposals')
      .select('*')
      .eq('community_id', profile.community_id)
      .in('category', ['meeting', 'social'])
      .in('status', ['open', 'voting'])
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  return (
    <EventsClient
      todayBookings={todayBookings || []}
      weekBookings={weekBookings || []}
      announcements={announcements || []}
      socialProposals={socialProposals || []}
      profile={profile}
    />
  )
}
