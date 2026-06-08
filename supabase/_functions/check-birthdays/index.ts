// Supabase Edge Function: check-birthdays
// Deploy with: supabase functions deploy check-birthdays
// Schedule: daily at 08:00 via supabase cron
// supabase.toml: [functions.check-birthdays] schedule = "0 8 * * *"

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseKey)

  const today = new Date()
  const day = today.getDate()
  const month = today.getMonth() + 1

  // Find occupants with birthdays today
  const { data: birthdayOccupants, error } = await supabase
    .from('occupants')
    .select('*, profile:profiles(id, community_id, apt_number, birthday_wishes)')
    .eq('birthday_day', day)
    .eq('birthday_month', month)

  if (error) {
    console.error('Birthday check error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  const processed = []

  for (const occupant of birthdayOccupants || []) {
    const profile = occupant.profile
    if (!profile?.birthday_wishes) continue // opted out

    // Check community has birthday wishes enabled
    const { data: community } = await supabase
      .from('communities')
      .select('birthday_wishes_enabled')
      .eq('id', profile.community_id)
      .single()

    if (!community?.birthday_wishes_enabled) continue

    // Trigger Community Voice post
    const siteUrl = Deno.env.get('SITE_URL') || 'https://beramar.app'
    await fetch(`${siteUrl}/api/community-voice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        communityId: profile.community_id,
        triggerType: 'birthday',
        entityId: profile.id,
        context: { apt: profile.apt_number },
      }),
    })

    processed.push(profile.apt_number)
  }

  return new Response(JSON.stringify({
    success: true,
    date: `${day}/${month}`,
    processed,
  }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
