'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CATEGORY_LABELS, formatDate } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import type { Profile } from '@/lib/supabase/types'

interface Comment {
  id: string; proposal_id: string; profile_id: string; apt_number: string
  body: string; photo_url?: string | null; created_at: string
}
interface ProposalData {
  id: string; title: string; body: string; body_translations: any; category: string; status: string
  voting_closes_at: string | null; tagged_apts: string[]; tag_all: boolean; supports: number; against: number
  apt_number: string; created_at: string; photo_url?: string | null
  votes: { vote: string; profile_id: string }[]
  flags: { is_important: boolean; is_following: boolean; is_dismissed: boolean; last_read_at: string | null; profile_id: string }[]
  comments: Comment[]
}

const STATUS_TAG: Record<string, string> = { open: 'tag tag-green', voting: 'tag tag-amber', resolved: 'tag tag-gray', promoted: 'tag tag-blue', archived: 'tag tag-gray' }
const CATEGORY_TAG: Record<string, string> = { social: 'tag tag-green', infrastructure: 'tag tag-blue', rules: 'tag tag-pine', complaint: 'tag tag-red', project: 'tag tag-amber', meeting: 'tag tag-gray', other: 'tag tag-gray' }
type SortKey = 'newest' | 'oldest' | 'most_support' | 'apt'

export default function ProposalsClient({ proposals: initialProposals, profile }: { proposals: ProposalData[]; profile: Profile & { preferred_lang?: string } }) {
  const lang = profile.preferred_lang || 'ES'
  const locale = lang.toLowerCase()
  const t = useTranslations('proposals')
  const tc = useTranslations('common')
  const tCat = useTranslations('categories')

  function getCategoryLabel(key: string): string {
    try { return tCat(key as any) } catch { return key }
  }

  function getBody(p: ProposalData): string {
    if (p.body_translations && typeof p.body_translations === 'object') {
      return p.body_translations[lang] || p.body_translations['ES'] || p.body_translations['CA'] || p.body_translations['EN'] || Object.values(p.body_translations)[0] as string || p.body
    }
    return p.body
  }

  const supabase = createClient()

  // ── State ──────────────────────────────────────────────
  const [proposals, setProposals] = useState<ProposalData[]>(initialProposals)
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [personalFilter, setPersonalFilter] = useState('all')
  const [sortKey, setSortKey] = useState<SortKey>('newest')
  const [showNewForm, setShowNewForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newBody, setNewBody] = useState('')
  const [newCategory, setNewCategory] = useState('infrastructure')
  const [newPhoto, setNewPhoto] = useState<File | null>(null)
  const [newPhotoPreview, setNewPhotoPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [openComments, setOpenComments] = useState<string | null>(null)
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({})
  const [commentPhotos, setCommentPhotos] = useState<Record<string, File | null>>({})
  const [commentPhotoPreviews, setCommentPhotoPreviews] = useState<Record<string, string | null>>({})
  const [postingComment, setPostingComment] = useState(false)

  // ── Helpers ──────────────────────────────────────────────
  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      open: t('status_open'), voting: t('status_voting'), resolved: t('status_resolved'),
      archived: t('status_archived'), promoted: t('status_promoted'),
    }
    return map[status] || status
  }

  function pickCommentPhoto(proposalId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCommentPhotos(prev => ({ ...prev, [proposalId]: file }))
    setCommentPhotoPreviews(prev => ({ ...prev, [proposalId]: URL.createObjectURL(file) }))
  }

  function pickNewPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setNewPhoto(file)
    setNewPhotoPreview(URL.createObjectURL(file))
  }

  function clearNewPhoto() {
    setNewPhoto(null)
    setNewPhotoPreview(null)
  }

  // ── Filtered + sorted list ──────────────────────────────
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
  }).sort((a, b) => {
    if (sortKey === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    if (sortKey === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    if (sortKey === 'most_support') return b.supports - a.supports
    if (sortKey === 'apt') return a.apt_number.localeCompare(b.apt_number)
    return 0
  })

  // ── Actions ──────────────────────────────────────────────
  async function vote(proposalId: string, voteType: 'support' | 'against') {
    const proposal = proposals.find(p => p.id === proposalId)
    if (!proposal) return
    const existing = proposal.votes?.find(v => v.profile_id === profile.id)

    setProposals(prev => prev.map(p => {
      if (p.id !== proposalId) return p
      let newVotes = p.votes?.filter(v => v.profile_id !== profile.id) || []
      let newSupports = p.supports
      let newAgainst = p.against
      if (existing) {
        if (existing.vote === 'support') newSupports--
        else newAgainst--
      }
      if (!existing || existing.vote !== voteType) {
        newVotes = [...newVotes, { vote: voteType, profile_id: profile.id }]
        if (voteType === 'support') newSupports++
        else newAgainst++
      }
      return { ...p, votes: newVotes, supports: newSupports, against: newAgainst }
    }))

    if (existing) {
      if (existing.vote === voteType) {
        await supabase.from('proposal_votes').delete().eq('proposal_id', proposalId).eq('profile_id', profile.id)
      } else {
        await supabase.from('proposal_votes').update({ vote: voteType }).eq('proposal_id', proposalId).eq('profile_id', profile.id)
      }
    } else {
      await supabase.from('proposal_votes').upsert({ proposal_id: proposalId, profile_id: profile.id, vote: voteType })
    }
  }

  async function setFlag(proposalId: string, field: 'is_important' | 'is_following' | 'is_dismissed', value: boolean) {
    setProposals(prev => prev.map(p => {
      if (p.id !== proposalId) return p
      const existing = p.flags?.find(f => f.profile_id === profile.id)
      const base = { is_important: false, is_following: false, is_dismissed: false, last_read_at: null }
      const newFlag = { ...base, ...existing, profile_id: profile.id, [field]: value }
      const newFlags = [...(p.flags?.filter(f => f.profile_id !== profile.id) || []), newFlag]
      return { ...p, flags: newFlags }
    }))
    await supabase.from('proposal_flags').upsert({ proposal_id: proposalId, profile_id: profile.id, [field]: value })
  }

  async function postComment(proposalId: string) {
    const body = commentTexts[proposalId]?.trim()
    if (!body) return
    setPostingComment(true)
    let photo_url: string | null = null
    const photoFile = commentPhotos[proposalId]
    if (photoFile) {
      const ext = photoFile.name.split('.').pop()
      const path = profile.community_id + '/' + proposalId + '/' + Date.now() + '.' + ext
      const { error: uploadError } = await supabase.storage.from('proposals').upload(path, photoFile, { upsert: false, contentType: photoFile.type })
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('proposals').getPublicUrl(path)
        photo_url = urlData.publicUrl
      }
    }
    const { data: newComment } = await supabase.from('proposal_comments').insert({
      proposal_id: proposalId, profile_id: profile.id, apt_number: profile.apt_number, body, photo_url,
    }).select().single()
    if (newComment) {
      setProposals(prev => prev.map(p => p.id !== proposalId ? p : { ...p, comments: [...(p.comments || []), newComment] }))
      setCommentTexts(prev => ({ ...prev, [proposalId]: '' }))
      setCommentPhotos(prev => ({ ...prev, [proposalId]: null }))
      setCommentPhotoPreviews(prev => ({ ...prev, [proposalId]: null }))
    }
    setPostingComment(false)
  }

  async function deleteComment(proposalId: string, commentId: string) {
    await supabase.from('proposal_comments').delete().eq('id', commentId)
    setProposals(prev => prev.map(p => p.id !== proposalId ? p : { ...p, comments: p.comments?.filter(c => c.id !== commentId) || [] }))
  }

  const isAdmin = profile.role === 'admin' || profile.role === 'sa'

  async function changeStatus(proposalId: string, newStatus: string) {
    await supabase.from('proposals').update({ status: newStatus }).eq('id', proposalId)
    setProposals(prev => prev.map(p => p.id !== proposalId ? p : { ...p, status: newStatus }))
  }

  async function deleteProposal(proposalId: string) {
    if (!confirm(t('delete_proposal_confirm'))) return
    await supabase.from('proposals').delete().eq('id', proposalId)
    setProposals(prev => prev.filter(p => p.id !== proposalId))
  }

  async function submitProposal(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim() || !newBody.trim()) return
    setSaving(true)

    // Upload photo if provided
    let photo_url: string | null = null
    if (newPhoto) {
      const ext = newPhoto.name.split('.').pop()
      const path = profile.community_id + '/proposal-' + Date.now() + '.' + ext
      const { error: uploadError } = await supabase.storage.from('proposals').upload(path, newPhoto, { upsert: false, contentType: newPhoto.type })
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('proposals').getPublicUrl(path)
        photo_url = urlData.publicUrl
      }
    }

    const { data: newProposal } = await supabase.from('proposals').insert({
      community_id: profile.community_id, profile_id: profile.id, apt_number: profile.apt_number,
      title: newTitle, body: newBody, category: newCategory as any, status: 'open',
      tagged_apts: [], tag_all: false, photo_url,
    }).select().single()

    if (newProposal) setProposals(prev => [{ ...newProposal, votes: [], flags: [], comments: [] }, ...prev])
    setShowNewForm(false)
    setNewTitle('')
    setNewBody('')
    setNewPhoto(null)
    setNewPhotoPreview(null)
    setSaving(false)
  }

  // ── Styles ──────────────────────────────────────────────
  const chipBase: React.CSSProperties = { padding: '4px 10px', borderRadius: '999px', fontSize: '11px', border: '1px solid', cursor: 'pointer', transition: 'all 0.15s' }

  const personalFilters = [
    { key: 'all', label: t('all') },
    { key: 'unread', label: t('unread') },
    { key: 'important', label: t('important') },
    { key: 'following', label: t('following') },
    { key: 'dismissed', label: t('dismissed') },
  ]

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: 'newest', label: t('sort_newest') },
    { key: 'oldest', label: t('sort_oldest') },
    { key: 'most_support', label: t('sort_most_support') },
    { key: 'apt', label: t('sort_apt') },
  ]

  // ── Render ──────────────────────────────────────────────
  return (
    <div style={{ maxWidth: '720px', margin: '0 auto' }}>

      {/* Filters row */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="form-select" style={{ width: 'auto' }}>
          <option value="all">{t('all_categories')}</option>
          {Object.keys(CATEGORY_LABELS).map(k => <option key={k} value={k}>{getCategoryLabel(k)}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="form-select" style={{ width: 'auto' }}>
          <option value="all">{t('all_statuses')}</option>
          <option value="open">{t('status_open')}</option>
          <option value="voting">{t('status_voting')}</option>
          <option value="resolved">{t('status_resolved')}</option>
        </select>
        <select value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)} className="form-select" style={{ width: 'auto' }}>
          {sortOptions.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
        <button onClick={() => setShowNewForm(true)} className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }}>{t('new_proposal')}</button>
      </div>

      {/* Personal filter chips */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
        {personalFilters.map(f => (
          <button key={f.key} onClick={() => setPersonalFilter(f.key)} style={{ ...chipBase, background: personalFilter === f.key ? 'var(--pine)' : '#fff', color: personalFilter === f.key ? '#fff' : 'var(--txm)', borderColor: personalFilter === f.key ? 'var(--pine)' : 'var(--br)' }}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="lang-nudge" style={{ marginBottom: '12px' }}>{t('lang_nudge')}</div>

      {/* New proposal form */}
      {showNewForm && (
        <div className="card" style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 500, color: 'var(--tx)', marginBottom: '12px' }}>{t('new_proposal_title')}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <select value={newCategory} onChange={e => setNewCategory(e.target.value)} className="form-select">
              {Object.keys(CATEGORY_LABELS).map(k => <option key={k} value={k}>{getCategoryLabel(k)}</option>)}
            </select>
            <input required value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder={t('title_placeholder')} className="form-input" />
            <textarea required value={newBody} onChange={e => setNewBody(e.target.value)} placeholder={t('body_placeholder')} rows={4} className="form-textarea" />

            {/* Photo upload for new proposal */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label style={{ fontSize: '12px', color: 'var(--txm)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', border: '1px dashed var(--br)', borderRadius: '8px' }}>
                📷 {t('add_photo')}
                <input type="file" accept="image/*" onChange={pickNewPhoto} style={{ display: 'none' }} />
              </label>
              {newPhotoPreview && (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <img src={newPhotoPreview} alt="" style={{ width: '72px', height: '48px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--br)' }} />
                  <button
                    onClick={clearNewPhoto}
                    style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'var(--tx)', color: 'var(--bg)', border: 'none', borderRadius: '50%', width: '16px', height: '16px', fontSize: '9px', cursor: 'pointer', lineHeight: '16px', textAlign: 'center' }}>
                    x
                  </button>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={submitProposal} disabled={saving} className="btn btn-primary" style={{ opacity: saving ? 0.6 : 1 }}>
                {saving ? tc('saving') : t('post_proposal')}
              </button>
              <button onClick={() => { setShowNewForm(false); clearNewPhoto() }} className="btn">{tc('cancel')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Proposals list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--txl)', fontSize: '13px' }}>{t('no_proposals')}</div>
        )}
        {filtered.map(p => {
          const myVote = p.votes?.find(v => v.profile_id === profile.id)
          const myFlag = p.flags?.find(f => f.profile_id === profile.id)
          const comments = p.comments || []
          const closesIn = p.voting_closes_at ? Math.ceil((new Date(p.voting_closes_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null
          const isCommentsOpen = openComments === p.id
          const isOwner = p.apt_number === profile.apt_number

          return (
            <div key={p.id} className="card">

              {/* Tags + flag buttons */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                <span className={CATEGORY_TAG[p.category] || 'tag tag-gray'}>{getCategoryLabel(p.category)}</span>
                <span className={STATUS_TAG[p.status] || 'tag tag-gray'}>{statusLabel(p.status)}</span>
                {isAdmin && (
                  <select
                    value={p.status}
                    onChange={e => changeStatus(p.id, e.target.value)}
                    className="form-select"
                    style={{ fontSize: '11px', padding: '2px 6px', height: 'auto', width: 'auto' }}
                  >
                    <option value="open">{t('status_open')}</option>
                    <option value="voting">{t('status_voting')}</option>
                    <option value="resolved">{t('status_resolved')}</option>
                    <option value="promoted">{t('status_promoted')}</option>
                    <option value="archived">{t('status_archived')}</option>
                  </select>
                )}
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
                  <button
                    title={t('important')}
                    onClick={() => setFlag(p.id, 'is_important', !myFlag?.is_important)}
                    style={{ ...chipBase, padding: '2px 8px', background: myFlag?.is_important ? '#fee2e2' : 'transparent', color: myFlag?.is_important ? '#b91c1c' : 'var(--txl)', borderColor: myFlag?.is_important ? '#fca5a5' : 'var(--br)' }}>
                    ⭐
                  </button>
                  <button
                    title={t('following')}
                    onClick={() => setFlag(p.id, 'is_following', !myFlag?.is_following)}
                    style={{ ...chipBase, padding: '2px 8px', background: myFlag?.is_following ? '#dbeafe' : 'transparent', color: myFlag?.is_following ? '#1e40af' : 'var(--txl)', borderColor: myFlag?.is_following ? '#bfdbfe' : 'var(--br)' }}>
                    🔖
                  </button>
                  <button
                    title={t('dismissed')}
                    onClick={() => setFlag(p.id, 'is_dismissed', !myFlag?.is_dismissed)}
                    style={{ ...chipBase, padding: '2px 8px', background: myFlag?.is_dismissed ? '#f3f4f6' : 'transparent', color: myFlag?.is_dismissed ? '#374151' : 'var(--txl)', borderColor: myFlag?.is_dismissed ? '#d1d5db' : 'var(--br)' }}>
                    🙈
                  </button>
                  {/* Delete own proposal */}
                  {isOwner && (
                    <button
                      title={t('delete_proposal')}
                      onClick={() => deleteProposal(p.id)}
                      style={{ ...chipBase, padding: '2px 8px', background: 'transparent', color: '#ef4444', borderColor: 'var(--br)' }}>
                      🗑
                    </button>
                  )}
                </div>
              </div>

              {/* Title + meta */}
              <h3 style={{ fontSize: '13px', fontWeight: 500, color: 'var(--tx)', marginBottom: '4px' }}>{p.title}</h3>
              <div style={{ fontSize: '11px', color: 'var(--txm)', marginBottom: '6px' }}>
                {t('by_apt', { apt: p.apt_number })} · {formatDate(p.created_at, locale)}
                {p.tagged_apts.length > 0 && <span> · {t('tagged')} <strong>{p.tagged_apts.map((a: string) => '@' + a).join(' ')}</strong></span>}
                {p.tag_all && <span> · <strong>@tots</strong></span>}
              </div>
              <p style={{ fontSize: '11px', color: 'var(--txm)', lineHeight: 1.5, marginBottom: '12px', whiteSpace: 'pre-line' }}>{getBody(p)}</p>

              {/* Proposal photo */}
              {p.photo_url && (
                <img src={p.photo_url} alt="" style={{ width: '100%', maxHeight: '240px', objectFit: 'cover', borderRadius: '10px', marginBottom: '12px', border: '1px solid var(--br)' }} />
              )}

              {/* Vote + comment buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <button onClick={() => vote(p.id, 'support')} style={{ ...chipBase, background: myVote?.vote === 'support' ? '#dcfce7' : 'transparent', color: myVote?.vote === 'support' ? '#166534' : 'var(--txm)', borderColor: myVote?.vote === 'support' ? '#86efac' : 'var(--br)', fontWeight: myVote?.vote === 'support' ? 500 : 400, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  👍 {t('support')} ({p.supports})
                </button>
                <button onClick={() => vote(p.id, 'against')} style={{ ...chipBase, background: myVote?.vote === 'against' ? '#fee2e2' : 'transparent', color: myVote?.vote === 'against' ? '#991b1b' : 'var(--txm)', borderColor: myVote?.vote === 'against' ? '#fca5a5' : 'var(--br)', fontWeight: myVote?.vote === 'against' ? 500 : 400, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  👎 {t('against')} ({p.against})
                </button>
                <button onClick={() => setOpenComments(isCommentsOpen ? null : p.id)} style={{ ...chipBase, background: isCommentsOpen ? '#f0fdf4' : 'transparent', color: isCommentsOpen ? 'var(--pine)' : 'var(--txm)', borderColor: isCommentsOpen ? 'var(--pine)' : 'var(--br)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  💬 {t('comments')} ({comments.length})
                </button>
                {closesIn !== null && closesIn > 0 && (
                  <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--txl)' }}>{t('closes_in', { days: closesIn })}</span>
                )}
              </div>

              {/* Comment thread */}
              {isCommentsOpen && (
                <div style={{ marginTop: '12px', borderTop: '1px solid var(--br)', paddingTop: '12px' }}>
                  {comments.length === 0 && (
                    <p style={{ fontSize: '11px', color: 'var(--txl)', marginBottom: '10px' }}>{t('no_comments')}</p>
                  )}
                  {comments.map(c => (
                    <div key={c.id} style={{ display: 'flex', gap: '8px', marginBottom: '10px', alignItems: 'flex-start' }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--pine)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 600, color: '#fff', flexShrink: 0 }}>
                        {c.apt_number.slice(0,2)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '10px', color: 'var(--txl)', marginBottom: '2px' }}>
                          @{c.apt_number} · {formatDate(c.created_at, locale)}
                          {c.profile_id === profile.id && (
                            <button onClick={() => deleteComment(p.id, c.id)} style={{ marginLeft: '8px', fontSize: '10px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                              {t('delete_comment')}
                            </button>
                          )}
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--tx)', margin: 0, lineHeight: 1.4 }}>{c.body}</p>
                        {c.photo_url && (
                          <img src={c.photo_url} alt="" style={{ marginTop: '6px', maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', objectFit: 'cover' }} />
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Comment input */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        value={commentTexts[p.id] || ''}
                        onChange={e => setCommentTexts(prev => ({ ...prev, [p.id]: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && postComment(p.id)}
                        placeholder={t('add_comment')}
                        className="form-input"
                        style={{ flex: 1, fontSize: '12px' }}
                      />
                      <button
                        onClick={() => postComment(p.id)}
                        disabled={postingComment || !commentTexts[p.id]?.trim()}
                        className="btn btn-primary btn-sm"
                        style={{ opacity: postingComment ? 0.6 : 1 }}
                      >
                        {t('post_comment')}
                      </button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <label style={{ fontSize: '11px', color: 'var(--txm)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        📷
                        <input type="file" accept="image/*" onChange={e => pickCommentPhoto(p.id, e)} style={{ display: 'none' }} />
                      </label>
                      {commentPhotoPreviews[p.id] && (
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                          <img src={commentPhotoPreviews[p.id]!} alt="" style={{ width: '60px', height: '40px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--br)' }} />
                          <button
                            onClick={() => { setCommentPhotos(prev => ({ ...prev, [p.id]: null })); setCommentPhotoPreviews(prev => ({ ...prev, [p.id]: null })) }}
                            style={{ position: 'absolute', top: '-4px', right: '-4px', background: 'var(--tx)', color: 'var(--bg)', border: 'none', borderRadius: '50%', width: '14px', height: '14px', fontSize: '8px', cursor: 'pointer', lineHeight: '14px', textAlign: 'center' }}>
                            x
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}