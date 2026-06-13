'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import type { Profile, MaintenanceTicket } from '@/lib/supabase/types'

interface CommunityInfo { moha_name: string; moha_schedule: string; moha_whatsapp: string; on_call_enabled: boolean; on_call_contact: any; liaison_email: string; admin_company_name: string }
interface Props { profile: Profile; community: CommunityInfo | null; myTickets: MaintenanceTicket[] }

const STATUS_TAG: Record<string, string> = { submitted: 'tag tag-blue', forwarded: 'tag tag-amber', in_progress: 'tag tag-amber', resolved: 'tag tag-green' }

export default function MaintenanceClient({ profile, community, myTickets }: Props) {
  const supabase = createClient()
  const t = useTranslations('maintenance')
  const tc = useTranslations('common')
  const tTC = useTranslations('ticket_categories')
  const tNav = useTranslations('nav')

  const mohaName = community?.moha_name || 'Moha'
  const mohaPhone = community?.moha_whatsapp || '699735022'

  const [category, setCategory] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [urgency, setUrgency] = useState('normal')
  const [insuranceFlag, setInsuranceFlag] = useState(false)
  const [saving, setSaving] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState('')

  function getCatLabel(key: string): string {
    try { return tTC(key as any) } catch { return key }
  }

  function getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      submitted: t('status_submitted'),
      forwarded: t('status_forwarded'),
      in_progress: t('status_in_progress'),
      resolved: t('status_resolved'),
    }
    return map[status] || status
  }

  const categoryKeys = ['common_areas', 'pool_garden', 'elevator', 'parking', 'structure', 'noise', 'insurance', 'internal', 'other']

  async function handleSubmit() {
    setSubmitError('')
    if (!category) { setSubmitError('Please select a category.'); return }
    if (!description.trim()) { setSubmitError('Please add a description.'); return }
    setSaving(true)
    const { data: ticket, error } = await supabase.from('maintenance_tickets').insert({
      community_id: profile.community_id, profile_id: profile.id, apt_number: profile.apt_number,
      category: category as any, location_description: location, description,
      urgency: urgency as any, insurance_flag: insuranceFlag, status: 'submitted',
    }).select().single()

    if (!error && ticket) {
      await fetch('/api/maintenance/notify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId: ticket.id }),
      })
    }

    setSaving(false)
    if (!error) {
      setSubmitted(true)
      setCategory(''); setLocation(''); setDescription(''); setUrgency('normal'); setInsuranceFlag(false)
    } else {
      setSubmitError('Error: ' + error.message)
    }
  }

  return (
    <div className="two-col" style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--tx)', marginBottom: '12px' }}>{tNav('maintenance')}</h2>

        <div className="warn-bar" style={{ marginBottom: '10px' }}>
          {t('routing_notice')}
        </div>

        {/* Auto-routing card */}
        <div className="card" style={{ marginBottom: '10px' }}>
          <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--tx)', marginBottom: '8px' }}>{t('auto_sent')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[
              { icon: '📱', color: '#16a34a', label: t('whatsapp_moha', { name: mohaName }), badge: t('badge_pool'), badgeClass: 'tag tag-green' },
              { icon: '📱', color: '#16a34a', label: t('whatsapp_liaison'), badge: t('badge_all'), badgeClass: 'tag tag-green' },
              { icon: '📧', color: '#2563eb', label: t('email_liaison'), badge: t('badge_all'), badgeClass: 'tag tag-blue' },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                <span style={{ color: row.color }}>{row.icon}</span>
                <span style={{ color: 'var(--tx)' }}>{row.label}</span>
                <span className={row.badgeClass} style={{ marginLeft: 'auto' }}>{row.badge}</span>
              </div>
            ))}
          </div>
        </div>

        {submitted && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '12px', marginBottom: '10px', fontSize: '11px', color: '#166534' }}>
            ✓ {t('success')}
          </div>
        )}

        {submitError && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '12px', marginBottom: '10px', fontSize: '11px', color: '#991b1b' }}>
            ⚠️ {submitError}
          </div>
        )}

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label className="form-label">{t('category')}</label>
            <select required value={category} onChange={e => setCategory(e.target.value)} className="form-select">
              <option value="">{t('select_category')}</option>
              {categoryKeys.map(k => (
                <option key={k} value={k}>
                  {getCatLabel(k)}{k === 'pool_garden' ? ` — ${t('moha_notified', { name: mohaName })}` : ''}
                </option>
              ))}
            </select>
          </div>

          {category === 'pool_garden' && community?.moha_schedule && (
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '8px', fontSize: '11px', color: '#1e40af' }}>
              {t('moha_schedule_note', { name: mohaName, schedule: community.moha_schedule })}
            </div>
          )}

          <div>
            <label className="form-label">{t('location')}</label>
            <input value={location} onChange={e => setLocation(e.target.value)} placeholder={t('location_placeholder')} className="form-input" />
          </div>

          <div>
            <label className="form-label">{t('description')} <span style={{ color: '#ef4444' }}>*</span></label>
            <textarea required value={description} onChange={e => setDescription(e.target.value)} placeholder={t('description_placeholder')} rows={3} className="form-textarea" />
          </div>

          <div>
            <label className="form-label">{t('urgency')}</label>
            <select value={urgency} onChange={e => setUrgency(e.target.value)} className="form-select">
              <option value="normal">{t('urgency_normal')}</option>
              <option value="urgent">{t('urgency_urgent')}</option>
              <option value="emergency">{t('urgency_emergency')}</option>
            </select>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input type="checkbox" checked={insuranceFlag} onChange={e => setInsuranceFlag(e.target.checked)} style={{ width: '14px', height: '14px', borderRadius: '4px', accentColor: 'var(--pine)' }} />
            <span style={{ fontSize: '12px', color: 'var(--tx)' }}>{t('insurance_flag')}</span>
          </label>

          <button onClick={handleSubmit} disabled={saving} className="btn btn-primary" style={{ width: '100%', opacity: saving ? 0.6 : 1 }}>
            {saving ? tc('saving') : t('submit')}
          </button>
        </div>
      </div>

      <div>
        {/* How it travels */}
        <div className="section-title" style={{ marginBottom: '8px' }}>{t('how_it_travels')}</div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
          {[
            { n: 1, label: t('step_you'),      bg: '#dbeafe', color: '#1e40af' },
            { n: 2, label: t('step_liaison'),  bg: '#fef3c7', color: '#92400e' },
            { n: 3, label: t('step_admin'),    bg: 'var(--sand-d)', color: 'var(--txm)' },
            { n: 4, label: t('step_resolved'), bg: '#dcfce7', color: '#166534' },
          ].map((step, i, arr) => (
            <div key={step.n} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600, background: step.bg, color: step.color }}>{step.n}</div>
                <div style={{ fontSize: '9px', color: 'var(--txl)', marginTop: '4px', textAlign: 'center' }}>{step.label}</div>
              </div>
              {i < arr.length - 1 && <div style={{ height: '1px', width: '20px', background: 'var(--br)', marginBottom: '16px' }} />}
            </div>
          ))}
        </div>

        {/* Moha card */}
        <div className="section-title" style={{ marginBottom: '8px' }}>{t('moha_section', { name: mohaName })}</div>
        <div className="card" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>🔧</div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--tx)' }}>{mohaName}</div>
              <div style={{ fontSize: '11px', color: 'var(--txm)' }}>{community?.moha_schedule || 'Mon–Fri 08:00–14:00'}</div>
            </div>
          </div>
          <div style={{ fontSize: '10px', color: 'var(--txl)', marginBottom: '10px' }}>{t('moha_not_oncall')}</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <a href={`tel:${mohaPhone}`}
              style={{ flex: 1, textAlign: 'center', padding: '7px', borderRadius: '8px', border: '1px solid var(--br)', fontSize: '11px', fontWeight: 500, color: 'var(--pine)', textDecoration: 'none', background: '#f0fdf4' }}>
              📞 {mohaPhone}
            </a>
            <a
              href={`https://wa.me/34${mohaPhone.replace(/\s/g, '')}?text=${encodeURIComponent('Hola Moha! Soy un vecino de Bermar Park (Gava Mar). Te escribo para comunicarte lo siguiente: ')}`}
              target="_blank" rel="noopener noreferrer"
              style={{ flex: 1, textAlign: 'center', padding: '7px', borderRadius: '8px', fontSize: '11px', fontWeight: 500, color: '#fff', background: '#25d366', textDecoration: 'none' }}>
              💬 WhatsApp
            </a>
          </div>
        </div>

        {/* My tickets */}
        <div className="section-title" style={{ marginBottom: '8px' }}>{t('my_tickets')}</div>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {myTickets.length === 0 && (
            <p style={{ fontSize: '11px', color: 'var(--txl)', textAlign: 'center', padding: '16px' }}>{t('no_tickets')}</p>
          )}
          {myTickets.map((ticket, i) => (
            <div key={ticket.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px', borderTop: i === 0 ? 'none' : '1px solid var(--br)' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--tx)' }}>{getCatLabel(ticket.category)}</div>
                <div style={{ fontSize: '11px', color: 'var(--txm)', marginTop: '2px' }}>{formatDate(ticket.created_at)}</div>
                {ticket.location_description && <div style={{ fontSize: '11px', color: 'var(--txl)' }}>{ticket.location_description}</div>}
              </div>
              <span className={STATUS_TAG[ticket.status] || 'tag tag-gray'} style={{ flexShrink: 0 }}>
                {getStatusLabel(ticket.status)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
