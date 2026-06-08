import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import MobileLayoutShell from '@/components/layout/MobileLayoutShell'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*, occupants(*), interests(*)').eq('id', user.id).single()
  const { data: community } = await supabase.from('communities').select('*').eq('id', profile?.community_id).single()
  const { data: announcements } = await supabase.from('admin_announcements').select('*').eq('community_id', profile?.community_id).eq('active', true).eq('type', 'warning').order('created_at', { ascending: false }).limit(3)
  const { count: unreadNotifs } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('profile_id', user.id).eq('read', false)

  return (
    <MobileLayoutShell
      profile={profile}
      community={community}
      unreadNotifs={unreadNotifs || 0}
      warnings={announcements || []}
    >
      {children}
    </MobileLayoutShell>
  )
}
