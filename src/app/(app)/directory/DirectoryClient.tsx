'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { Apartment, Profile, EmergencyContact } from '@/lib/supabase/types'

interface OccupantData { profile_id: string; name: string }
interface ProfileData { id: string; apt_number: string; username: string | null; avatar_url: string | null; show_in_directory: boolean; show_names: boolean }
interface Props { apartments: Apartment[]; profiles: ProfileData[]; occupants: OccupantData[]; emergencyContacts: EmergencyContact[]; currentProfile: Profile }

const DOORS = ['A','B','C','D','E','F','G','H','I','J']
const FLOORS = [9,8,7,6,5,4,3,2,1]

// Avatar component — shows photo if available, otherwise initials circle
function AptAvatar({ aptNumber, size = 28, profile }: { aptNumber: string; size?: number; profile?: ProfileData }) {
  if (profile?.avatar_url) {
    return (
      <img
        src={profile.avatar_url}
        alt={aptNumber}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
      />
    )
  }
  const initials = aptNumber.slice(0, 2).toUpperCase()
  const fontSize = size < 24 ? '6px' : size < 36 ? '10px' : '13px'
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--pine)', color: '#fff', fontWeight: 600, fontSize,
    }}>
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
    <div style={{ maxWidth: '960px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 200px', gap: '24px', alignItems: 'start' }}>
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--tx)', marginBottom: '2px' }}>{tNav('directory')}</h2>
        <div style={{ fontSize: '11px', color: 'var(--txm)', marginBottom: '4px' }}>{t('building')}</div>
        <div style={{ fontSize: '11px', color: 'var(--txl)', marginBottom: '12px' }}>
          {t('registered_count', { registered: registeredCount, total: totalApts })} · {t('hover_hint')}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: '380px' }}>
            {/* Door letters header */}
            <div style={{ display: 'grid', gridTemplateColumns: '28px repeat(10, 1fr)', gap: '3px', marginBottom: '4px' }}>
              <div />
              {DOORS.map(d => <div key={d} style={{ textAlign: 'center', fontSize: '9px', fontWeight: 500, color: 'var(--txl)' }}>{d}</div>)}
            </div>

            {FLOORS.map(floor => (
              <div key={floor} style={{ display: 'grid', gridTemplateColumns: '28px repeat(10, 1fr)', gap: '3px', marginBottom: '3px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '6px', fontSize: '9px', fontWeight: 500, color: 'var(--txl)' }}>{floor}</div>
                {DOORS.map(door => {
                  const { aptNumber, profile, isDuplex } = getCellInfo(floor, door)
                  const hasRegistration = !!profile
                  const isOptedOut = hasRegistration && !profile.show_in_directory
                  const isMe = currentProfile.apt_number === aptNumber

                  return (
                    <div key={door}
                      style={{
                        position: 'relative', borderRadius: '6px', padding: '3px 2px',
                        textAlign: 'center', cursor: 'pointer', aspectRatio: '1',
                        border: isMe ? '2px solid var(--pine)' : hasRegistration && !isOptedOut ? '1px solid rgba(26,61,43,0.2)' : '1px solid var(--br)',
                        background: hasRegistration && !isOptedOut ? 'rgba(26,61,43,0.08)' : 'var(--sand-d)',
                        transition: 'all 0.15s',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1px',
                      }}
                      onMouseEnter={() => setHoveredApt(aptNumber)}
                      onMouseLeave={() => setHoveredApt(null)}
                    >
                      {hasRegistration && !isOptedOut ? (
                        <>
                          <AptAvatar aptNumber={aptNumber} size={20} profile={profile} />
                          <div style={{ fontSize: '7px', fontWeight: 500, color: 'var(--pine)', lineHeight: 1 }}>
                            {aptNumber}{isDuplex ? '*' : ''}
                          </div>
                        </>
                      ) : isOptedOut ? (
                        <>
                          <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--sand-d)', border: '1px solid var(--br)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', color: 'var(--txl)' }}>—</div>
                          <div style={{ fontSize: '7px', color: 'var(--txl)', lineHeight: 1 }}>{aptNumber}</div>
                        </>
                      ) : (
                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--br)' }} />
                      )}

                      {/* Hover tooltip — flips upward for bottom floors */}
                      {hoveredApt === aptNumber && hasRegistration && !isOptedOut && (
                        <div style={{
                          position: 'absolute', zIndex: 20, left: '100%', marginLeft: '4px',
                          ...(floor <= 3 ? { bottom: 0 } : { top: 0 }),
                          background: '#fff', borderRadius: '10px', border: '1px solid var(--br)',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)', padding: '10px 12px',
                          minWidth: '128px', textAlign: 'left',
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
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '10px', color: 'var(--txl)', flexWrap: 'wrap' }}>
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
          <span style={{ color: 'var(--txm)' }}>* {t('legend_duplex')}</span>
        </div>
      </div>

      {/* Right column */}
      <div>
        <div className="section-title" style={{ marginBottom: '8px' }}>{t('emergency_contacts')}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
          {emergencyContacts.map(contact => (
            <div key={contact.id} className="emerg-card">
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', background: '#dbeafe' }}>
                {contact.name.includes('Moha') ? '🔧' : contact.name.includes('Liaison') ? '👤' : contact.name.includes('Admin') ? '🏢' : '🆘'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--tx)' }}>{contact.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--txm)' }}>{contact.available_hours}</div>
              </div>
          {contact.phone && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end', flexShrink: 0 }}>
                  <a href={`tel:${contact.phone}`} style={{ fontSize: '11px', fontWeight: 500, color: 'var(--pine)', textDecoration: 'none' }}>{contact.phone}</a>
                  {contact.name.includes('Moha') && (
                    <a
                      href={`https://wa.me/34${contact.phone.replace(/\s/g, '')}?text=${encodeURIComponent('Hola Moha! Soy un vecino de Bermar Park (Gavà Mar). Te escribo para comunicarte lo siguiente: ')}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: '10px', fontWeight: 500, color: '#fff', background: '#25d366', borderRadius: '999px', padding: '2px 8px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px' }}
                    >
                      <span>💬</span> WhatsApp
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
  )
}
