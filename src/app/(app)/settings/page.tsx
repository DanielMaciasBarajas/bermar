import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SettingsClient from './SettingsClient'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, occupants(*), interests(*)')
    .eq('id', user.id)
    .single()

  const { data: apartment } = await supabase
    .from('apartments')
    .select('*')
    .eq('id', profile?.apartment_id)
    .single()

  return <SettingsClient profile={profile} apartment={apartment} email={user.email || ''} />
}
