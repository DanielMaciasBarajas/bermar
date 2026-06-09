'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CATEGORY_LABELS, formatDate } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import type { Profile } from '@/lib/supabase/types'

interface ProposalData {
  id: string; title: string; body: string; body_translations: any; category: string; status: string
  voting_closes_at: string | null; tagged_apts: string[]; tag_all: boolean; supports: number; against: number
  apt_number: string; created_at: string
  votes: { vote: string; profile_id: string }[]
  flags: { is_important: boolean; is_following: boolean; is_dismissed: boolean; last_read_at: string | null; profile_id: string }[]
  comment_count: { count: number }[]
}

const STATUS_TAG: Record<string, string> = { open: 'tag tag-green', voting: 'tag tag-amber', resolved: 'tag tag-gray', promoted: 'tag tag-blue' }
const CATEGORY_TAG: Record<string, string> = { social: 'tag tag-green', infrastructure: 'tag tag-blue', rules: 'tag tag-pine', complaint: 'tag tag-red', project: 'tag tag-amber', meeting: 'tag tag-gray', other: 'tag tag-gray' }

export default function ProposalsClient({ proposals, profile }: { proposals: ProposalData[]; profile: Profile & { preferred_lang?: string } }) {
  const lang = profile.preferred_lang || 'ES'
  const t = useTranslations('proposals')
  const tc = useTranslations('common')

  function getBody(p: ProposalData): string {
    if (p.body_translations && typeof p.body_translations === 'object') {
      return p.body_translations[lang] || p.body_translations['ES'] || p.body_translations['CA'] || p.body_translations['EN'] || Object.values(p.body_translations)[0] as string || p.body
    }
    return p.body
  }

  const supabase = createClient()
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [personalFilter, setPersonalFilter] = useState('all')
  const [showNewForm, setShowNewForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newBody, setNewBody] = useState('')
  const [newCategory, setNewCategory] = useState('infrastructure')
  const [saving, setSaving] = useState(false)

  const filtered = proposals.filter(p => {
    const myFlag = p.flags?.find(f => f.profile_id === profile.id)
    if (personalFilter === 'important' && !myFlag?.is_important) return false
    if (personalFilter === 'following' && !myFlag?.is_following) return false
    if (personalFilter === 'dismissed' && !myFlag?.is_dismissed) return false
    if (personalFilter === 'unread' && myFlag?.last_read_at) return false
    if (myFlag?.is_dismissed && personalFilter !== 'dismissed') return false
    if (categoryFilter !== 'all' && p.category !== categoryFilter) return false
    if (statusFilter !== 'all' && p.status !== statusFilter) return false
    return true
  })

  async function vote(proposalId: string, voteType: 'support' | 'against') {
    const existing = proposals.find(p => p.id === proposalId)?.votes?.find(v => v.profile_id === profile.id)
    if (existing) await supabase.from('proposal_votes').delete().eq('proposal_id', proposalId).eq('profile_id', profile.id)
    else await supabase.from('proposal_votes').upsert({ proposal_id: proposalId, profile_id: profile.id, vote: voteType })
  }

  async function setFlag(proposalId: string, field: 'is_important' | 'is_following' | 'is_dismissed', value: boolean) {
    await supabase.from('proposal_flags').upsert({ proposal_id: proposalId, profile_id: profile.id, [field]: value })
  }

  async function submitProposal(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    await supabase.from('proposals').insert({
      community_id: profile.community_id, profile_id: profile.id, apt_number: profile.apt_number,
      title: newTitle, body: newBody, category: newCategory as any, status: 'open', tagged_apts: [], tag_all: false,
    })
    setShowNewForm(false); setNewTitle(''); setNewBody(''); setSaving(false)
  }

  const chipBase: React.CSSProperties = { padding: '4px 10px', borderRadius: '999px', fontSize: '11px', border: '1px solid', cursor: 'pointer', transition: 'all 0.15s' }

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto' }}>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="form-select" style={{ width: 'auto' }}>
          <option value="all">{t('all_categories')}</option>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="form-select" style={{ width: 'auto' }}>
          <option value="all">{t('all_statuses')}</option>
          <option value="open">Open</option>
          <option value="voting">Voting active</option>
          <option value="resolved">Resolved</option>
        </select>
        <button onClick={() => setShowNewForm(true)} className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }}>{t('new_proposal')}</button>
      </div>

      <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
        {[{ key: 'all', label: 'All' }, { key: 'unread', label: 'Unread' }, { key: 'important', label: '⭐ Important' }, { key: 'following', label: '🔖 Following' }, { key: 'dismissed', label: 'Dismissed' }].map(f => (
          <button key={f.key} onClick={() => setPersonalFilter(f.key)} style={{ ...chipBase, background: personalFilter === f.key ? 'var(--pine)' : '#fff', color: personalFilter === f.key ? '#fff' : 'var(--txm)', borderColor: personalFilter === f.key ? 'var(--pine)' : 'var(--br)' }}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="lang-nudge" style={{ marginBottom: '12px' }}>
        🌐 Post in as many languages as you can — neighbours read CA, ES, EN, FR, RU, DE, UK and more.
      </div>

      {showNewForm && (
        <div className="card" style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 500, color: 'var(--tx)', marginBottom: '12px' }}>New proposal</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <select value={newCategory} onChange={e => setNewCategory(e.target.value)} className="form-select">
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input required value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Title — clear and specific" className="form-input" />
            <textarea required value={newBody} onChange={e => setNewBody(e.target.value)} placeholder="Describe your proposal. Add translations: ES: ... · FR: ..." rows={4} className="form-textarea" />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={submitProposal} disabled={saving} className="btn btn-primary" style={{ opacity: saving ? 0.6 : 1 }}>
                {saving ? tc('saving') : 'Post proposal'}
              </button>
              <button onClick={() => setShowNewForm(false)} className="btn">{tc('cancel')}</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filtered.length === 0 && <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--txl)', fontSize: '13px' }}>No proposals match your filters.</div>}
        {filtered.map(p => {
          const myVote = p.votes?.find(v => v.profile_id === profile.id)
          const myFlag = p.flags?.find(f => f.profile_id === profile.id)
          const commentCount = p.comment_count?.[0]?.count || 0
          const closesIn = p.voting_closes_at ? Math.ceil((new Date(p.voting_closes_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null

          return (
            <div key={p.id} className="card">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                <span className={CATEGORY_TAG[p.category] || 'tag tag-gray'}>{CATEGORY_LABELS[p.category] || p.category}</span>
                <span className={STATUS_TAG[p.status] || 'tag tag-gray'}>{p.status === 'voting' ? 'Voting active' : p.status.charAt(0).toUpperCase() + p.status.slice(1)}</span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
                  <button onClick={() => setFlag(p.id, 'is_important', !myFlag?.is_important)} style={{ ...chipBase, padding: '2px 8px', background: myFlag?.is_important ? '#fee2e2' : 'transparent', color: myFlag?.is_important ? '#b91c1c' : 'var(--txl)', borderColor: myFlag?.is_important ? 'transparent' : 'var(--br)' }}>⭐</button>
                  <button onClick={() => setFlag(p.id, 'is_following', !myFlag?.is_following)} style={{ ...chipBase, padding: '2px 8px', background: myFlag?.is_following ? '#dbeafe' : 'transparent', color: myFlag?.is_following ? '#1e40af' : 'var(--txl)', borderColor: myFlag?.is_following ? 'transparent' : 'var(--br)' }}>🔖</button>
                  <button onClick={() => setFlag(p.id, 'is_dismissed', !myFlag?.is_dismissed)} style={{ ...chipBase, padding: '2px 8px', background: 'transparent', color: 'var(--txl)', borderColor: 'var(--br)' }}>🙈</button>
                </div>
              </div>
              <h3 style={{ fontSize: '13px', fontWeight: 500, color: 'var(--tx)', marginBottom: '4px' }}>{p.title}</h3>
              <div style={{ fontSize: '11px', color: 'var(--txm)', marginBottom: '6px' }}>
                By <strong>@{p.apt_number}</strong> · {formatDate(p.created_at)}
                {p.tagged_apts.length > 0 && <span> · tagged <strong>{p.tagged_apts.map(a => `@${a}`).join(' ')}</strong></span>}
                {p.tag_all && <span> · <strong>@tots</strong></span>}
              </div>
              <p style={{ fontSize: '11px', color: 'var(--txm)', lineHeight: 1.5, marginBottom: '12px', whiteSpace: 'pre-line' }}>{getBody(p)}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <button onClick={() => vote(p.id, 'support')} style={{ ...chipBase, background: myVote?.vote === 'support' ? '#dcfce7' : 'transparent', color: myVote?.vote === 'support' ? '#166534' : 'var(--txm)', borderColor: myVote?.vote === 'support' ? 'transparent' : 'var(--br)', fontWeight: myVote?.vote === 'support' ? 500 : 400, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  👍 {t('support')} ({p.supports})
                </button>
                <button onClick={() => vote(p.id, 'against')} style={{ ...chipBase, background: myVote?.vote === 'against' ? '#fee2e2' : 'transparent', color: myVote?.vote === 'against' ? '#991b1b' : 'var(--txm)', borderColor: myVote?.vote === 'against' ? 'transparent' : 'var(--br)', fontWeight: myVote?.vote === 'against' ? 500 : 400, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  👎 {t('against')} ({p.against})
                </button>
                <button style={{ ...chipBase, background: 'transparent', color: 'var(--txm)', borderColor: 'var(--br)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  💬 {t('comment')} ({commentCount})
                </button>
                {closesIn !== null && closesIn > 0 && (
                  <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--txl)' }}>
                    {t('closes_in', { days: closesIn })}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
