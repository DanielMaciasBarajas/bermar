'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'

interface Notification {
  id: string
  type: string
  title: string
  body: string | null
  read: boolean
  created_at: string
  entity_type: string | null
  entity_id: string | null
}

interface Props {
  profileId: string
  onClose: () => void
  onRead: () => void
}

const TYPE_ICON: Record<string, string> = {
  booking: '📅',
  proposal: '📢',
  listing: '⇄',
  maintenance: '🔧',
  announcement: '📣',
  warning: '⚠️',
  voice: '💬',
  default: '🔔',
}

export default function NotificationsPanel({ profileId, onClose, onRead }: Props) {
  const supabase = createClient()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('profile_id', profileId)
        .order('created_at', { ascending: false })
        .limit(30)
      setNotifications(data || [])
      setLoading(false)

      // Mark all as read
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('profile_id', profileId)
        .eq('read', false)
      onRead()
    }
    load()
  }, [profileId])

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
          zIndex: 60, backdropFilter: 'blur(2px)',
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: '320px', maxWidth: '100vw',
        background: '#fff', zIndex: 70,
        display: 'flex', flexDirection: 'column',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
        animation: 'slideInRight 0.25s ease',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px', borderBottom: '1px solid var(--br)',
        }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--tx)' }}>🔔 Notifications</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--txl)', padding: '4px' }}>✕</button>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--txl)', fontSize: '13px' }}>Loading...</div>
          )}
          {!loading && notifications.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--txl)', fontSize: '13px' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔔</div>
              No notifications yet.
            </div>
          )}
          {notifications.map((n, i) => (
            <div key={n.id} style={{
              display: 'flex', gap: '12px', padding: '14px 16px',
              borderTop: i === 0 ? 'none' : '1px solid var(--br)',
              background: n.read ? 'transparent' : 'rgba(26,61,43,0.04)',
              transition: 'background 0.15s',
            }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '10px', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '16px', background: 'var(--sand-d)',
              }}>
                {TYPE_ICON[n.type] || TYPE_ICON.default}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '12px', fontWeight: n.read ? 400 : 600, color: 'var(--tx)', marginBottom: '2px' }}>{n.title}</div>
                {n.body && <div style={{ fontSize: '11px', color: 'var(--txm)', lineHeight: 1.4 }}>{n.body}</div>}
                <div style={{ fontSize: '10px', color: 'var(--txl)', marginTop: '4px' }}>{formatDate(n.created_at)}</div>
              </div>
              {!n.read && (
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--pine)', flexShrink: 0, marginTop: '4px' }} />
              )}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  )
}
