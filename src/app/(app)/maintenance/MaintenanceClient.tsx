'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TICKET_CATEGORY_LABELS, formatDate } from '@/lib/utils'
import type { Profile, MaintenanceTicket } from '@/lib/supabase/types'

interface CommunityInfo {
  moha_name: string
  moha_schedule: string
  moha_whatsapp: string
  on_call_enabled: boolean
  on_call_contact: any
  liaison_email: string
  admin_company_name: string
}

interface Props {
  profile: Profile
  community: CommunityInfo | null
  myTickets: MaintenanceTicket[]
}

const STATUS_TAG: Record<string, string> = {
  submitted: 'tag tag-blue',
  forwarded: 'tag tag-amber',
  in_progress: 'tag tag-amber',
  resolved: 'tag tag-green',
}

export default function MaintenanceClient({ profile, community, myTickets }: Props) {
  const supabase = createClient()
  const [category, setCategory] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [urgency, setUrgency] = useState('normal')
  const [insuranceFlag, setInsuranceFlag] = useState(false)
  const [saving, setSaving] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit() {
    setSaving(true)
    const { data: ticket, error } = await supabase.from('maintenance_tickets').insert({
      community_id: profile.community_id,
      profile_id: profile.id,
      apt_number: profile.apt_number,
      category: category as any,
      location_description: location,
      description,
      urgency: urgency as any,
      insurance_flag: insuranceFlag,
      status: 'submitted',
    }).select().single()

    if (!error && ticket) {
      await fetch('/api/maintenance/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId: ticket.id }),
      })
    }

    setSaving(false)
    if (!error) {
      setSubmitted(true)
      setCategory('')
      setLocation('')
      setDescription('')
      setUrgency('normal')
      setInsuranceFlag(false)
    }
  }

  return (
    <div className="two-col" style={{ maxWidth: '900px', margin: '0 auto' }}>

      {/* Left: Form */}
      <div>
        <div className="section-title" style={{ marginBottom: '8px' }}>Submit a maintenance ticket</div>

        <div className="warn-bar" style={{ marginBottom: '10px' }}>
          Routes to your community liaison → admin company. Not to SA.
          {' '}For issues inside your own apartment, try <strong>Neighbour advice</strong> in Marketplace first.
        </div>

        {/* Auto-routing info */}
        <div className="card" style={{ marginBottom: '10px' }}>
          <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--tx)', marginBottom: '8px' }}>Auto-sent on submit</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[
              { icon: '📱', color: '#16a34a', label: `WhatsApp to ${community?.moha_name || 'Moha'}`, badge: 'Pool/garden only', badgeClass: 'tag tag-green' },
              { icon: '📱', color: '#16a34a', label: 'WhatsApp to liaison', badge: 'All categories', badgeClass: 'tag tag-green' },
              { icon: '📧', color: '#2563eb', label: 'Email to liaison', badge: 'All categories', badgeClass: 'tag tag-blue' },
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
            ✓ Ticket submitted. WhatsApp and email sent to your liaison.
          </div>
        )}

        {/* Form */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label className="form-label">Category</label>
            <select
              required
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="form-select"
            >
              <option value="">Select...</option>
              {Object.entries(TICKET_CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}{k === 'pool_garden' ? ` — ${community?.moha_name || 'Moha'} notified` : ''}</option>
              ))}
            </select>
          </div>

          {category === 'pool_garden' && community?.moha_schedule && (
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '8px', fontSize: '11px', color: '#1e40af' }}>
              {community.moha_name || 'Moha'} works {community.moha_schedule}. Outside hours, contact the admin company emergency line.
            </div>
          )}

          <div>
            <label className="form-label">Location in building</label>
            <input
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="e.g. Pool pump room, 3rd floor corridor..."
              className="form-input"
            />
          </div>

          <div>
            <label className="form-label">Description <span style={{ color: '#ef4444' }}>*</span></label>
            <textarea
              required
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe clearly: what, where, when it started, how urgent."
              rows={3}
              className="form-textarea"
            />
          </div>

          <div>
            <label className="form-label">Urgency</label>
            <select value={urgency} onChange={e => setUrgency(e.target.value)} className="form-select">
              <option value="normal">Normal — response within 48h</option>
              <option value="urgent">Urgent — same day needed</option>
              <option value="emergency">Emergency — immediate</option>
            </select>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={insuranceFlag}
              onChange={e => setInsuranceFlag(e.target.checked)}
              style={{ width: '14px', height: '14px', borderRadius: '4px', accentColor: 'var(--pine)' }}
            />
            <span style={{ fontSize: '12px', color: 'var(--tx)' }}>This may require insurance coverage — flag for admin</span>
          </label>

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="btn btn-primary"
            style={{ width: '100%', opacity: saving ? 0.6 : 1 }}
          >
            {saving ? 'Submitting...' : 'Submit ticket →'}
          </button>
        </div>
      </div>

      {/* Right panel */}
      <div>
        {/* Routing flow */}
        <div className="section-title" style={{ marginBottom: '8px' }}>How your ticket travels</div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
          {[
            { n: 1, label: 'You submit', bg: '#dbeafe', color: '#1e40af' },
            { n: 2, label: 'Liaison',    bg: '#fef3c7', color: '#92400e' },
            { n: 3, label: 'Admin co.',  bg: 'var(--sand-d)', color: 'var(--txm)' },
            { n: 4, label: 'Resolved',   bg: '#dcfce7', color: '#166534' },
          ].map((step, i, arr) => (
            <div key={step.n} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px', fontWeight: 600,
                  background: step.bg, color: step.color,
                }}>
                  {step.n}
                </div>
                <div style={{ fontSize: '9px', color: 'var(--txl)', marginTop: '4px' }}>{step.label}</div>
              </div>
              {i < arr.length - 1 && (
                <div style={{ height: '1px', width: '24px', background: 'var(--br)', marginBottom: '16px' }} />
              )}
            </div>
          ))}
        </div>

        {/* Moha schedule */}
        <div className="section-title" style={{ marginBottom: '8px' }}>
          {community?.moha_name || 'Moha'} — maintenance
        </div>
        <div className="card" style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--tx)' }}>{community?.moha_name || 'Moha'}</div>
          <div style={{ fontSize: '11px', color: 'var(--txm)', marginTop: '4px' }}>{community?.moha_schedule || 'Mon–Fri 08:00–14:00'}</div>
          <div style={{ fontSize: '10px', color: 'var(--txl)', marginTop: '4px' }}>
            Not on-call. For emergencies outside hours, use admin company emergency line.
          </div>
        </div>

        {/* My tickets */}
        <div className="section-title" style={{ marginBottom: '8px' }}>My tickets</div>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {myTickets.length === 0 && (
            <p style={{ fontSize: '11px', color: 'var(--txl)', textAlign: 'center', padding: '16px' }}>
              No tickets submitted yet.
            </p>
          )}
          {myTickets.map((ticket, i) => (
            <div
              key={ticket.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '12px',
                borderTop: i === 0 ? 'none' : '1px solid var(--br)',
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--tx)' }}>
                  {TICKET_CATEGORY_LABELS[ticket.category] || ticket.category}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--txm)', marginTop: '2px' }}>
                  {formatDate(ticket.created_at)}
                </div>
                {ticket.location_description && (
                  <div style={{ fontSize: '11px', color: 'var(--txl)' }}>{ticket.location_description}</div>
                )}
              </div>
              <span className={STATUS_TAG[ticket.status] || 'tag tag-gray'} style={{ flexShrink: 0 }}>
                {ticket.status === 'in_progress' ? 'In progress' : ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
