import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MarketplaceClient from './MarketplaceClient'

export default async function MarketplacePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/auth/register')

  const { data: community } = await supabase
    .from('communities').select('short_term_rental_allowed, rental_min_months').eq('id', profile.community_id).single()

  const { data: listings } = await supabase
    .from('marketplace_listings')
    .select('*')
    .eq('community_id', profile.community_id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  return (
    <MarketplaceClient
      listings={listings || []}
      profile={profile}
      shortTermAllowed={(community as any)?.short_term_rental_allowed || false}
      rentalMinMonths={(community as any)?.rental_min_months || 10}
    />
  )
}
