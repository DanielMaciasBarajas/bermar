'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDate, formatTime } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import type { Profile } from '@/lib/supabase/types'

interface BookingData {
  id: string; apt_number: string; date: string; slot_start: string | null; slot_end: string | null
  halfday_period: string | null; invite_open: boolean; invite_scope: string; invite_max_slots: number | null
  premise: { name: string; icon: string } | null
  participants: { apt_number: string; profile_id: string }[]
}
interface VoicePost { id: string; body: any; trigger_type: string; entity_id?: string | null; created_at: string }
interface Props { upcoming: BookingData[]; live: BookingData[]; past: BookingData[]; voicePosts: VoicePost[]; profile: Profile }
type Tab = 'upcoming' | 'live' | 'past'

export default function EventsClient({ upcoming, live, past, voicePosts, profile }: Props) {
  const supabase = createClient()
  const tc = useTranslations('common')
  const [activeTab, setActiveTab] = useState<Tab>('upcoming')
  const [joiningId, setJoiningId] = useState<string | null>(null)

  async function joinBooking(bookingId: string) {
    setJoiningId(bookingId)
    await supabase.from('booking_participants').upsert({ booking_id: bookingId, profile_id: profile.id, apt_number: profile.apt_number })
    setJoiningId(null)
  }

  async function leaveBooking(bookingId: string) {
    await supabase.from('booking_participants').delete().eq('booking_id', bookingId).eq('profile_id', profile.id)
  }

  const tabs = [
    { id: 'upcoming' as Tab, label: `Upcoming${upcoming.length > 0 ? ` (${upcoming.length})` : ''}` },
    { id: 'live' as Tab, label: `Live now${live.length > 0 ? ` (${live.length})` : ''}` },
    { id: 'past' as Tab, label: 'Past' },
  ]

  const avatarBase: React.CSSProperties = { width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 600, color: '#fff', flexShrink: 0 }

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto' }}>
      <div className="tab-bar" style={{ marginBottom: '16px' }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={activeTab === tab.id ? 'tab-item active' : 'tab-item'}>{tab.label}</button>
        ))}
      </div>

      {/* UPCOMING */}
      {activeTab === 'upcoming' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {upcoming.length === 0 && <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--txl)', fontSize: '13px' }}>No upcoming open events. Book a premise and open it to neighbours!</div>}
          {upcoming.map(booking => {
            const isParticipant = booking.participants.some(p => p.profile_id === profile.id)
            const isOwner = booking.apt_number === profile.apt_number
            const spotsLeft = (booking.invite_max_slots || 0) - booking.participants.length
            return (
              <div key={booking.id} className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span className="tag tag-amber">Invite open</span>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--tx)' }}>{booking.premise?.name} · @{booking.apt_number}</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--txm)', marginBottom: '12px' }}>
                  {formatDate(booking.date)}
                  {booking.slot_start && ` · ${formatTime(booking.slot_start)}–${formatTime(booking.slot_end || '')}`}
                  {booking.halfday_period && ` · ${booking.halfday_period}`}
                  {` · ${booking.participants.length}/${booking.invite_max_slots} spots filled`}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                  <div style={{ ...avatarBase, background: 'var(--pine)' }}>{booking.apt_number.slice(0,2)}</div>
                  {booking.participants.map(p => <div key={p.profile_id} style={{ ...avatarBase, background: '#4b5563' }}>{p.apt_number.slice(0,2)}</div>)}
                  {spotsLeft > 0 && Array.from({ length: spotsLeft }).map((_, i) => <div key={i} style={{ ...avatarBase, background: '#dbeafe', color: '#1e40af', fontWeight: 500 }}>+1</div>)}
                  {spotsLeft > 0 && <span style={{ fontSize: '11px', color: '#2563eb', marginLeft: '4px' }}>{spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} open</span>}
                </div>
                {!isOwner && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {!isParticipant && spotsLeft > 0 && (
                      <button onClick={() => joinBooking(booking.id)} disabled={joiningId === booking.id} className="btn btn-primary btn-sm" style={{ opacity: joiningId === booking.id ? 0.6 : 1 }}>
                        {joiningId === booking.id ? '...' : tc('join')}
                      </button>
                    )}
                    {isParticipant && <button onClick={() => leaveBooking(booking.id)} className="btn btn-sm">{tc('leave')}</button>}
                    {spotsLeft === 0 && !isParticipant && <span style={{ fontSize: '11px', color: 'var(--txl)', padding: '6px 0' }}>Full</span>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* LIVE */}
      {activeTab === 'live' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {live.length === 0 && <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--txl)', fontSize: '13px' }}>No events happening right now.</div>}
          {live.map(booking => {
            const spotsLeft = (booking.invite_max_slots || 0) - booking.participants.length
            const isParticipant = booking.participants.some(p => p.profile_id === profile.id)
            const isOwner = booking.apt_number === profile.apt_number
            return (
              <div key={booking.id} className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span className="tag tag-green" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span className="pulse-dot" />Live</span>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--tx)' }}>{booking.premise?.name} · @{booking.apt_number}</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--txm)', marginBottom: '12px' }}>
                  {booking.slot_start && `${formatTime(booking.slot_start)}–${formatTime(booking.slot_end || '')} · `}
                  {booking.participants.length > 0 ? `${booking.participants.length} participant${booking.participants.length !== 1 ? 's' : ''}` : 'Just started'}
                  {booking.invite_open && spotsLeft > 0 && ` · ${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} open`}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                  <div style={{ ...avatarBase, background: 'var(--pine)' }}>{booking.apt_number.slice(0,2)}</div>
                  {booking.participants.map(p => <div key={p.profile_id} style={{ ...avatarBase, background: '#4b5563' }}>{p.apt_number.slice(0,2)}</div>)}
                  {booking.invite_open && spotsLeft > 0 && Array.from({ length: Math.min(spotsLeft, 3) }).map((_, i) => <div key={i} style={{ ...avatarBase, background: '#dbeafe', color: '#1e40af' }}>+</div>)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '10px', borderTop: '1px solid var(--br)' }}>
                  <button style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--txl)', background: 'none', border: 'none', cursor: 'pointer' }}>📷 Add photo (optional · visible to all)</button>
                  {booking.invite_open && !isOwner && !isParticipant && spotsLeft > 0 && (
                    <button onClick={() => joinBooking(booking.id)} className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }}>{tc('join')}</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* PAST */}
      {activeTab === 'past' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {past.length === 0 && <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--txl)', fontSize: '13px' }}>No past events in the last 30 days.</div>}
          {past.map(booking => {
            const voicePost = voicePosts.find(v => v.entity_id === booking.id)
            const voiceText = voicePost ? (typeof voicePost.body === 'object' ? voicePost.body.EN || voicePost.body.CA || Object.values(voicePost.body)[0] : voicePost.body) : null
            return (
              <div key={booking.id} className="cv-card" style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', background: 'var(--pine)' }}>🎾</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '8px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--pine)', marginBottom: '4px' }}>{booking.premise?.name} · {formatDate(booking.date)}</div>
                  {voiceText
                    ? <p style={{ fontSize: '13px', fontStyle: 'italic', lineHeight: 1.4, marginBottom: '8px', fontFamily: 'DM Serif Display, serif' }}>{voiceText}</p>
                    : <p style={{ fontSize: '11px', color: 'var(--txm)', marginBottom: '8px' }}>{booking.participants.length > 0 ? `${booking.participants.length + 1} participants` : `Booked by @${booking.apt_number}`}{booking.slot_start && ` · ${formatTime(booking.slot_start)}–${formatTime(booking.slot_end || '')}`}</p>
                  }
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <div style={{ ...avatarBase, width: '20px', height: '20px', fontSize: '7px', background: 'var(--pine)' }}>{booking.apt_number.slice(0,2)}</div>
                    {booking.participants.slice(0,5).map((p, i) => <div key={i} style={{ ...avatarBase, width: '20px', height: '20px', fontSize: '7px', background: '#6b7280' }}>{p.apt_number.slice(0,2)}</div>)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
