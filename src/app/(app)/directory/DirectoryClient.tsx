'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { Apartment, Profile, EmergencyContact } from '@/lib/supabase/types'

interface OccupantData { profile_id: string; name: string }
interface ProfileData { id: string; apt_number: string; username: string | null; avatar_url: string | null; show_in_directory: boolean; show_names: boolean }
interface Props { apartments: Apartment[]; profiles: ProfileData[]; occupants: OccupantData[]; emergencyContacts: EmergencyContact[]; currentProfile: Profile }

const DOORS = ['A','B','C','D','E','F','G','H','I','J']
const FLOORS = [9,8,7,6,5,4,3,2,1]

export default function DirectoryClient({ apartments, profiles, occupants, emergencyContacts, currentProfile }: Props) {
  const [hoveredApt, setHoveredApt] = useState<string | null>(null)
  const t = useTranslations('directory')

  const profileByApt = new Map(profiles.map(p => [p.apt_number, p]))
  const occupantsByProfile = new Map<string, OccupantData[]>()
  occupants.forEach(o => {
    const list = occupantsByProfile.get(o.profile_id) || []
    list.push(o)
    occupantsByProfile.set(o.profile_id, list)
  })

  function getCellInfo(floor: number, door: string) {
    const aptNumber = `${floor}${door}`
    const profile = profileByApt.get(aptNumber)
    const isDuplex = floor === 8
    return { aptNumber, profile, isDuplex }
  }

  return (
    <div className="two-col" style={{ maxWidth: '900px', margin: '0 auto', gap: '24px' }}>
      <div>
        <div className="section-title" style={{ marginBottom: '4px' }}>Building directory — Bermar 6 & 8</div>
        <div style={{ fontSize: '11px', color: 'var(--txl)', marginBottom: '12px' }}>
          {profiles.length} of {apartments.length / 2} registered · Hover a cell to see occupants
        </div>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: '380px' }}>
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
                    <div key={door} style={{ position: 'relative', borderRadius: '6px', padding: '2px', textAlign: 'center', cursor: 'pointer', aspectRatio: '1', border: isMe ? '2px solid var(--pine)' : hasRegistration && !isOptedOut ? '1px solid rgba(26,61,43,0.2)' : '1px solid var(--br)', background: hasRegistration && !isOptedOut ? 'rgba(26,61,43,0.08)' : 'var(--sand-d)', transition: 'all 0.15s' }}
                      onMouseEnter={() => setHoveredApt(aptNumber)} onMouseLeave={() => setHoveredApt(null)}>
                      {hasRegistration && !isOptedOut ? (
                        <>
                          <div style={{ width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--pine)', color: '#fff', fontWeight: 600, fontSize: '6px', margin: '2px auto 0' }}>{aptNumber.slice(0,2)}</div>
                          <div style={{ fontSize: '7px', fontWeight: 500, color: 'var(--pine)', marginTop: '2px' }}>{aptNumber}{isDuplex ? '*' : ''}</div>
                        </>
                      ) : isOptedOut ? (
                        <>
                          <div style={{ width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--sand-d)', color: 'var(--txl)', fontSize: '8px', margin: '2px auto 0' }}>—</div>
                          <div style={{ fontSize: '7px', color: 'var(--txl)', textAlign: 'center' }}>{aptNumber}</div>
                        </>
                      ) : (
                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--br)', margin: '2px auto 0' }} />
                      )}
                      {hoveredApt === aptNumber && hasRegistration && !isOptedOut && (
                        <div style={{ position: 'absolute', zIndex: 20, left: '100%', marginLeft: '4px', top: 0, background: '#fff', borderRadius: '8px', border: '1px solid var(--br)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', padding: '8px', minWidth: '112px', textAlign: 'left', fontSize: '10px' }}>
                          <div style={{ fontWeight: 500, color: 'var(--tx)', marginBottom: '4px' }}>Apt {aptNumber}{isDuplex ? ` / 9${door}` : ''}</div>
                          {profile.show_names
                            ? occupantsByProfile.get(profile.id)?.map(o => <div key={o.profile_id + o.name} style={{ color: 'var(--txm)' }}>{o.name}</div>)
                            : <div style={{ color: 'var(--txl)', fontStyle: 'italic' }}>Opted out</div>}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '10px', color: 'var(--txl)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(26,61,43,0.12)', border: '1px solid rgba(26,61,43,0.2)' }} />Registered</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '3px', background: 'var(--sand-d)' }} />Unregistered</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '3px', background: 'var(--sand-d)', fontSize: '8px', color: 'var(--txl)', textAlign: 'center', lineHeight: '12px' }}>—</span>Opted out</span>
          <span style={{ color: 'var(--txm)' }}>* duplex</span>
        </div>
      </div>

      <div>
        <div className="section-title" style={{ marginBottom: '8px' }}>Emergency contacts</div>
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
                <a href={`tel:${contact.phone}`} style={{ fontSize: '11px', fontWeight: 500, color: 'var(--pine)', textDecoration: 'none', flexShrink: 0 }}>{contact.phone}</a>
              )}
            </div>
          ))}
          {emergencyContacts.length === 0 && (
            <div style={{ fontSize: '11px', color: 'var(--txl)', textAlign: 'center', padding: '16px 0' }}>Emergency contacts not yet configured. Admin will add them.</div>
          )}
        </div>

        <div className="section-title" style={{ marginBottom: '8px' }}>Your profile in directory</div>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600, color: '#fff', background: 'var(--pine)' }}>{currentProfile.apt_number}</div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--tx)' }}>Apt {currentProfile.apt_number}</div>
              <div style={{ fontSize: '11px', color: 'var(--txm)' }}>{currentProfile.show_in_directory ? 'Visible in directory' : 'Hidden from directory'}</div>
            </div>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--txl)' }}>To change your visibility, go to Settings → Privacy.</div>
        </div>
      </div>
    </div>
  )
}
