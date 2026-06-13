$content = @'
''use client''

import { useState } from ''react''
import { createClient } from ''@/lib/supabase/client''
import { formatDate, formatTime } from ''@/lib/utils''
import { useTranslations } from ''next-intl''
import type { Profile } from ''@/lib/supabase/types''

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
type Tab = ''today'' | ''week'' | ''notices''

export default function EventsClient({ todayBookings, weekBookings, announcements, socialProposals, profile }: Props) {
  const supabase = createClient()
  const t = useTranslations(''events'')
  const lang = (profile as any).preferred_lang || ''CA''
  const locale = lang.toLowerCase()
  const [activeTab, setActiveTab] = useState<Tab>(''today'')
  const [joiningId, setJoiningId] = useState<string | null>(null)

  function getPremiseName(premise: BookingData[''premise'']): string {
    if (!premise) return ''''
    const nt = premise.name_translations
    if (nt && typeof nt === ''object'') return nt[lang] || nt[''CA''] || nt[''ES''] || premise.name
    return premise.name
  }

  function getTimeLabel(b: BookingData): string {
    if (b.slot_start) return formatTime(b.slot_start) + ''-'' + formatTime(b.slot_end || '''')
    if (b.halfday_period) return t(b.halfday_period as any)
    return ''''
  }

  function getDayLabel(dateStr: string): string {
    const now = new Date()
    const today = now.toISOString().split(''T'')[0]
    const tomorrow = new Date(now.getTime() + 86400000).toISOString().split(''T'')[0]
    if (dateStr === today) return t(''today_label'')
    if (dateStr === tomorrow) return t(''tomorrow_label'')
    return formatDate(dateStr, locale)
  }

  async function joinBooking(bookingId: string) {
    setJoiningId(bookingId)
    await supabase.from(''booking_participants'').upsert({ booking_id: bookingId, profile_id: profile.id, apt_number: profile.apt_number })
    setJoiningId(null)
  }

  async function leaveBooking(bookingId: string) {
    await supabase.from(''booking_participants'').delete().eq(''booking_id'', bookingId).eq(''profile_id'', profile.id)
  }

  const noticeCount = announcements.length + socialProposals.length

  const tabs = [
    { id: ''today'' as Tab, label: t(''today'') },
    { id: ''week'' as Tab, label: t(''this_week'') },
    { id: ''notices'' as Tab, label: noticeCount > 0 ? t(''notice_board'') + '' ('' + noticeCount + '')'' : t(''notice_board'') },
  ]

  const annTypeColors: Record<string, { bg: string; border: string; color: string; label: string }> = {
    warning:      { bg: ''#fef2f2'', border: ''#fecaca'', color: ''#991b1b'', label: t(''warning'') },
    announcement: { bg: ''#fffbeb'', border: ''#fde68a'', color: ''#92400e'', label: t(''announcement'') },
    convocatoria: { bg: ''#f0fdf4'', border: ''#bbf7d0'', color: ''#166534'', label: t(''convocatoria'') },
  }

  function BookingCard({ b }: { b: BookingData }) {
    const isParticipant = b.participants.some(p => p.profile_id === profile.id)
    const isOwner = b.apt_number === profile.apt_number
    const spotsLeft = b.invite_open ? (b.invite_max_slots || 0) - b.participants.length : 0
    const timeLabel = getTimeLabel(b)
    const now = new Date()
    const todayStr = now.toISOString().split(''T'')[0]
    const nowTime = now.toTimeString().slice(0, 8)
    const isLive = b.date === todayStr && !!b.slot_start && b.slot_start <= nowTime && (b.slot_end || ''23:59'') >= nowTime

    return (
      <div className="card" style={{ display: ''flex'', gap: ''12px'', alignItems: ''flex-start'' }}>
        <div style={{ width: ''40px'', height: ''40px'', borderRadius: ''12px'', background: ''var(--sand-d)'', display: ''flex'', alignItems: ''center'', justifyContent: ''center'', fontSize: ''20px'', flexShrink: 0 }}>
          {b.premise?.icon || ''🏠''}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: ''flex'', alignItems: ''center'', gap: ''6px'', marginBottom: ''4px'', flexWrap: ''wrap'' }}>
            <span style={{ fontSize: ''13px'', fontWeight: 500, color: ''var(--tx)'' }}>{getPremiseName(b.premise)}</span>
            {isLive && <span className="tag tag-green" style={{ fontSize: ''9px'' }}>LIVE</span>}
            {b.invite_open && <span className="tag tag-amber" style={{ fontSize: ''9px'' }}>{t(''invite_open'')}</span>}
          </div>
          <div style={{ fontSize: ''11px'', color: ''var(--txm)'', marginBottom: b.invite_open ? ''10px'' : 0 }}>
            {timeLabel && <span style={{ fontWeight: 500, color: ''var(--tx)'' }}>{timeLabel}{'' ''}</span>}
            {t(''booked_by'', { apt: b.apt_number })}
            {b.participants.length > 0 && '' - '' + t(''participants'', { n: b.participants.length + 1, s: ''s'' })}
            {b.invite_open && spotsLeft > 0 && '' - '' + t(''spots_open'', { n: spotsLeft, s: spotsLeft !== 1 ? ''s'' : '''' })}
            {b.invite_open && spotsLeft === 0 && '' - '' + t(''full'')}
          </div>
          {b.invite_open && !isOwner && (
            <div style={{ display: ''flex'', gap: ''8px'' }}>
              {!isParticipant && spotsLeft > 0 && (
                <button onClick={() => joinBooking(b.id)} disabled={joiningId === b.id}
                  className="btn btn-primary btn-sm" style={{ opacity: joiningId === b.id ? 0.6 : 1 }}>
                  {joiningId === b.id ? ''...'' : t(''join'')}
                </button>
              )}
              {isParticipant && (
                <button onClick={() => leaveBooking(b.id)} className="btn btn-sm">{t(''leave'')}</button>
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
    <div style={{ maxWidth: ''720px'', margin: ''0 auto'' }}>
      <div className="tab-bar" style={{ marginBottom: ''16px'' }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={activeTab === tab.id ? ''tab-item active'' : ''tab-item''}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === ''today'' && (
        <div style={{ display: ''flex'', flexDirection: ''column'', gap: ''10px'' }}>
          {todayBookings.length === 0 && (
            <div style={{ textAlign: ''center'', padding: ''48px 0'', color: ''var(--txl)'', fontSize: ''13px'' }}>
              <div style={{ fontSize: ''32px'', marginBottom: ''12px'' }}>☀️</div>
              {t(''no_bookings_today'')}
            </div>
          )}
          {todayBookings.map(b => <BookingCard key={b.id} b={b} />)}
        </div>
      )}

      {activeTab === ''week'' && (
        <div style={{ display: ''flex'', flexDirection: ''column'', gap: ''16px'' }}>
          {weekBookings.length === 0 && (
            <div style={{ textAlign: ''center'', padding: ''48px 0'', color: ''var(--txl)'', fontSize: ''13px'' }}>
              <div style={{ fontSize: ''32px'', marginBottom: ''12px'' }}>📅</div>
              {t(''no_bookings_week'')}
            </div>
          )}
          {Object.entries(weekByDay).map(([date, bks]) => (
            <div key={date}>
              <div style={{ fontSize: ''11px'', fontWeight: 600, color: ''var(--pine)'', textTransform: ''uppercase'', letterSpacing: ''0.5px'', marginBottom: ''8px'' }}>
                {getDayLabel(date)}
              </div>
              <div style={{ display: ''flex'', flexDirection: ''column'', gap: ''8px'' }}>
                {bks.map(b => <BookingCard key={b.id} b={b} />)}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === ''notices'' && (
        <div style={{ display: ''flex'', flexDirection: ''column'', gap: ''12px'' }}>
          {announcements.length === 0 && socialProposals.length === 0 && (
            <div style={{ textAlign: ''center'', padding: ''48px 0'', color: ''var(--txl)'', fontSize: ''13px'' }}>
              <div style={{ fontSize: ''32px'', marginBottom: ''12px'' }}>📋</div>
              {t(''no_notices'')}
            </div>
          )}
          {announcements.map(ann => {
            const style = annTypeColors[ann.type] || annTypeColors.announcement
            return (
              <div key={ann.id} style={{ borderRadius: ''16px'', border: ''1px solid '' + style.border, background: style.bg, padding: ''16px'' }}>
                <div style={{ display: ''flex'', alignItems: ''center'', gap: ''8px'', marginBottom: ''8px'' }}>
                  <span style={{ fontSize: ''10px'', fontWeight: 600, textTransform: ''uppercase'', letterSpacing: ''0.5px'', color: style.color, background: ''rgba(255,255,255,0.6)'', padding: ''2px 8px'', borderRadius: ''999px'', border: ''1px solid '' + style.border }}>
                    {style.label}
                  </span>
                  <span style={{ fontSize: ''10px'', color: ''var(--txl)'' }}>{formatDate(ann.created_at, locale)}</span>
                </div>
                <div style={{ fontSize: ''14px'', fontWeight: 500, color: ''var(--tx)'', marginBottom: ann.body ? ''6px'' : 0 }}>{ann.title}</div>
                {ann.body && <div style={{ fontSize: ''12px'', color: ''var(--txm)'', lineHeight: 1.5 }}>{ann.body}</div>}
                {ann.meeting_date && (
                  <div style={{ marginTop: ''10px'', fontSize: ''12px'', color: style.color, fontWeight: 500 }}>
                    📅 {formatDate(ann.meeting_date, locale)}{ann.meeting_location ? '' - '' + ann.meeting_location : ''''}
                  </div>
                )}
                {ann.pdf_url && (
                  <a href={ann.pdf_url} target="_blank" rel="noopener noreferrer"
                    style={{ display: ''inline-flex'', alignItems: ''center'', gap: ''4px'', marginTop: ''10px'', fontSize: ''11px'', color: style.color, textDecoration: ''none'', fontWeight: 500 }}>
                    📄 PDF
                  </a>
                )}
              </div>
            )
          })}
          {socialProposals.map(p => (
            <div key={p.id} className="card">
              <div style={{ display: ''flex'', alignItems: ''center'', gap: ''8px'', marginBottom: ''8px'' }}>
                <span style={{ fontSize: ''10px'', fontWeight: 600, textTransform: ''uppercase'', letterSpacing: ''0.5px'', color: ''#0f766e'', background: ''#f0fdfa'', padding: ''2px 8px'', borderRadius: ''999px'', border: ''1px solid #99f6e4'' }}>
                  {t(p.category as any)}
                </span>
                <span style={{ fontSize: ''10px'', color: ''var(--txl)'' }}>@{p.apt_number} - {formatDate(p.created_at, locale)}</span>
              </div>
              <div style={{ fontSize: ''14px'', fontWeight: 500, color: ''var(--tx)'', marginBottom: ''4px'' }}>{p.title}</div>
              <div style={{ fontSize: ''12px'', color: ''var(--txm)'', lineHeight: 1.5, marginBottom: ''10px'' }}>{p.body}</div>
              <div style={{ fontSize: ''11px'', color: ''var(--txl)'' }}>👍 {p.supports} - 👎 {p.against}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

'@
[System.IO.File]::WriteAllText('src\app\(app)\events\EventsClient.tsx', $content, [System.Text.Encoding]::UTF8)
Write-Host 'Written:' (Get-Item 'src\app\(app)\events\EventsClient.tsx').Length 'bytes'
