'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { generateSlots, formatTime } from '@/lib/utils'
import type { Premise, Booking, Profile } from '@/lib/supabase/types'

interface Props {
  premises: Premise[]
  existingBookings: (Booking & { participants: { apt_number: string; profile_id: string }[] })[]
  profile: Profile
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAYS = ['Mo','Tu','We','Th','Fr','Sa','Su']

const CHESS_LABELS: Record<string, string> = {
  CA: 'Escacs', ES: 'Ajedrez', EN: 'Chess', FR: 'Échecs',
  RU: 'Шахматы', DE: 'Schach', IT: 'Scacchi',
}

export default function BookingClient({ premises, existingBookings, profile }: Props) {
  const supabase = createClient()
  const [selectedPremise, setSelectedPremise] = useState<Premise | null>(premises[0] || null)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteScope, setInviteScope] = useState<'none' | 'interest' | 'apt' | 'all'>('interest')
  const [inviteTargetApt, setInviteTargetApt] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [calendarUrl, setCalendarUrl] = useState('')

  const today = new Date()
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()

  const calDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1)
    const lastDay = new Date(currentYear, currentMonth + 1, 0)
    const startDow = (firstDay.getDay() + 6) % 7
    const days: (number | null)[] = Array(startDow).fill(null)
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(d)
    return days
  }, [currentMonth, currentYear])

  const dayBookings = useMemo(() => {
    if (!selectedPremise) return []
    return existingBookings.filter(b =>
      b.premise_id === selectedPremise.id && b.date === selectedDate
    )
  }, [selectedPremise, selectedDate, existingBookings])

  const myDayBookings = dayBookings.filter(b => b.profile_id === profile.id)

  const slots = useMemo(() => {
    if (!selectedPremise || selectedPremise.booking_type !== 'slots') return []
    return generateSlots(
      selectedPremise.available_from || '08:00',
      selectedPremise.available_until || '22:00',
      selectedPremise.slot_duration_minutes || 90
    )
  }, [selectedPremise])

  function getSlotStatus(start: string, end: string) {
    const booking = dayBookings.find(b => b.slot_start === start)
    if (!booking) {
      if (myDayBookings.length > 0 && selectedPremise?.gap_required) {
        const slotStart = parseInt(start.replace(':', ''))
        for (const mb of myDayBookings) {
          const mbEnd = parseInt((mb.slot_end || '').replace(':', ''))
          const mbStart = parseInt((mb.slot_start || '').replace(':', ''))
          const slotEnd = parseInt(end.replace(':', ''))
          if (mbEnd === slotStart || slotEnd === mbStart) return 'gap'
        }
      }
      return 'free'
    }
    if (booking.profile_id === profile.id) return 'mine'
    if (booking.invite_open) return 'invite'
    return 'taken'
  }

  function getDateStatus(day: number) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
    const todayStr = today.toISOString().split('T')[0]
    if (dateStr === todayStr) return 'today'
    const hasMyBooking = existingBookings.some(b =>
      b.premise_id === selectedPremise?.id && b.date === dateStr && b.profile_id === profile.id
    )
    if (hasMyBooking) return 'mine'
    const hasBooking = existingBookings.some(b =>
      b.premise_id === selectedPremise?.id && b.date === dateStr
    )
    if (hasBooking) return 'booked'
    return 'free'
  }

  function buildCalendarUrl(date: string, start: string, end: string, premiseName: string) {
    // Google Calendar expects dates as YYYYMMDDTHHmmssZ
    const toGCal = (d: string, t: string) => {
      const [y, m, day] = d.split('-')
      const [h, min] = t.split(':')
      return `${y}${m}${day}T${h}${min}00`
    }
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: `${premiseName} — Bermar`,
      dates: `${toGCal(date, start)}/${toGCal(date, end)}`,
      details: `Booking at ${premiseName}, Apt ${profile.apt_number}`,
      location: 'Bermar, Gavà',
    })
    return `https://calendar.google.com/calendar/render?${params.toString()}`
  }

  async function bookSlot(start: string, end: string) {
    if (!selectedPremise) return
    setSaving(true)
    const { error } = await supabase.from('bookings').insert({
      community_id: profile.community_id,
      premise_id: selectedPremise.id,
      profile_id: profile.id,
      apt_number: profile.apt_number,
      date: selectedDate,
      slot_start: start,
      slot_end: end,
      status: 'confirmed',
      invite_open: inviteOpen,
      invite_scope: inviteOpen ? inviteScope : 'none',
      invite_target_apt: inviteScope === 'apt' ? inviteTargetApt : null,
      invite_max_slots: inviteOpen ? (selectedPremise.max_invite_slots || null) : null,
    })
    setSaving(false)
    if (!error) {
      setSuccess(`Booked ${formatTime(start)}–${formatTime(end)} on ${selectedDate}!`)
      setCalendarUrl(buildCalendarUrl(selectedDate, start, end, selectedPremise.name))
      setTimeout(() => { setSuccess(''); setCalendarUrl('') }, 10000)
    }
  }

  async function cancelBooking(bookingId: string) {
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', bookingId)
  }

  const isHalfday = selectedPremise?.booking_type === 'halfday'
  const isChallenge = selectedPremise?.booking_type === 'challenge'

  const halfdayPeriods = [
    { id: 'morning', label: 'Morning', time: '08:00–13:00' },
    { id: 'afternoon', label: 'Afternoon', time: '13:00–18:00' },
    { id: 'evening', label: 'Evening', time: '18:00–23:00' },
  ]

  return (
    <div className="two-col" style={{ maxWidth: '900px', margin: '0 auto' }}>

      {/* Left: Premises */}
      <div>
        <div className="section-title" style={{ marginBottom: '8px' }}>Select premise</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
          {premises.map(p => (
            <button
              key={p.id}
              onClick={() => { setSelectedPremise(p); setInviteOpen(false) }}
              className={selectedPremise?.id === p.id ? 'premise-row' : 'premise-row'}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: '12px',
                border: selectedPremise?.id === p.id ? '1.5px solid var(--pine)' : '1px solid var(--br)',
                background: selectedPremise?.id === p.id ? 'rgba(26,61,43,0.06)' : 'rgba(255,255,255,0.8)',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--tx)' }}>
                  {p.booking_type === 'challenge' && Object.keys(CHESS_LABELS).length > 0
                    ? 'Chess / Escacs'
                    : p.name
                  }
                </div>
                <div style={{ fontSize: '9px', color: 'var(--txl)', marginTop: '1px' }}>
                  {p.booking_type === 'slots' ? `${p.slot_duration_minutes}min slots · gap rule` :
                   p.booking_type === 'halfday' ? 'Morn / Afternoon / Evening' :
                   'Challenge · no court needed'}
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="warn-bar">
          <strong>Gap rule:</strong> min. 1 free slot between your own bookings on the same premise. Bookings sync to Google Calendar.
        </div>
      </div>

      {/* Right: Calendar + slots */}
      <div>
        {selectedPremise && (
          <>
            <div className="section-title" style={{ marginBottom: '8px' }}>
              {selectedPremise.name} — {MONTHS[currentMonth]} {currentYear}
            </div>

            {/* Calendar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '8px' }}>
              {DAYS.map(d => (
                <div key={d} style={{ textAlign: 'center', fontSize: '9px', color: 'var(--txl)', fontWeight: 500, paddingBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{d}</div>
              ))}
              {calDays.map((day, i) => {
                if (!day) return <div key={`e${i}`} />
                const status = getDateStatus(day)
                const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(dateStr)}
                    style={{
                      aspectRatio: '1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '6px',
                      fontSize: '11px',
                      cursor: 'pointer',
                      border: selectedDate === dateStr && status !== 'today' ? '2px solid var(--pine)' : '2px solid transparent',
                      fontWeight: status === 'today' || status === 'mine' ? 500 : 400,
                      background:
                        status === 'today' ? 'var(--pine)' :
                        status === 'mine' ? '#dcfce7' :
                        status === 'booked' ? '#fee2e2' :
                        'transparent',
                      color:
                        status === 'today' ? '#fff' :
                        status === 'mine' ? '#166534' :
                        status === 'booked' ? '#991b1b' :
                        'var(--txm)',
                    }}
                  >
                    {day}
                  </button>
                )
              })}
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', fontSize: '9px', color: 'var(--txl)' }}>
              {[
                { color: '#dcfce7', label: 'Mine' },
                { color: '#fee2e2', label: 'Taken' },
                { color: 'var(--pine)', label: 'Today' },
                { color: '#dbeafe', label: 'Invite open' },
              ].map(l => (
                <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '2px', background: l.color }} />
                  {l.label}
                </span>
              ))}
            </div>

            {/* Slots */}
            {!isHalfday && !isChallenge && (
              <>
                <div className="section-title" style={{ marginBottom: '6px' }}>
                  Slots — {selectedDate}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {slots.map(slot => {
                    const status = getSlotStatus(slot.start, slot.end)
                    const booking = dayBookings.find(b => b.slot_start === slot.start)
                    return (
                      <div key={slot.start} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '9px', color: 'var(--txl)', fontWeight: 500, width: '64px', flexShrink: 0 }}>
                          {formatTime(slot.start)}–{formatTime(slot.end)}
                        </span>
                        <button
                          onClick={() => status === 'free' && bookSlot(slot.start, slot.end)}
                          disabled={saving || status !== 'free'}
                          style={{
                            flex: 1,
                            height: '28px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            paddingLeft: '8px',
                            fontSize: '11px',
                            fontWeight: 500,
                            border: 'none',
                            cursor: status === 'free' ? 'pointer' : 'default',
                            fontStyle: status === 'gap' ? 'italic' : 'normal',
                            background:
                              status === 'free' ? '#dcfce7' :
                              status === 'mine' ? 'rgba(26,61,43,0.1)' :
                              status === 'invite' ? '#dbeafe' :
                              status === 'taken' ? '#fee2e2' :
                              status === 'gap' ? 'var(--sand-d)' :
                              'transparent',
                            color:
                              status === 'free' ? '#166534' :
                              status === 'mine' ? 'var(--pine)' :
                              status === 'invite' ? '#1e40af' :
                              status === 'taken' ? '#991b1b' :
                              'var(--txl)',
                          }}
                        >
                          {status === 'free' ? 'Tap to book' :
                           status === 'mine' ? 'Your booking' :
                           status === 'taken' ? `@${booking?.apt_number} booked` :
                           status === 'invite' ? `@${booking?.apt_number} open invite` :
                           'Gap (rule)'}
                        </button>
                        {status === 'mine' && (
                          <button
                            onClick={() => booking && cancelBooking(booking.id)}
                            style={{ fontSize: '10px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {/* Halfday */}
            {isHalfday && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                {halfdayPeriods.map(period => {
                  const taken = dayBookings.find(b => b.halfday_period === period.id)
                  return (
                    <button
                      key={period.id}
                      onClick={() => !taken && bookHalfday(period.id)}
                      disabled={!!taken || saving}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        border: taken ? '1px solid #fecaca' : '1px solid #bbf7d0',
                        background: taken ? '#fef2f2' : '#f0fdf4',
                        color: taken ? '#b91c1c' : '#15803d',
                        cursor: taken ? 'default' : 'pointer',
                        fontSize: '13px',
                      }}
                    >
                      <span style={{ fontWeight: 500 }}>{period.label}</span>
                      <span style={{ fontSize: '11px', opacity: 0.7 }}>{period.time}</span>
                      <span style={{ fontSize: '11px' }}>{taken ? `@${taken.apt_number}` : 'Available'}</span>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Chess challenge */}
            {isChallenge && (
              <div className="card" style={{ marginTop: '8px' }}>
                <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--tx)', marginBottom: '12px' }}>Chess challenge</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input
                    placeholder="Challenge @apt# (e.g. 3B) or leave blank for open"
                    className="form-input"
                  />
                  <input
                    placeholder="Suggested time (e.g. Sunday 11:00)"
                    className="form-input"
                  />
                  <input
                    placeholder="Location (e.g. BBQ table, common room)"
                    className="form-input"
                  />
                  <button className="btn btn-primary" style={{ width: '100%' }}>
                    Post challenge
                  </button>
                </div>
              </div>
            )}

            {/* Invite toggle */}
            {!isChallenge && selectedPremise.max_invite_slots && (
              <div className="card" style={{ marginTop: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={inviteOpen}
                    onChange={e => setInviteOpen(e.target.checked)}
                    style={{ width: '14px', height: '14px', borderRadius: '4px', accentColor: 'var(--pine)' }}
                  />
                  <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--tx)' }}>Open this booking to neighbours</span>
                </label>
                {inviteOpen && (
                  <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--txm)' }}>
                      {selectedPremise.name} — max {selectedPremise.max_invite_slots} neighbour spots
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                      <div style={{
                        width: '28px', height: '28px', borderRadius: '8px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '11px', fontWeight: 600, color: '#fff',
                        background: 'var(--pine)',
                      }}>
                        {profile.apt_number.slice(0,2)}
                      </div>
                      {Array.from({ length: selectedPremise.max_invite_slots }).map((_, i) => (
                        <div key={i} style={{
                          width: '28px', height: '28px', borderRadius: '8px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '11px', fontWeight: 500,
                          background: '#dbeafe', color: '#1e40af',
                          border: '1px solid transparent',
                        }}>
                          +1
                        </div>
                      ))}
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--txl)' }}>First come, first served. No confirmation needed.</p>
                    <div>
                      <label className="form-label">Notify</label>
                      <select
                        value={inviteScope}
                        onChange={e => setInviteScope(e.target.value as any)}
                        className="form-select"
                      >
                        <option value="interest">All residents with matching interest</option>
                        <option value="apt">Specific @apt# (private — no feed post)</option>
                        <option value="all">@tots — everyone</option>
                      </select>
                    </div>
                    {inviteScope === 'apt' && (
                      <input
                        value={inviteTargetApt}
                        onChange={e => setInviteTargetApt(e.target.value.toUpperCase())}
                        placeholder="Apartment number e.g. 3B"
                        className="form-input"
                      />
                    )}
                  </div>
                )}
              </div>
            )}

            {success && (
              <div style={{
                marginTop: '12px',
                background: '#f0fdf4',
                color: '#166534',
                border: '1px solid #bbf7d0',
                borderRadius: '12px',
                padding: '12px',
                fontSize: '12px',
                textAlign: 'center',
              }}>
                <div style={{ marginBottom: calendarUrl ? '10px' : 0 }}>✓ {success}</div>
                {calendarUrl && (
                  <a
                    href={calendarUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      padding: '6px 14px', borderRadius: '8px',
                      background: '#fff', border: '1px solid #bbf7d0',
                      color: '#166534', fontSize: '11px', fontWeight: 500,
                      textDecoration: 'none',
                    }}
                  >
                    📅 Add to Google Calendar
                  </a>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )

  async function bookHalfday(period: string) {
    if (!selectedPremise) return
    setSaving(true)
    await supabase.from('bookings').insert({
      community_id: profile.community_id,
      premise_id: selectedPremise.id,
      profile_id: profile.id,
      apt_number: profile.apt_number,
      date: selectedDate,
      halfday_period: period,
      status: 'confirmed',
      invite_open: false,
      invite_scope: 'none',
    })
    setSaving(false)
    const timeMap: Record<string, { start: string; end: string }> = {
      morning:   { start: '08:00', end: '13:00' },
      afternoon: { start: '13:00', end: '18:00' },
      evening:   { start: '18:00', end: '23:00' },
    }
    const t = timeMap[period] || { start: '08:00', end: '13:00' }
    setSuccess(`Booked ${period} on ${selectedDate}!`)
    setCalendarUrl(buildCalendarUrl(selectedDate, t.start, t.end, selectedPremise.name))
    setTimeout(() => { setSuccess(''); setCalendarUrl('') }, 10000)
  }
}
