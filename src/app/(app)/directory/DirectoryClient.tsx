'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { Apartment, Profile, EmergencyContact } from '@/lib/supabase/types'

interface OccupantData { profile_id: string; name: string }
interface ProfileData { id: string; apt_number: string; username: string | null; avatar_url: string | null; show_in_directory: boolean; show_names: boolean }
interface Props { apartments: Apartment[]; profiles: ProfileData[]; occupants: OccupantData[]; emergencyContacts: EmergencyContact[]; currentProfile: Profile }

const DOORS = ['A','B','C','D','E','F','G','H','I','J']
const FLOORS = [9,8,7,6,5,4,3,2,1]

function AptAvatar({ aptNumber, size = 36, profile }: { aptNumber: string; size?: number; profile?: ProfileData }) {
  if (profile?.avatar_url) {
    return <img src={profile.avatar_url} alt={aptNumber} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  }
  const initials = aptNumber.toUpperCase()
  const fontSize = size <= 28 ? '7px' : size <= 36 ? '9px' : '13px'
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--pine)', color: '#fff', fontWeight: 700, fontSize }}>
      {initials}
    </div>
  )
}

export default function DirectoryClient({ apartments, profiles, occupants, emergencyContacts, currentProfile }: Props) {
  const [hoveredApt, setHoveredApt] = useState<string | null>(null)
  const t = useTranslations('directory')
  const tNav = useTranslations('nav')

  const profileByApt = new Map(profiles.map(p => [p.apt_number, p]))
  const occupantsByProfile = new Map<string, OccupantData[]>()
  occupants.forEach(o => {
    const list = occupantsByProfile.get(o.profile_id) || []
    list.push(o)
    occupantsByProfile.set(o.profile_id, list)
  })

  const registeredCount = profiles.filter(p => p.show_in_directory).length
  const totalApts = apartments.length / 2

  function getCellInfo(floor: number, door: string) {
    const aptNumber = `${floor}${door}`
    const profile = profileByApt.get(aptNumber)
    const isDuplex = floor === 8
    return { aptNumber, profile, isDuplex }
  }

  return (
    <div style={{ maxWidth: '100%', margin: '0 auto' }}>

      {/* Title */}
      <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--tx)', marginBottom: '2px' }}>{tNav('directory')}</h2>
      <div style={{ fontSize: '11px', color: 'var(--txm)', marginBottom: '2px' }}>{t('building')}</div>
      <div style={{ fontSize: '11px', color: 'var(--txl)', marginBottom: '10px' }}>
        {t('registered_count', { registered: registeredCount, total: totalApts })} · {t('hover_hint')}
      </div>

      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* LEFT — building grid capped at 480px so cells stay compact */}
        <div style={{ flex: '1 1 320px', maxWidth: '480px' }}>
          {/* Door letters */}
          <div style={{ display: 'grid', gridTemplateColumns: '18px repeat(10, 1fr)', gap: '3px', marginBottom: '4px' }}>
            <div />
            {DOORS.map(d => <div key={d} style={{ textAlign: 'center', fontSize: '9px', fontWeight: 500, color: 'var(--txl)' }}>{d}</div>)}
          </div>

          {FLOORS.map(floor => (
            <div key={floor} style={{ display: 'grid', gridTemplateColumns: '18px repeat(10, 1fr)', gap: '3px', marginBottom: '3px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '3px', fontSize: '9px', fontWeight: 500, color: 'var(--txl)' }}>{floor}</div>
              {DOORS.map(door => {
                const { aptNumber, profile, isDuplex } = getCellInfo(floor, door)
                const hasRegistration = !!profile
                const isOptedOut = hasRegistration && !profile.show_in_directory
                const isMe = currentProfile.apt_number === aptNumber

                return (
                  <div key={door}
                    style={{
                      position: 'relative', borderRadius: '6px', aspectRatio: '1', cursor: 'pointer',
                      border: isMe ? '2px solid var(--pine)' : hasRegistration && !isOptedOut ? '1px solid rgba(26,61,43,0.25)' : '1px solid var(--br)',
                      background: hasRegistration && !isOptedOut ? 'rgba(26,61,43,0.08)' : 'var(--sand-d)',
                      transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'visible',
                    }}
                    onMouseEnter={() => setHoveredApt(aptNumber)}
                    onMouseLeave={() => setHoveredApt(null)}
                  >
                    {hasRegistration && !isOptedOut ? (
                      <>
                        <AptAvatar aptNumber={aptNumber} size={24} profile={profile} />
                        <div style={{ position: 'absolute', bottom: '1px', right: '2px', fontSize: '5px', fontWeight: 600, color: 'var(--pine)', lineHeight: 1, pointerEvents: 'none' }}>
                          {aptNumber}{isDuplex ? '*' : ''}
                        </div>
                      </>
                    ) : isOptedOut ? (
                      <>
                        <div style={{ fontSize: '9px', color: 'var(--txl)' }}>—</div>
                        <div style={{ position: 'absolute', bottom: '1px', right: '2px', fontSize: '5px', color: 'var(--txl)', lineHeight: 1 }}>{aptNumber}</div>
                      </>
                    ) : (
                      <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: 'var(--br)' }} />
                    )}

                    {/* Tooltip: flips up floors 1-3, flips left for column J */}
                    {hoveredApt === aptNumber && hasRegistration && !isOptedOut && (
                      <div style={{
                        position: 'absolute', zIndex: 30,
                        ...(door === 'J' ? { right: '105%' } : { left: '105%' }),
                        ...(floor <= 3 ? { bottom: 0 } : { top: 0 }),
                        background: '#fff', borderRadius: '10px', border: '1px solid var(--br)',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.12)', padding: '10px 12px',
                        minWidth: '130px', textAlign: 'left', pointerEvents: 'none',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <AptAvatar aptNumber={aptNumber} size={32} profile={profile} />
                          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--tx)' }}>
                            Apt {aptNumber}{isDuplex ? ` / 9${door}` : ''}
                          </div>
                        </div>
                        {profile.show_names
                          ? occupantsByProfile.get(profile.id)?.map(o => (
                              <div key={o.profile_id + o.name} style={{ fontSize: '11px', color: 'var(--txm)', lineHeight: 1.6 }}>{o.name}</div>
                            ))
                          : <div style={{ fontSize: '11px', color: 'var(--txl)', fontStyle: 'italic' }}>{t('opted_out')}</div>
                        }
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}

          {/* Legend */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '10px', fontSize: '10px', color: 'var(--txl)', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(26,61,43,0.12)', border: '1px solid rgba(26,61,43,0.2)' }} />
              {t('legend_registered')}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '3px', background: 'var(--sand-d)' }} />
              {t('legend_unregistered')}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '3px', background: 'var(--sand-d)', fontSize: '8px', color: 'var(--txl)', textAlign: 'center', lineHeight: '12px' }}>—</span>
              {t('legend_opted_out')}
            </span>
            <span>* {t('legend_duplex')}</span>
          </div>
        </div>

        {/* RIGHT — fixed 200px, wraps below on mobile */}
        <div style={{ flex: '0 0 200px', minWidth: '200px' }}>
          <div className="section-title" style={{ marginBottom: '8px' }}>{t('emergency_contacts')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
            {emergencyContacts.map(contact => (
              <div key={contact.id} style={{ background: '#fff', borderRadius: '12px', border: '1px solid var(--br)', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', background: '#dbeafe' }}>
                    {contact.name.includes('Moha') ? '🔧' : contact.name.includes('Liaison') ? '👤' : contact.name.includes('Admin') ? '🏢' : '🆘'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--tx)', lineHeight: 1.3 }}>{contact.name}</div>
                    <div style={{ fontSize: '10px', color: 'var(--txm)' }}>{contact.available_hours}</div>
                  </div>
                </div>
                {contact.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', flexWrap: 'wrap' }}>
                    <a href={`tel:${contact.phone}`} style={{ fontSize: '11px', fontWeight: 500, color: 'var(--pine)', textDecoration: 'none' }}>{contact.phone}</a>
                    {contact.name.includes('Moha') && (
                      <a
                        href={`https://wa.me/34${contact.phone.replace(/\s/g, '')}?text=${encodeURIComponent('Hola Moha! Soy un vecino de Bermar Park (Gava Mar). Te escribo para comunicarte lo siguiente: ')}`}
                        target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: '10px', fontWeight: 500, color: '#fff', background: '#25d366', borderRadius: '999px', padding: '2px 8px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                      >
                        💬 WhatsApp
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
            {emergencyContacts.length === 0 && (
              <div style={{ fontSize: '11px', color: 'var(--txl)', textAlign: 'center', padding: '16px 0' }}>{t('no_emergency')}</div>
            )}
          </div>

          <div className="section-title" style={{ marginBottom: '8px' }}>{t('your_profile')}</div>
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <AptAvatar aptNumber={currentProfile.apt_number} size={40} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--tx)' }}>Apt {currentProfile.apt_number}</div>
                <div style={{ fontSize: '11px', color: 'var(--txm)' }}>
                  {(currentProfile as any).show_in_directory ? t('visible') : t('hidden')}
                </div>
              </div>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--txl)' }}>{t('change_visibility')}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
