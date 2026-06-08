import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MaintenanceClient from './MaintenanceClient'

export default async function MaintenancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/auth/register')

  const { data: community } = await supabase
    .from('communities')
    .select('moha_name, moha_schedule, moha_whatsapp, on_call_enabled, on_call_contact, liaison_email, admin_company_name')
    .eq('id', profile.community_id)
    .single()

  const { data: myTickets } = await supabase
    .from('maintenance_tickets')
    .select('*')
    .eq('profile_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(10)

  return (
    <MaintenanceClient
      profile={profile}
      community={community as any}
      myTickets={myTickets || []}
    />
  )
}
