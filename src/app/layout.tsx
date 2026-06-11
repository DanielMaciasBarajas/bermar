// src/app/layout.tsx
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'

export const metadata: Metadata = {
  title: 'Bermar — Community',
  description: 'Bermar community platform — Gavà Mar, Barcelona',
  manifest: '/manifest.json',
  themeColor: '#2d6b65',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Bermar',
  },
  openGraph: {
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
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

  const faviconUrl = community?.logo_url || '/icon-192x192.png'

  return (
    <html lang="en">
      <head>
        {/* Favicon — dynamic (Supabase logo) with static fallbacks */}
        <link rel="icon" href={faviconUrl} />
        <link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32" />
        <link rel="icon" href="/favicon-16x16.png" type="image/png" sizes="16x16" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href={faviconUrl} />

        {/* Service Worker */}
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js');
            });
          }
        `}} />
      </head>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
