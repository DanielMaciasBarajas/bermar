'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'

interface FeedItem {
  id: string
  type: 'booking' | 'proposal' | 'listing' | 'maintenance' | 'voice'
  icon: string
  text: string
  meta: string
  created_at: string
}

interface Props {
  communityId: string
  initialItems: FeedItem[]
  activityLabel: string
}

function toFeedItem(table: string, row: any): FeedItem {
  switch (table) {
    case 'bookings':
      return { id: row.id, type: 'booking', icon: '📅', text: `Apt ${row.apt_number} booked a premise`, meta: row.date, created_at: row.created_at }
    case 'proposals':
      return { id: row.id, type: 'proposal', icon: '📢', text: `New proposal: ${row.title}`, meta: `by @${row.apt_number}`, created_at: row.created_at }
    case 'marketplace_listings':
      return { id: row.id, type: 'listing', icon: '⇄', text: `New listing: ${row.title}`, meta: `@${row.apt_number}`, created_at: row.created_at }
    case 'maintenance_tickets':
      return { id: row.id, type: 'maintenance', icon: '🔧', text: `Maintenance ticket submitted`, meta: `@${row.apt_number} · ${row.category}`, created_at: row.created_at }
    default:
      return { id: row.id, type: 'voice', icon: '💬', text: 'Community update', meta: '', created_at: row.created_at }
  }
}

export default function DashboardFeed({ communityId, initialItems, activityLabel }: Props) {
  const [items, setItems] = useState<FeedItem[]>(initialItems)
  const [pulse, setPulse] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    function addItem(table: string, row: any) {
      if (row.community_id !== communityId) return
      const item = toFeedItem(table, row)
      setItems(prev => [item, ...prev].slice(0, 20))
      setPulse(true)
      setTimeout(() => setPulse(false), 1000)
    }

    const channel = supabase
      .channel('dashboard-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bookings', filter: `community_id=eq.${communityId}` }, payload => addItem('bookings', payload.new))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'proposals', filter: `community_id=eq.${communityId}` }, payload => addItem('proposals', payload.new))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'marketplace_listings', filter: `community_id=eq.${communityId}` }, payload => addItem('marketplace_listings', payload.new))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'maintenance_tickets', filter: `community_id=eq.${communityId}` }, payload => addItem('maintenance_tickets', payload.new))
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [communityId])

  return (
    <div>
      <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {activityLabel}
        <span style={{
          width: '6px', height: '6px', borderRadius: '50%',
          background: pulse ? '#22c55e' : '#4ade8066',
          display: 'inline-block', transition: 'background 0.3s',
          boxShadow: pulse ? '0 0 6px #22c55e' : 'none',
        }} />
      </div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {items.length === 0 && (
          <div style={{ color: 'var(--txl)', fontSize: '12px', textAlign: 'center', padding: '24px 0' }}>
            No activity yet — will update live as things happen.
          </div>
        )}
        {items.map((item, i) => (
          <div key={item.id} className="feed-item" style={{
            padding: '10px 14px', borderTop: i === 0 ? 'none' : '1px solid var(--br)',
            display: 'flex', alignItems: 'flex-start', gap: '10px',
            animation: i === 0 && pulse ? 'feedIn 0.3s ease' : 'none',
          }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '14px', background: 'var(--sand-d)',
            }}>
              {item.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '12px', color: 'var(--tx)', fontWeight: 500 }}>{item.text}</div>
              {item.meta && <div style={{ fontSize: '10px', color: 'var(--txl)', marginTop: '1px' }}>{item.meta}</div>}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--txl)', flexShrink: 0 }}>
              {formatDate(item.created_at)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
