import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BookingClient from './BookingClient'

export default async function BookingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/auth/register')

  const { data: premises } = await supabase
    .from('premises')
    .select('*')
    .eq('community_id', profile.community_id)
    .eq('active', true)
    .order('sort_order')

  const today = new Date().toISOString().split('T')[0]
  const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, participants:booking_participants(apt_number, profile_id)')
    .eq('community_id', profile.community_id)
    .eq('status', 'confirmed')
    .gte('date', today)
    .lte('date', thirtyDaysLater)

  return (
    <BookingClient
      premises={premises || []}
      existingBookings={bookings || []}
      profile={profile}
    />
  )
}
