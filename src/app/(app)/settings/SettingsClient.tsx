'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { INTERESTS } from '@/lib/utils'

interface Props { profile: any; apartment: any; email: string }

export default function SettingsClient({ profile, apartment, email }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const t = useTranslations('settings')
  const tc = useTranslations('common')

  const [occupants] = useState<any[]>(profile?.occupants || [])
  const [selectedInterests, setSelectedInterests] = useState<string[]>((profile?.interests || []).map((i: any) => i.interest))
  const [privacy, setPrivacy] = useState({
    show_names: profile?.show_names ?? true, show_ages: profile?.show_ages ?? false,
    show_interests: profile?.show_interests ?? true, show_phone: profile?.show_phone ?? false,
    show_in_directory: profile?.show_in_directory ?? true, birthday_wishes: profile?.birthday_wishes ?? true,
    email_notifications: profile?.email_notifications ?? true, google_calendar_sync: profile?.google_calendar_sync ?? true,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleteInput, setDeleteInput] = useState('')
  const [deleting, setDeleting] = useState(false)

  const chipBase: React.CSSProperties = { padding: '4px 10px', borderRadius: '999px', fontSize: '11px', border: '1px solid', cursor: 'pointer', transition: 'all 0.15s' }

  function toggleInterest(interest: string) {
    setSelectedInterests(prev => prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest])
  }

  async function saveSettings() {
    setSaving(true)
    await supabase.from('profiles').update(privacy).eq('id', profile.id)
    await supabase.from('interests').delete().eq('profile_id', profile.id)
    if (selectedInterests.length > 0) await supabase.from('interests').insert(selectedInterests.map(interest => ({ profile_id: profile.id, interest })))
    setSaving(false)
    setSaved('Settings saved ✓')
    setTimeout(() => setSaved(''), 3000)
    router.refresh()
  }

  async function deleteAccount() {
    if (deleteInput !== profile.apt_number) return
    setDeleting(true)
    await supabase.from('booking_participants').delete().eq('profile_id', profile.id)
    await supabase.from('proposal_votes').delete().eq('profile_id', profile.id)
    await supabase.from('proposal_flags').delete().eq('profile_id', profile.id)
    await supabase.from('interests').delete().eq('profile_id', profile.id)
    await supabase.from('occupants').delete().eq('profile_id', profile.id)
    await supabase.from('bookings').delete().eq('profile_id', profile.id)
    await supabase.from('profiles').delete().eq('id', profile.id)
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '16px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 700, color: '#fff', background: 'var(--pine)' }}>
          {profile.apt_number}
        </div>
        <div>
          <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--tx)', fontFamily: 'DM Serif Display, serif' }}>
            Apt {profile.apt_number}{apartment?.is_duplex ? ` / ${apartment.duplex_upper_number} (duplex)` : ''}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--txm)' }}>{email}</div>
          <div style={{ fontSize: '11px', color: 'var(--txl)' }}>{profile.role} · {profile.approved ? 'Verified' : 'Pending verification'}</div>
        </div>
      </div>

      <div className="section-title" style={{ marginBottom: '8px' }}>{t('who_lives_here')}</div>
      <div className="card" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
          {occupants.map((occ, i) => (
            <div key={occ.id || i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 600, color: '#fff', background: 'var(--pine)' }}>{occ.name?.slice(0,1) || '?'}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--tx)' }}>{occ.name}</div>
                <div style={{ fontSize: '10px', color: 'var(--txl)' }}>{occ.gender}{occ.age ? ` · ${occ.age}y` : ''}{occ.birthday_day && occ.birthday_month ? ` · 🎂 ${occ.birthday_day}/${occ.birthday_month}` : ''}</div>
              </div>
              {i === 0 && <span style={{ fontSize: '9px', color: 'var(--txl)' }}>Primary</span>}
            </div>
          ))}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--txl)' }}>To update occupants, contact your community admin.</div>
      </div>

      <div className="section-title" style={{ marginBottom: '8px' }}>{t('interests')}</div>
      <div className="card" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {INTERESTS.map(interest => (
            <button key={interest} onClick={() => toggleInterest(interest)} style={{ ...chipBase, background: selectedInterests.includes(interest) ? 'var(--pine)' : 'transparent', color: selectedInterests.includes(interest) ? '#fff' : 'var(--txm)', borderColor: selectedInterests.includes(interest) ? 'var(--pine)' : 'var(--br)' }}>
              {interest}
            </button>
          ))}
        </div>
      </div>

      <div className="section-title" style={{ marginBottom: '8px' }}>{t('privacy')}</div>
      <div className="card" style={{ marginBottom: '16px' }}>
        {[
          { key: 'show_names', label: 'Show occupant names in directory' },
          { key: 'show_ages', label: 'Show ages' },
          { key: 'show_interests', label: 'Show interests' },
          { key: 'show_phone', label: 'Show phone to neighbours' },
          { key: 'show_in_directory', label: 'Appear in building directory' },
          { key: 'birthday_wishes', label: 'Birthday community wishes' },
          { key: 'email_notifications', label: 'Email notifications' },
          { key: 'google_calendar_sync', label: 'Sync bookings to Google Calendar' },
        ].map(({ key, label }, i) => (
          <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', cursor: 'pointer', borderTop: i === 0 ? 'none' : '1px solid var(--br)' }}>
            <input type="checkbox" checked={privacy[key as keyof typeof privacy]} onChange={e => setPrivacy(p => ({ ...p, [key]: e.target.checked }))} style={{ width: '14px', height: '14px', accentColor: 'var(--pine)', flexShrink: 0 }} />
            <span style={{ fontSize: '12px', color: 'var(--tx)' }}>{label}</span>
          </label>
        ))}
      </div>

      {saved && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '12px', marginBottom: '12px', fontSize: '12px', color: '#166534', textAlign: 'center' }}>{saved}</div>
      )}
      <button onClick={saveSettings} disabled={saving} className="btn btn-primary" style={{ width: '100%', marginBottom: '32px', opacity: saving ? 0.6 : 1 }}>
        {saving ? tc('saving') : t('save')}
      </button>

      <div className="section-title" style={{ marginBottom: '8px', color: '#dc2626' }}>{t('danger_zone')}</div>
      <div className="card" style={{ border: '1px solid #fecaca' }}>
        <div style={{ fontSize: '13px', fontWeight: 500, color: '#dc2626', marginBottom: '4px' }}>{t('delete_account')}</div>
        <div style={{ fontSize: '11px', color: 'var(--txm)', marginBottom: '12px', lineHeight: 1.5 }}>
          This permanently deletes all data associated with Apt {profile.apt_number} — bookings, votes, proposals, and your profile. The apartment remains in the building directory but will show as unregistered. This cannot be undone.
        </div>
        {!deleteConfirm ? (
          <button onClick={() => setDeleteConfirm(true)} style={{ padding: '8px 16px', borderRadius: '10px', fontSize: '12px', fontWeight: 500, background: 'transparent', border: '1px solid #fecaca', color: '#dc2626', cursor: 'pointer' }}>
            {t('delete_account')}
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '12px', color: 'var(--tx)' }}>Type your apartment number <strong>{profile.apt_number}</strong> to confirm:</div>
            <input value={deleteInput} onChange={e => setDeleteInput(e.target.value.toUpperCase())} placeholder={profile.apt_number} className="form-input" style={{ borderColor: '#fecaca' }} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={deleteAccount} disabled={deleteInput !== profile.apt_number || deleting} style={{ flex: 1, padding: '8px', borderRadius: '10px', fontSize: '12px', fontWeight: 500, background: deleteInput === profile.apt_number ? '#dc2626' : '#fecaca', color: '#fff', border: 'none', cursor: deleteInput === profile.apt_number ? 'pointer' : 'default', transition: 'background 0.15s' }}>
                {deleting ? 'Deleting...' : 'Permanently delete'}
              </button>
              <button onClick={() => { setDeleteConfirm(false); setDeleteInput('') }} className="btn btn-sm">{tc('cancel')}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
