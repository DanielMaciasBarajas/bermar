// src/app/api/manifest/route.ts
// Returns a dynamic PWA manifest using the community's uploaded logo.
// layout.tsx points <link rel="manifest"> here instead of /manifest.json

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const FALLBACK_ICON = '/icon-192.png' // static fallback if no logo uploaded yet

export async function GET() {
  const supabase = await createClient()
  const slug = process.env.NEXT_PUBLIC_COMMUNITY_SLUG || 'bermar'

  const { data: community } = await supabase
    .from('communities')
    .select('name, logo_url, primary_color')
    .eq('slug', slug)
    .single()

  const iconUrl = community?.logo_url || FALLBACK_ICON
  const appName = community?.name || 'Bermar Park'
  const themeColor = community?.primary_color || '#1a3d2b'

  const manifest = {
    name: appName,
    short_name: appName.split(' ')[0],
    description: `${appName} community app`,
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#f5f0e8',
    theme_color: themeColor,
    orientation: 'portrait',
    icons: [
      { src: iconUrl, sizes: '192x192', type: 'image/png' },
      { src: iconUrl, sizes: '512x512', type: 'image/png' },
    ],
  }

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=3600', // cache 1hr — refreshes after logo change
    },
  })
}
