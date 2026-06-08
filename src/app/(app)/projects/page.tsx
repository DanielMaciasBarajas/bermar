import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProjectsClient from './ProjectsClient'

export default async function ProjectsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/auth/register')

  const { data: projects } = await supabase
    .from('projects')
    .select('*, updates:project_updates(*, posted_by:profiles(apt_number))')
    .eq('community_id', profile.community_id)
    .order('created_at', { ascending: false })

  return <ProjectsClient projects={projects || []} profile={profile} />
}
