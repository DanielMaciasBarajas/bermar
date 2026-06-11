// src/app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'
import { createClient } from '@/lib/supabase/server'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'

export const metadata: Metadata = {
  title: 'Bermar — Community',
  description: 'Bermar community platform — Gavà Mar, Barcelona',
  themeColor: '#1a3d2b',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Bermar',
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const messages = await getMessages()

  const supabase = await createClient()
  const slug = process.env.NEXT_PUBLIC_COMMUNITY_SLUG || 'bermar'
  const { data: community } = await supabase
    .from('communities')
    .select('logo_url')
    .eq('slug', slug)
    .single()

  const faviconUrl = community?.logo_url || '/icon-192.png'

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet" />
        <link rel="icon" href={faviconUrl} />
        <link rel="apple-touch-icon" href={faviconUrl} />
      </head>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
