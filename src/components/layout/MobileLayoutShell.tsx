'use client'

import { useState } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import NotificationsPanel from './NotificationsPanel'

interface Props {
  profile: any
  community: any
  unreadNotifs: number
  warnings: any[]
  children: React.ReactNode
}

export default function MobileLayoutShell({ profile, community, unreadNotifs, warnings, children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [unread, setUnread] = useState(unreadNotifs)

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
          unreadNotifs={unread}
          warnings={warnings}
          onMenuToggle={() => setMobileOpen(o => !o)}
          onNotifClick={() => setNotifOpen(true)}
        />
        <main style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {children}
        </main>
      </div>

      {notifOpen && (
        <NotificationsPanel
          profileId={profile.id}
          onClose={() => setNotifOpen(false)}
          onRead={() => setUnread(0)}
        />
      )}
    </div>
  )
}
