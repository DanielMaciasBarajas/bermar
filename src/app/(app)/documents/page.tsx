import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DocumentsClient from './DocumentsClient'

export default async function DocumentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/auth/register')

  const { data: documents } = await supabase
    .from('documents')
    .select('*, files:document_files(*)')
    .eq('community_id', profile.community_id)
    .order('created_at', { ascending: false })

  const { data: community } = await supabase
    .from('communities')
    .select('languages_core, languages_extended')
    .eq('id', profile.community_id)
    .single()

  const allLangs = [
    ...(community?.languages_core || ['CA','ES','EN','FR','RU']),
    ...(community?.languages_extended || []),
  ]

  return <DocumentsClient documents={documents || []} allLangs={allLangs} profile={profile} />
}
