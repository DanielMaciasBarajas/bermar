'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { INTERESTS } from '@/lib/utils'

type Step = 1 | 2 | 3 | 4 | 5

interface Occupant {
  name: string
  gender: 'M' | 'F' | '—'
  age: string
  birthday_day: string
  birthday_month: string
}

interface ApartmentOption {
  id: string
  apt_number: string
  floor: number
  door: string
  is_duplex: boolean
  duplex_upper_number: string | null
  taken: boolean
}

export default function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [apartments, setApartments] = useState<ApartmentOption[]>([])
  const [loadingApts, setLoadingApts] = useState(true)

  const [aptNumber, setAptNumber] = useState('')
  const [selectedApt, setSelectedApt] = useState<ApartmentOption | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [isDuplex, setIsDuplex] = useState(false)
  const [upperNumber, setUpperNumber] = useState('')

  const [occupants, setOccupants] = useState<Occupant[]>([
    { name: '', gender: 'M', age: '', birthday_day: '', birthday_month: '' }
  ])
  const [selectedInterests, setSelectedInterests] = useState<string[]>([])

  const [privacy, setPrivacy] = useState({
    show_names: true,
    show_ages: false,
    show_interests: true,
    show_phone: false,
    show_in_directory: true,
    birthday_wishes: true,
    email_notifications: true,
    google_calendar_sync: true,
    google_signin_enabled: true,
  })

  useEffect(() => {
    async function loadApartments() {
      setLoadingApts(true)
      const { data: community } = await supabase
        .from('communities')
        .select('id')
        .eq('slug', process.env.NEXT_PUBLIC_COMMUNITY_SLUG || 'bermar')
        .single()

      if (!community) { setLoadingApts(false); return }

      const { data: apts } = await supabase
        .from('apartments')
        .select('*')
        .eq('community_id', community.id)
        .order('floor')
        .order('door')

      const { data: profiles } = await supabase
        .from('profiles')
        .select('apt_number')
        .eq('community_id', community.id)

      const takenApts = new Set((profiles || []).map((p: any) => p.apt_number))

      const filtered = (apts || [])
        .filter((a: any) => a.floor !== 9)
        .map((a: any) => ({
          ...a,
          taken: takenApts.has(a.apt_number) || (a.duplex_upper_number && takenApts.has(a.duplex_upper_number)),
        }))

      setApartments(filtered)
      setLoadingApts(false)
    }
    loadApartments()
  }, [])

  function selectApartment(apt: ApartmentOption) {
    setSelectedApt(apt)
    setAptNumber(apt.apt_number)
    setIsDuplex(apt.is_duplex)
    setUpperNumber(apt.duplex_upper_number || '')
  }

  function next() { setError(''); setStep(s => (s + 1) as Step) }

  async function handleStep1() {
    if (!selectedApt) { setError('Please select your apartment'); return }
    setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    setLoading(false)
    next()
  }

  function addOccupant() {
    setOccupants(o => [...o, { name: '', gender: 'M', age: '', birthday_day: '', birthday_month: '' }])
  }

  function removeOccupant(i: number) {
    setOccupants(o => o.filter((_, idx) => idx !== i))
  }

  function updateOccupant(i: number, field: keyof Occupant, value: string) {
    setOccupants(o => o.map((oc, idx) => idx === i ? { ...oc, [field]: value } : oc))
  }

  function toggleInterest(interest: string) {
    setSelectedInterests(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    )
  }

  async function handleFinish() {
    setLoading(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Session expired. Please try again.'); setLoading(false); return }

    const { data: community } = await supabase
      .from('communities').select('id')
      .eq('slug', process.env.NEXT_PUBLIC_COMMUNITY_SLUG || 'bermar')
      .single()

    if (!community) { setError('Community not found.'); setLoading(false); return }

    const { error: profileError } = await supabase.from('profiles').upsert({
      id: user.id,
      community_id: community.id,
      apartment_id: selectedApt?.id || null,
      apt_number: aptNumber.toUpperCase(),
      username: `@${aptNumber.toLowerCase()}`,
      ...privacy,
    })

    if (profileError) { setError(profileError.message); setLoading(false); return }

    const validOccupants = occupants.filter(o => o.name.trim())
    if (validOccupants.length > 0) {
      await supabase.from('occupants').insert(
        validOccupants.map((o, i) => ({
          profile_id: user.id,
          name: o.name.trim(),
          gender: o.gender,
          age: o.age ? parseInt(o.age) : null,
          birthday_day: o.birthday_day ? parseInt(o.birthday_day) : null,
          birthday_month: o.birthday_month ? parseInt(o.birthday_month) : null,
          is_primary: i === 0,
        }))
      )
    }

    if (selectedInterests.length > 0) {
      await supabase.from('interests').insert(
        selectedInterests.map(interest => ({ profile_id: user.id, interest }))
      )
    }

    setLoading(false)
    next()
  }

  const floors = [...new Set(apartments.map(a => a.floor))].sort((a, b) => a - b)

  const chipBase: React.CSSProperties = {
    padding: '4px 10px', borderRadius: '999px', fontSize: '11px',
    border: '1px solid', cursor: 'pointer', transition: 'all 0.15s',
  }

  return (
    <div className="auth-page">
      <div style={{ width: '100%', maxWidth: '360px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '40px', height: '40px', borderRadius: '12px', background: 'var(--pine)', marginBottom: '12px',
          }}>
            <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
              <path d="M16 4L19 11L22 8L20 14L24 12L21 17L25 16L22 20L26 19L22 23L10 23L6 19L10 20L7 16L11 17L8 12L12 14L10 8L13 11Z" fill="#4ade80"/>
              <path d="M8 24Q16 20 24 24" stroke="#93c5fd" strokeWidth="1.5" fill="none"/>
            </svg>
          </div>
          <h1 style={{ fontSize: '20px', color: 'var(--pine)', fontFamily: 'DM Serif Display, serif' }}>Bermar</h1>
        </div>

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '24px' }}>
          {[1,2,3,4,5].map(s => (
            <div key={s} style={{
              flex: 1, height: '4px', borderRadius: '999px', transition: 'background 0.2s',
              background: s <= step ? 'var(--pine)' : 'var(--sand-d)',
            }} />
          ))}
        </div>

        {/* Card */}
        <div className="auth-card">

          {/* STEP 1 — account */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h2 style={{ fontSize: '18px', color: 'var(--tx)', marginBottom: '4px' }}>Welcome to Bermar</h2>
                <p style={{ fontSize: '11px', color: 'var(--txm)' }}>Select your apartment to get started.</p>
              </div>
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '8px 12px', fontSize: '11px', color: '#1e40af' }}>
                Registration uses this form. Once registered, you can use Google to sign in next time.
              </div>
              <div>
                <label className="form-label">Your apartment <span style={{ color: '#ef4444' }}>*</span></label>
                {loadingApts ? (
                  <div className="form-input" style={{ color: 'var(--txl)' }}>Loading apartments...</div>
                ) : (
                  <select
                    required
                    value={aptNumber}
                    onChange={e => { const apt = apartments.find(a => a.apt_number === e.target.value); if (apt) selectApartment(apt) }}
                    className="form-select"
                  >
                    <option value="">Select your apartment...</option>
                    {floors.map(floor => (
                      <optgroup key={floor} label={`Floor ${floor}`}>
                        {apartments.filter(a => a.floor === floor).map(apt => (
                          <option key={apt.id} value={apt.apt_number} disabled={apt.taken}>
                            {apt.apt_number}{apt.is_duplex ? ` / ${apt.duplex_upper_number} (duplex)` : ''}{apt.taken ? ' — already registered' : ''}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                )}
                {selectedApt?.is_duplex && (
                  <p style={{ fontSize: '11px', color: '#92400e', marginTop: '4px', background: '#fffbeb', padding: '6px 8px', borderRadius: '8px' }}>
                    Duplex — covers both {selectedApt.apt_number} and {selectedApt.duplex_upper_number}. One account for both doors.
                  </p>
                )}
              </div>
              <div>
                <label className="form-label">Email <span style={{ color: '#ef4444' }}>*</span></label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com" className="form-input" />
              </div>
              <div>
                <label className="form-label">Password <span style={{ color: '#ef4444' }}>*</span></label>
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="min. 8 characters" minLength={8} className="form-input" />
              </div>
              {error && (
                <p style={{ fontSize: '11px', color: '#dc2626', background: '#fef2f2', padding: '8px 12px', borderRadius: '8px' }}>{error}</p>
              )}
              <button
                onClick={handleStep1}
                disabled={loading || !selectedApt}
                className="btn btn-primary"
                style={{ width: '100%', opacity: loading || !selectedApt ? 0.6 : 1 }}
              >
                {loading ? 'Creating account...' : 'Continue →'}
              </button>
            </div>
          )}

          {/* STEP 2 — apartment confirm */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h2 style={{ fontSize: '18px', color: 'var(--tx)', marginBottom: '4px' }}>{isDuplex ? 'Duplex confirmed' : 'Single apartment'}</h2>
                <p style={{ fontSize: '11px', color: 'var(--txm)' }}>
                  {isDuplex ? `Both ${aptNumber} and ${upperNumber} are linked to your account.` : `Apartment ${aptNumber} — single floor.`}
                </p>
              </div>
              {isDuplex ? (
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#92400e', marginBottom: '4px' }}>{aptNumber} + {upperNumber}</div>
                  <div style={{ fontSize: '11px', color: '#a16207' }}>Duplex — one login, both door numbers linked.</div>
                </div>
              ) : (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#166534' }}>{aptNumber} — single floor apartment</div>
                </div>
              )}
              <button onClick={next} className="btn btn-primary" style={{ width: '100%' }}>Continue →</button>
            </div>
          )}

          {/* STEP 3 — occupants & interests */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h2 style={{ fontSize: '18px', color: 'var(--tx)', marginBottom: '4px' }}>Who lives here?</h2>
                <p style={{ fontSize: '11px', color: 'var(--txm)' }}>Community census — all optional.</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {occupants.map((occ, i) => (
                  <div key={i} style={{ background: 'var(--sand)', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--tx)' }}>{i === 0 ? 'Primary resident' : `Occupant ${i + 1}`}</span>
                      {i > 0 && (
                        <button onClick={() => removeOccupant(i)} style={{ fontSize: '11px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>Remove</button>
                      )}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '6px' }}>
                      <input value={occ.name} onChange={e => updateOccupant(i, 'name', e.target.value)}
                        placeholder="Name" className="form-input" style={{ gridColumn: 'span 2' }} />
                      <select value={occ.gender} onChange={e => updateOccupant(i, 'gender', e.target.value)} className="form-select" style={{ width: 'auto' }}>
                        <option>M</option><option>F</option><option>—</option>
                      </select>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                      <input value={occ.age} onChange={e => updateOccupant(i, 'age', e.target.value)}
                        placeholder="Age" type="number" min="0" max="120" className="form-input" />
                      <input value={occ.birthday_day} onChange={e => updateOccupant(i, 'birthday_day', e.target.value)}
                        placeholder="Day" type="number" min="1" max="31" className="form-input" />
                      <input value={occ.birthday_month} onChange={e => updateOccupant(i, 'birthday_month', e.target.value)}
                        placeholder="Month" type="number" min="1" max="12" className="form-input" />
                    </div>
                    <p style={{ fontSize: '10px', color: 'var(--txl)' }}>Age · Birthday day / month (no year needed)</p>
                  </div>
                ))}
                <button
                  onClick={addOccupant}
                  style={{ width: '100%', padding: '8px', border: '1px dashed var(--br)', borderRadius: '12px', fontSize: '11px', color: 'var(--txm)', background: 'transparent', cursor: 'pointer' }}
                >
                  + Add another person
                </button>
              </div>

              <div>
                <label className="form-label" style={{ marginBottom: '8px' }}>Interests</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {INTERESTS.map(interest => (
                    <button
                      key={interest}
                      onClick={() => toggleInterest(interest)}
                      style={{
                        ...chipBase,
                        background: selectedInterests.includes(interest) ? 'var(--pine)' : 'transparent',
                        color: selectedInterests.includes(interest) ? '#fff' : 'var(--txm)',
                        borderColor: selectedInterests.includes(interest) ? 'var(--pine)' : 'var(--br)',
                      }}
                    >
                      {interest}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={next} className="btn btn-primary" style={{ width: '100%' }}>Continue →</button>
            </div>
          )}

          {/* STEP 4 — privacy */}
          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h2 style={{ fontSize: '18px', color: 'var(--tx)', marginBottom: '4px' }}>Privacy settings</h2>
                <p style={{ fontSize: '11px', color: 'var(--txm)' }}>Apartment number, username, and avatar are always visible.</p>
              </div>
              <div>
                {[
                  { key: 'show_names', label: 'Show first names of occupants' },
                  { key: 'show_ages', label: 'Show ages' },
                  { key: 'show_interests', label: 'Show interests' },
                  { key: 'show_phone', label: 'Show phone number to neighbours' },
                  { key: 'show_in_directory', label: 'Appear in building directory' },
                  { key: 'birthday_wishes', label: 'Birthday community wishes (opt-out to disable)' },
                  { key: 'email_notifications', label: 'Email notifications' },
                  { key: 'google_calendar_sync', label: 'Sync bookings to Google Calendar' },
                  { key: 'google_signin_enabled', label: 'Enable Google sign-in for future logins' },
                ].map(({ key, label }) => (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', cursor: 'pointer', borderBottom: '1px solid var(--br)' }}>
                    <input
                      type="checkbox"
                      checked={privacy[key as keyof typeof privacy]}
                      onChange={e => setPrivacy(p => ({ ...p, [key]: e.target.checked }))}
                      style={{ width: '14px', height: '14px', accentColor: 'var(--pine)', flexShrink: 0 }}
                    />
                    <span style={{ fontSize: '12px', color: 'var(--tx)' }}>{label}</span>
                  </label>
                ))}
              </div>
              {error && (
                <p style={{ fontSize: '11px', color: '#dc2626', background: '#fef2f2', padding: '8px 12px', borderRadius: '8px' }}>{error}</p>
              )}
              <button
                onClick={handleFinish}
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', opacity: loading ? 0.6 : 1 }}
              >
                {loading ? 'Saving...' : 'Finish & enter →'}
              </button>
            </div>
          )}

          {/* STEP 5 — success */}
          {step === 5 && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%', background: '#dcfce7',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
              }}>
                <svg width="28" height="28" fill="none" stroke="#16a34a" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 style={{ fontSize: '18px', color: 'var(--tx)', marginBottom: '8px' }}>You're in, Bermar.</h2>
              <p style={{ fontSize: '11px', color: 'var(--txm)', marginBottom: '4px' }}>Apt {aptNumber.toUpperCase()} · pending community verification</p>
              <p style={{ fontSize: '11px', color: 'var(--txl)', marginBottom: '24px' }}>
                You'll receive an email once approved — usually within 24h.<br/>Next time: email/password or Google.
              </p>
              <button onClick={() => router.push('/dashboard')} className="btn btn-primary" style={{ width: '100%' }}>
                Go to dashboard
              </button>
            </div>
          )}
        </div>

        {step === 1 && (
          <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--txm)', marginTop: '16px' }}>
            Already registered?{' '}
            <a href="/auth/login" style={{ color: 'var(--pine)', fontWeight: 500, textDecoration: 'none' }}>Sign in</a>
          </p>
        )}
      </div>
    </div>
  )
}
