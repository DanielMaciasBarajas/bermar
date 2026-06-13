'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDate, formatTime } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import type { Profile } from '@/lib/supabase/types'

interface BookingData {
  id: string; apt_number: string; date: string
  slot_start: string | null; slot_end: string | null; halfday_period: string | null
  invite_open: boolean; invite_max_slots: number | null
  premise: { name: string; icon: string; name_translations?: any } | null
  participants: { apt_number: string; profile_id: string }[]
}
interface Announcement {
  id: string; type: string; title: string; body: string | null
  meeting_date: string | null; meeting_location: string | null
  pdf_url: string | null; created_at: string
}
interface Proposal {
  id: string; title: string; body: string; category: string; status: string
  apt_number: string; created_at: string; supports: number; against: number
}
interface Props {
  todayBookings: BookingData[]
  weekBookings: BookingData[]
  announcements: Announcement[]
  socialProposals: Proposal[]
  profile: Profile
}
type Tab = 'today' | 'week' | 'notices'

export default function EventsClient({ todayBookings, weekBookings, announcements, socialProposals, profile }: Props) {
  const supabase = createClient()
  const t = useTranslations('events')
  const lang = (profile as any).preferred_lang || 'CA'
  const locale = lang.toLowerCase()
  const [activeTab, setActiveTab] = useState<Tab>('today')
  const [joiningId, setJoiningId] = useState<string | null>(null)

  function getPremiseName(premise: BookingData['premise']): string {
    if (!premise) return ''
    const nt = premise.name_translations
    if (nt && typeof nt === 'object') return nt[lang] || nt['CA'] || nt['ES'] || premise.name
    return premise.name
  }

  function getTimeLabel(b: BookingData): string {
    if (b.slot_start) return formatTime(b.slot_start) + '-' + formatTime(b.slot_end || '')
    if (b.halfday_period) return t(b.halfday_period as any)
    return ''
  }

  function getDayLabel(dateStr: string): string {
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const tomorrow = new Date(now.getTime() + 86400000).toISOString().split('T')[0]
    if (dateStr === today) return t('today_label')
    if (dateStr === tomorrow) return t('tomorrow_label')
    return formatDate(dateStr, locale)
  }

  async function joinBooking(bookingId: string) {
    setJoiningId(bookingId)
    await supabase.from('booking_participants').upsert({ booking_id: bookingId, profile_id: profile.id, apt_number: profile.apt_number })
    setJoiningId(null)
  }

  async function leaveBooking(bookingId: string) {
    await supabase.from('booking_participants').delete().eq('booking_id', bookingId).eq('profile_id', profile.id)
  }

  const noticeCount = announcements.length + socialProposals.length

  const tabs = [
    { id: 'today' as Tab, label: t('today') },
    { id: 'week' as Tab, label: t('this_week') },
    { id: 'notices' as Tab, label: noticeCount > 0 ? t('notice_board') + ' (' + noticeCount + ')' : t('notice_board') },
  ]

  const annTypeColors: Record<string, { bg: string; border: string; color: string; label: string }> = {
    warning:      { bg: '#fef2f2', border: '#fecaca', color: '#991b1b', label: t('warning') },
    announcement: { bg: '#fffbeb', border: '#fde68a', color: '#92400e', label: t('announcement') },
    convocatoria: { bg: '#f0fdf4', border: '#bbf7d0', color: '#166534', label: t('convocatoria') },
  }

  function BookingCard({ b }: { b: BookingData }) {
    const isParticipant = b.participants.some(p => p.profile_id === profile.id)
    const isOwner = b.apt_number === profile.apt_number
    const spotsLeft = b.invite_open ? (b.invite_max_slots || 0) - b.participants.length : 0
    const timeLabel = getTimeLabel(b)
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]
    const nowTime = now.toTimeString().slice(0, 8)
    const isLive = b.date === todayStr && !!b.slot_start && b.slot_start <= nowTime && (b.slot_end || '23:59') >= nowTime

    return (
      <div className="card" style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--sand-d)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
          {b.premise?.icon || '🏠'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--tx)' }}>{getPremiseName(b.premise)}</span>
            {isLive && <span className="tag tag-green" style={{ fontSize: '9px' }}>LIVE</span>}
            {b.invite_open && <span className="tag tag-amber" style={{ fontSize: '9px' }}>{t('invite_open')}</span>}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--txm)', marginBottom: b.invite_open ? '10px' : 0 }}>
            {timeLabel && <span style={{ fontWeight: 500, color: 'var(--tx)' }}>{timeLabel}{' '}</span>}
            {t('booked_by', { apt: b.apt_number })}
            {b.participants.length > 0 && ' - ' + t('participants', { n: b.participants.length + 1, s: 's' })}
            {b.invite_open && spotsLeft > 0 && ' - ' + t('spots_open', { n: spotsLeft, s: spotsLeft !== 1 ? 's' : '' })}
            {b.invite_open && spotsLeft === 0 && ' - ' + t('full')}
          </div>
          {b.invite_open && !isOwner && (
            <div style={{ display: 'flex', gap: '8px' }}>
              {!isParticipant && spotsLeft > 0 && (
                <button onClick={() => joinBooking(b.id)} disabled={joiningId === b.id}
                  className="btn btn-primary btn-sm" style={{ opacity: joiningId === b.id ? 0.6 : 1 }}>
                  {joiningId === b.id ? '...' : t('join')}
                </button>
              )}
              {isParticipant && (
                <button onClick={() => leaveBooking(b.id)} className="btn btn-sm">{t('leave')}</button>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  const weekByDay = weekBookings.reduce((acc, b) => {
    if (!acc[b.date]) acc[b.date] = []
    acc[b.date].push(b)
    return acc
  }, {} as Record<string, BookingData[]>)

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto' }}>
      <div className="tab-bar" style={{ marginBottom: '16px' }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={activeTab === tab.id ? 'tab-item active' : 'tab-item'}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'today' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {todayBookings.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--txl)', fontSize: '13px' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>☀️</div>
              {t('no_bookings_today')}
            </div>
          )}
          {todayBookings.map(b => <BookingCard key={b.id} b={b} />)}
        </div>
      )}

      {activeTab === 'week' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {weekBookings.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--txl)', fontSize: '13px' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>📅</div>
              {t('no_bookings_week')}
            </div>
          )}
          {Object.entries(weekByDay).map(([date, bks]) => (
            <div key={date}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--pine)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                {getDayLabel(date)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {bks.map(b => <BookingCard key={b.id} b={b} />)}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'notices' && (
        <div>
          <style>{`
            .cork-board { background: #c8a96e; background-image: radial-gradient(ellipse at 20% 30%, rgba(180,130,60,0.4) 0%, transparent 50%), radial-gradient(ellipse at 70% 60%, rgba(210,160,80,0.3) 0%, transparent 40%), repeating-linear-gradient(45deg, rgba(160,110,50,0.06) 0px, rgba(160,110,50,0.06) 2px, transparent 2px, transparent 8px), repeating-linear-gradient(-45deg, rgba(200,150,70,0.05) 0px, rgba(200,150,70,0.05) 2px, transparent 2px, transparent 8px); border-radius: 12px; border: 6px solid #8b6520; box-shadow: inset 0 2px 8px rgba(0,0,0,0.25); padding: 28px 20px 36px; }
            .cork-frame { border: 3px solid #6b4e1a; border-radius: 8px; padding: 20px; background: #c09050; background-image: repeating-linear-gradient(90deg, rgba(140,90,30,0.07) 0px, rgba(140,90,30,0.07) 1px, transparent 1px, transparent 12px); box-shadow: inset 0 1px 6px rgba(0,0,0,0.2); }
            .cork-title { font-size: 11px; font-weight: 600; color: #3d2a00; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 20px; text-align: center; }
            .cork-notes { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 32px 16px; }
            .cork-note { position: relative; padding: 14px 14px 18px; border-radius: 2px; box-shadow: 2px 3px 8px rgba(0,0,0,0.22); min-height: 110px; }
            .cork-note.r-l { transform: rotate(-2.1deg); }
            .cork-note.r-r { transform: rotate(1.8deg); }
            .cork-note.r-t { transform: rotate(-0.7deg); }
            .cork-note.r-m { transform: rotate(2.8deg); }
            .cork-pin { position: absolute; top: -10px; left: 50%; transform: translateX(-50%); width: 14px; height: 14px; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.4), inset 0 1px 2px rgba(255,255,255,0.3); z-index: 2; }
            .cork-tag { display: inline-block; font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.6px; padding: 2px 6px; border-radius: 3px; margin-bottom: 6px; }
            .cork-note-title { font-size: 13px; font-weight: 600; color: #2c2c2a; margin: 0 0 5px; line-height: 1.3; }
            .cork-note-body { font-size: 11px; color: #555; line-height: 1.5; margin: 0 0 8px; }
            .cork-note-meta { font-size: 10px; color: #888; margin: 0; }
            .cork-empty { text-align: center; padding: 40px 0; color: #7a5c20; font-size: 13px; }
          `}</style>
          <div className="cork-board">
            <div className="cork-frame">
              <p className="cork-title">Bermar Park</p>
              {announcements.length === 0 && socialProposals.length === 0 && (
                <div className="cork-empty">{t('no_notices')}</div>
              )}
              <div className="cork-notes">
                {announcements.map((ann, i) => {
                  const rotations = ['r-l','r-r','r-t','r-m']
                  const rot = rotations[i % 4]
                  const pinColors = { warning: '#d32f2f', announcement: '#e65100', convocatoria: '#1565c0' }
                  const pinColor = pinColors[ann.type as keyof typeof pinColors] || '#555'
                  const bgColors = { warning: '#fff8e1', announcement: '#fffef0', convocatoria: '#e8f4fd' }
                  const bg = bgColors[ann.type as keyof typeof bgColors] || '#fffef0'
                  return (
                    <div key={ann.id} className={'cork-note ' + rot} style={{ background: bg }}>
                      <div className="cork-pin" style={{ background: pinColor }} />
                      <span className="cork-tag" style={ann.type === 'warning' ? {background:'#fff3cd',color:'#856404',border:'1px solid #ffc107'} : ann.type === 'convocatoria' ? {background:'#cce5ff',color:'#004085',border:'1px solid #0d6efd'} : {background:'#fff3e0',color:'#7f3f00',border:'1px solid #ff8c00'}}>{t(ann.type as any)}</span>
                      <p className="cork-note-title">{ann.title}</p>
                      {ann.body && <p className="cork-note-body">{ann.body}</p>}
                      {ann.meeting_date && <p className="cork-note-meta">📅 {formatDate(ann.meeting_date, locale)}{ann.meeting_location ? ' - ' + ann.meeting_location : ''}</p>}
                      {ann.pdf_url && <a href={ann.pdf_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '10px', color: '#555', display: 'block', marginTop: '6px' }}>📄 PDF</a>}
                      <p className="cork-note-meta">{formatDate(ann.created_at, locale)}</p>
                    </div>
                  )
                })}
                {socialProposals.map((p, i) => {
                  const rotations = ['r-r','r-l','r-m','r-t']
                  const rot = rotations[i % 4]
                  const pinColors = ['#2e7d32','#f9a825','#7b1fa2','#c62828']
                  const pinColor = pinColors[i % 4]
                  return (
                    <div key={p.id} className={'cork-note ' + rot} style={{ background: '#f0fff4' }}>
                      <div className="cork-pin" style={{ background: pinColor }} />
                      <span className="cork-tag" style={{ background: '#d4edda', color: '#155724', border: '1px solid #28a745' }}>{t(p.category as any)}</span>
                      <p className="cork-note-title">{p.title}</p>
                      <p className="cork-note-body">{p.body}</p>
                      <p className="cork-note-meta">@{p.apt_number} - 👍 {p.supports} - 👎 {p.against}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}