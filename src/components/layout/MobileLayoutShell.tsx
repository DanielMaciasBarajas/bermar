'use client'

import { useState } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

interface Props {
  profile: any
  community: any
  unreadNotifs: number
  warnings: any[]
  children: React.ReactNode
}

export default function MobileLayoutShell({ profile, community, unreadNotifs, warnings, children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden', background: 'var(--sand)', position: 'relative' }}>
      <Sidebar
        profile={profile}
        community={community}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <Topbar
          community={community}
          profile={profile}
          unreadNotifs={unreadNotifs}
          warnings={warnings}
          onMenuToggle={() => setMobileOpen(o => !o)}
        />
        <main style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
