import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProposalsClient from './ProposalsClient'

export default async function ProposalsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/auth/register')

  const { data: proposals } = await supabase
    .from('proposals')
    .select(`
      *,
      votes:proposal_votes(vote, profile_id),
      flags:proposal_flags(is_important, is_following, is_dismissed, last_read_at, profile_id),
      comments:proposal_comments(id, proposal_id, profile_id, apt_number, body, created_at)
    `)
    .eq('community_id', profile.community_id)
    .not('status', 'eq', 'archived')
    .order('created_at', { ascending: false })

  return <ProposalsClient proposals={proposals || []} profile={profile} />
}
