import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { communityId, triggerType, entityId, context } = await request.json()
    const supabase = await createServiceClient()

    const { data: community } = await supabase
      .from('communities')
      .select('name, languages_core, community_voice_enabled, birthday_wishes_enabled')
      .eq('id', communityId)
      .single()

    if (!community?.community_voice_enabled) {
      return NextResponse.json({ skipped: true, reason: 'Community Voice disabled' })
    }
    if (triggerType === 'birthday' && !community.birthday_wishes_enabled) {
      return NextResponse.json({ skipped: true, reason: 'Birthday wishes disabled' })
    }

    const langs = community.languages_core || ['CA', 'ES', 'EN', 'FR', 'RU']

    const triggerInstructions: Record<string, string> = {
      birthday: `A resident in apartment ${context?.apt || 'an apartment'} has a birthday today. Write a warm, brief 2-3 sentence community message celebrating this, without being too specific about who it is. Keep it personal but private.`,
      new_neighbour: `A new resident has joined the community in apartment ${context?.apt || 'an apartment'}. Write a warm, brief 2-3 sentence welcome message for the whole community. Mention the building, the neighbourhood, and the feeling of belonging.`,
      milestone: `The community has reached ${context?.milestone || 'a milestone'}. Write a brief 2-3 sentence celebratory community post. Keep it warm and slightly poetic.`,
      proposal_milestone: `A community proposal called "${context?.proposalTitle || 'a proposal'}" has reached ${context?.supports || 'significant'} supporters. Write a brief 2-3 sentence update for the community. Encouraging and forward-looking.`,
      marketplace_quirk: `Write a brief 2-3 sentence Community Voice post inspired by the variety of listings in the marketplace: ${context?.items || 'neighbours helping neighbours'}. Warm, slightly poetic, celebrating community spirit.`,
      event_completed: `An event just finished: ${context?.eventName || 'a community event'} in the ${context?.premise || 'common area'}. Write a brief 2-3 sentence post about it. Nostalgic, warm, like a good memory.`,
    }

    const instruction = triggerInstructions[triggerType] || 'Write a brief 2-3 sentence community update.'

    // Generate text for each active language
    const bodies: Record<string, string> = {}

    for (const lang of langs) {
      const langNames: Record<string, string> = {
        CA: 'Catalan', ES: 'Spanish', EN: 'English', FR: 'French',
        RU: 'Russian', DE: 'German', IT: 'Italian', NL: 'Dutch',
        UK: 'Ukrainian', SR: 'Serbian', HI: 'Hindi', PT: 'Portuguese',
      }

      if (!process.env.ANTHROPIC_API_KEY) {
        // Fallback if no API key
        bodies[lang] = `Community Voice — ${triggerType} — ${community.name}`
        continue
      }

      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 200,
            messages: [{
              role: 'user',
              content: `You are writing a Community Voice post for ${community.name}, a residential community in Gavà Mar, Barcelona. 

${instruction}

Write this in ${langNames[lang] || lang}. Keep it to 2-3 sentences maximum. Warm, slightly poetic, never AI-sounding. Do not start with "I" or the community name. Do not add any commentary before or after — just the post text itself.`,
            }],
          }),
        })

        const data = await response.json()
        bodies[lang] = data.content?.[0]?.text?.trim() || ''
      } catch (e) {
        console.error(`CV generation failed for ${lang}:`, e)
        bodies[lang] = ''
      }
    }

    // Store in DB
    const { data: voicePost, error } = await supabase.from('community_voice').insert({
      community_id: communityId,
      trigger_type: triggerType,
      body: bodies,
      entity_id: entityId || null,
    }).select().single()

    if (error) throw error

    return NextResponse.json({ success: true, voicePost })
  } catch (error) {
    console.error('Community Voice error:', error)
    return NextResponse.json({ error: 'Failed to generate Community Voice post' }, { status: 500 })
  }
}
