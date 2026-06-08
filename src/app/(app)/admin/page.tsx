import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminClient from './AdminClient'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || profile.role === 'resident') redirect('/dashboard')

  const communityId = profile.community_id

  const [
    { data: activityLog },
    { data: pendingProfiles },
    { data: community },
    { data: announcements },
    { data: allCommunities },
  ] = await Promise.all([
    supabase
      .from('activity_log')
      .select('*')
      .eq('community_id', communityId)
      .order('created_at', { ascending: false })
      .limit(30),
    supabase
      .from('profiles')
      .select('*, occupants(*)')
      .eq('community_id', communityId)
      .eq('approved', false)
      .order('created_at', { ascending: false }),
    supabase.from('communities').select('*').eq('id', communityId).single(),
    supabase
      .from('admin_announcements')
      .select('*')
      .eq('community_id', communityId)
      .order('created_at', { ascending: false })
      .limit(10),
    profile.role === 'sa'
      ? supabase.from('communities').select('*').order('created_at')
      : { data: null },
  ])

  return (
    <AdminClient
      profile={profile}
      community={community}
      activityLog={activityLog || []}
      pendingProfiles={pendingProfiles || []}
      announcements={announcements || []}
      allCommunities={allCommunities || []}
    />
  )
}
