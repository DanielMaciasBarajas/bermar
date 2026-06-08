import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DirectoryClient from './DirectoryClient'

export default async function DirectoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/auth/register')

  const { data: apartments } = await supabase
    .from('apartments')
    .select('*')
    .eq('community_id', profile.community_id)
    .order('floor', { ascending: false })
    .order('door')

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, apt_number, username, avatar_url, show_in_directory, show_names')
    .eq('community_id', profile.community_id)
    .eq('approved', true)

  const { data: occupants } = await supabase
    .from('occupants')
    .select('profile_id, name')
    .in('profile_id', (profiles || []).map(p => p.id))

  const { data: emergencyContacts } = await supabase
    .from('emergency_contacts')
    .select('*')
    .eq('community_id', profile.community_id)
    .order('sort_order')

  return (
    <DirectoryClient
      apartments={apartments || []}
      profiles={profiles || []}
      occupants={occupants || []}
      emergencyContacts={emergencyContacts || []}
      currentProfile={profile}
    />
  )
}
