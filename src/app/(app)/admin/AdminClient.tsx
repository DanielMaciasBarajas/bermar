'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDate, LANGUAGES } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import type { Profile, Community } from '@/lib/supabase/types'

interface Props {
  profile: Profile
  community: Community | null
  activityLog: any[]
  pendingProfiles: any[]
  announcements: any[]
  allCommunities: Community[]
}

type Tab = 'activity' | 'pending' | 'warnings' | 'config' | 'documents' | 'tenants'
type WarnType = 'warning' | 'announcement' | 'convocatoria'

const DOC_CATEGORIES = [
  { id: 'statutes', label: 'Statutes & rules' },
  { id: 'minutes', label: 'Meeting minutes' },
  { id: 'contracts', label: 'Contracts' },
  { id: 'projects', label: 'Projects' },
  { id: 'urban', label: 'Urban development' },
  { id: 'other', label: 'Other' },
]

const DOC_LANGUAGES = ['CA', 'ES', 'EN', 'FR', 'RU', 'DE', 'PT', 'IT', 'UK']

export default function AdminClient({ profile, community, activityLog, pendingProfiles, announcements, allCommunities }: Props) {
  const supabase = createClient()
  const tc = useTranslations('common')
  const isSA = profile.role === 'sa'
  const [activeTab, setActiveTab] = useState<Tab>('activity')

  const [docs, setDocs] = useState<any[]>([])
  const [docsLoaded, setDocsLoaded] = useState(false)
  const [docTitle, setDocTitle] = useState('')
  const [docCategory, setDocCategory] = useState('minutes')
  const [docLang, setDocLang] = useState('ES')
  const [docFile, setDocFile] = useState<File | null>(null)
  const [docUploading, setDocUploading] = useState(false)
  const [docSuccess, setDocSuccess] = useState('')
  const [docError, setDocError] = useState('')

  const [warnType, setWarnType] = useState<WarnType>('warning')
  const [warnTitle, setWarnTitle] = useState('')
  const [warnBody, setWarnBody] = useState('')
  const [meetingDate, setMeetingDate] = useState('')
  const [meetingLocation, setMeetingLocation] = useState('')
  const [meetingType, setMeetingType] = useState<'ordinary' | 'extraordinary'>('ordinary')
  const [generatePdf, setGeneratePdf] = useState(true)
  const [sendingWarn, setSendingWarn] = useState(false)
  const [warnSuccess, setWarnSuccess] = useState('')

  const [configSaving, setConfigSaving] = useState(false)
  const [rentalMonths, setRentalMonths] = useState(community?.rental_min_months || 10)
  const [shortTermAllowed, setShortTermAllowed] = useState(community?.short_term_rental_allowed || false)
  const [cvEnabled, setCvEnabled] = useState(community?.community_voice_enabled ?? true)
  const [birthdayEnabled, setBirthdayEnabled] = useState(community?.birthday_wishes_enabled ?? true)
  const [extLangs, setExtLangs] = useState<string[]>(community?.languages_extended || [])

  async function approveProfile(profileId: string) {
    await supabase.from('profiles').update({ approved: true, approved_at: new Date().toISOString(), approved_by: profile.id }).eq('id', profileId)
  }
  async function rejectProfile(profileId: string) { await supabase.from('profiles').delete().eq('id', profileId) }

  async function sendAnnouncement() {
    setSendingWarn(true)
    const { error } = await supabase.from('admin_announcements').insert({
      community_id: profile.community_id, posted_by: profile.id, type: warnType, title: warnTitle,
      body: warnBody || null, meeting_date: warnType === 'convocatoria' && meetingDate ? meetingDate : null,
      meeting_location: warnType === 'convocatoria' ? meetingLocation : null,
      meeting_type: warnType === 'convocatoria' ? meetingType : null, active: true,
    })
    setSendingWarn(false)
    if (!error) { setWarnSuccess('Sent to all residents via in-app + email.'); setWarnTitle(''); setWarnBody(''); setMeetingDate(''); setMeetingLocation(''); setTimeout(() => setWarnSuccess(''), 4000) }
  }

  async function archiveAnnouncement(id: string) { await supabase.from('admin_announcements').update({ active: false }).eq('id', id) }

  async function saveConfig() {
    setConfigSaving(true)
    await supabase.from('communities').update({ rental_min_months: rentalMonths, short_term_rental_allowed: shortTermAllowed, community_voice_enabled: cvEnabled, birthday_wishes_enabled: birthdayEnabled, languages_extended: extLangs }).eq('id', profile.community_id)
    setConfigSaving(false)
  }

  function toggleExtLang(lang: string) { setExtLangs(prev => prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]) }

  async function loadDocs() {
    if (docsLoaded) return
    const { data } = await supabase.from('documents').select('*, files:document_files(*)').eq('community_id', profile.community_id).order('created_at', { ascending: false })
    setDocs(data || [])
    setDocsLoaded(true)
  }

  async function uploadDocument() {
    if (!docFile || !docTitle.trim()) { setDocError('Title and file are required.'); return }
    setDocUploading(true); setDocError(''); setDocSuccess('')

    const ext = docFile.name.split('.').pop()
    const path = `${profile.community_id}/${Date.now()}_${docTitle.replace(/\s+/g, '_')}.${ext}`
    const { error: storageError } = await supabase.storage.from('documents').upload(path, docFile, { upsert: false })
    if (storageError) { setDocError(`Upload failed: ${storageError.message}`); setDocUploading(false); return }

    const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)

    // AI summary via server route
    let aiDescription: string | null = null
    try {
      const aiRes = await fetch('/api/documents/summarise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: docTitle, category: docCategory, locale: docLang })
      })
      const aiData = await aiRes.json()
      aiDescription = aiData.summary || null
    } catch (e) {
      console.warn('AI summary failed:', e)
    }

    let documentId: string | null = null
    const existing = docs.find(d => d.title === docTitle.trim() && d.category === docCategory)
    if (existing) {
      documentId = existing.id
    } else {
      const { data: newDoc, error: docErr } = await supabase.from('documents').insert({
        community_id: profile.community_id,
        title: docTitle.trim(),
        category: docCategory,
        ...(aiDescription ? { description: aiDescription } : {}),
      }).select().single()
      if (docErr || !newDoc) { setDocError(`Could not create document: ${docErr?.message}`); setDocUploading(false); return }
      documentId = newDoc.id
    }

    const { error: fileError } = await supabase.from('document_files').insert({
      document_id: documentId, language: docLang, file_url: publicUrl,
      file_name: docFile.name, uploaded_at: new Date().toISOString(),
    })
    if (fileError) { setDocError(`File record failed: ${fileError.message}`); setDocUploading(false); return }

    setDocSuccess(`"${docTitle}" uploaded${aiDescription ? ' with AI summary ✨' : ''} ✓`)
    setDocTitle(''); setDocFile(null); setDocsLoaded(false)
    await loadDocs()
    setDocUploading(false)
  }

  async function deleteDocFile(fileId: string) {
    await supabase.from('document_files').delete().eq('id', fileId)
    setDocsLoaded(false); await loadDocs()
  }

  const CORE_LANGS = community?.languages_core || ['CA', 'ES', 'EN', 'FR', 'RU']
  const ALL_EXT_LANGS = ['PT', 'IT', 'DE', 'NL', 'UK', 'SR', 'HI']

  const tabs = [
    { id: 'activity' as Tab, label: 'Activity log' },
    { id: 'pending' as Tab, label: `Pending${pendingProfiles.length > 0 ? ` (${pendingProfiles.length})` : ''}` },
    { id: 'warnings' as Tab, label: 'Warnings ⚠' },
    { id: 'documents' as Tab, label: 'Documents 📄' },
    { id: 'config' as Tab, label: 'Config & langs' },
    ...(isSA ? [{ id: 'tenants' as Tab, label: 'Tenants (SA)' }] : []),
  ]

  const warnTypeBtns = [
    { id: 'warning' as WarnType, label: '⚠ Warning', activeBg: '#fef2f2', activeColor: '#991b1b' },
    { id: 'announcement' as WarnType, label: '📢 Announcement', activeBg: '#fffbeb', activeColor: '#92400e' },
    { id: 'convocatoria' as WarnType, label: '📅 Convocatòria', activeBg: '#f0fdf4', activeColor: '#166534' },
  ]

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto' }}>
      <div className="tab-bar" style={{ marginBottom: '16px', flexWrap: 'wrap' }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => { setActiveTab(tab.id); if (tab.id === 'documents') loadDocs() }}
            className={activeTab === tab.id ? 'tab-item active' : 'tab-item'} style={{ minWidth: '80px' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'activity' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {activityLog.length === 0 && <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--txl)', fontSize: '13px' }}>No activity yet.</div>}
          {activityLog.map(entry => (
            <div key={entry.id} className="card" style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', background: '#dbeafe' }}>📋</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--tx)' }}>{entry.action}</div>
                {entry.metadata && Object.keys(entry.metadata).length > 0 && <div style={{ fontSize: '11px', color: 'var(--txm)', marginTop: '2px' }}>{JSON.stringify(entry.metadata).slice(0, 80)}</div>}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--txl)', flexShrink: 0 }}>{formatDate(entry.created_at)}</div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'pending' && (
        <div>
          {pendingProfiles.length === 0 && <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--txl)', fontSize: '13px' }}>No pending registrations. 🎉</div>}
          <div className="warn-bar" style={{ marginBottom: '12px' }}>These registrations require liaison verification before full access is granted.</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {pendingProfiles.map((p: any) => (
              <div key={p.id} className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 600, color: '#fff', background: 'var(--pine)' }}>{p.apt_number}</div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--tx)' }}>Apt {p.apt_number}</div>
                    <div style={{ fontSize: '11px', color: 'var(--txm)' }}>{p.username || 'No username'} · Registered {formatDate(p.created_at)}</div>
                  </div>
                </div>
                {p.occupants && p.occupants.length > 0 && <div style={{ marginBottom: '12px', fontSize: '11px', color: 'var(--txm)' }}><span style={{ fontWeight: 500 }}>Occupants:</span> {p.occupants.map((o: any) => o.name || 'Unnamed').join(', ')}</div>}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => approveProfile(p.id)} className="btn btn-primary btn-sm">✓ {tc('approve')}</button>
                  <button onClick={() => rejectProfile(p.id)} className="btn btn-danger btn-sm">{tc('reject')}</button>
                  <button className="btn btn-sm">Message</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'warnings' && (
        <div className="two-col" style={{ gap: '16px' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--txm)', marginBottom: '12px' }}>Post to all residents — displayed on Dashboard and sent via in-app + email.</div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              {warnTypeBtns.map(type => (
                <button key={type.id} onClick={() => setWarnType(type.id)} style={{ flex: 1, padding: '8px', borderRadius: '12px', fontSize: '11px', fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s', border: warnType === type.id ? '1px solid transparent' : '1px solid var(--br)', background: warnType === type.id ? type.activeBg : 'transparent', color: warnType === type.id ? type.activeColor : 'var(--txm)' }}>{type.label}</button>
              ))}
            </div>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label className="form-label">{warnType === 'convocatoria' ? 'Meeting title' : 'Message / title'} *</label>
                <input required value={warnTitle} onChange={e => setWarnTitle(e.target.value)} placeholder={warnType === 'warning' ? 'e.g. Water cut Tuesday 10 Jun' : warnType === 'announcement' ? 'e.g. Pool opens Saturday' : 'e.g. Ordinary general meeting'} className="form-input" />
              </div>
              <div>
                <label className="form-label">Details (optional)</label>
                <textarea value={warnBody} onChange={e => setWarnBody(e.target.value)} placeholder="Additional information..." rows={3} className="form-textarea" />
              </div>
              {warnType === 'convocatoria' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div><label className="form-label">Date & time</label><input type="datetime-local" value={meetingDate} onChange={e => setMeetingDate(e.target.value)} className="form-input" /></div>
                    <div><label className="form-label">Location</label><input value={meetingLocation} onChange={e => setMeetingLocation(e.target.value)} placeholder="Party room / Zoom" className="form-input" /></div>
                  </div>
                  <div><label className="form-label">Meeting type</label>
                    <select value={meetingType} onChange={e => setMeetingType(e.target.value as any)} className="form-select">
                      <option value="ordinary">Ordinary</option>
                      <option value="extraordinary">Extraordinary</option>
                    </select>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={generatePdf} onChange={e => setGeneratePdf(e.target.checked)} style={{ width: '14px', height: '14px', accentColor: 'var(--pine)' }} />
                    <span style={{ fontSize: '12px', color: 'var(--tx)' }}>Auto-generate PDF for residents</span>
                  </label>
                </>
              )}
              {warnSuccess && <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '8px', fontSize: '11px', color: '#166534' }}>✓ {warnSuccess}</div>}
              <button onClick={sendAnnouncement} disabled={sendingWarn} className="btn btn-primary" style={{ width: '100%', opacity: sendingWarn ? 0.6 : 1 }}>
                {sendingWarn ? tc('saving') : '📨 Send to all residents'}
              </button>
            </div>
          </div>
          <div>
            <div className="section-title" style={{ marginBottom: '8px' }}>Active & recent</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {announcements.length === 0 && <div style={{ fontSize: '11px', color: 'var(--txl)', textAlign: 'center', padding: '16px 0' }}>No announcements yet.</div>}
              {announcements.map(ann => (
                <div key={ann.id} style={{ borderRadius: '12px', border: '1px solid', padding: '12px', display: 'flex', alignItems: 'flex-start', gap: '8px', background: ann.type === 'warning' ? '#fef2f2' : ann.type === 'announcement' ? '#fffbeb' : '#f0fdf4', borderColor: ann.type === 'warning' ? '#fecaca' : ann.type === 'announcement' ? '#fde68a' : '#bbf7d0' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--tx)' }}>{ann.title}</div>
                    {ann.body && <div style={{ fontSize: '11px', color: 'var(--txm)', marginTop: '2px' }}>{ann.body}</div>}
                    <div style={{ fontSize: '9px', color: 'var(--txl)', marginTop: '4px' }}>{formatDate(ann.created_at)} · {ann.active ? 'Active' : 'Archived'}</div>
                  </div>
                  {ann.active && <button onClick={() => archiveAnnouncement(ann.id)} className="btn btn-sm" style={{ flexShrink: 0, padding: '2px 8px' }}>Archive</button>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="two-col" style={{ gap: '24px', alignItems: 'flex-start' }}>
          <div>
            <div className="section-title" style={{ marginBottom: '12px' }}>Upload document</div>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label className="form-label">Title *</label>
                <input value={docTitle} onChange={e => setDocTitle(e.target.value)} placeholder="e.g. Acta Junta General Ordinària 2025" className="form-input" />
                <div style={{ fontSize: '10px', color: 'var(--txl)', marginTop: '4px' }}>If a document with this title already exists, the file will be added as a new language version.</div>
              </div>
              <div><label className="form-label">Category</label>
                <select value={docCategory} onChange={e => setDocCategory(e.target.value)} className="form-select">
                  {DOC_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div><label className="form-label">Language</label>
                <select value={docLang} onChange={e => setDocLang(e.target.value)} className="form-select">
                  {DOC_LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">File (PDF) *</label>
                <input type="file" accept=".pdf,.doc,.docx" onChange={e => setDocFile(e.target.files?.[0] || null)} style={{ fontSize: '12px', color: 'var(--tx)', width: '100%' }} />
                {docFile && <div style={{ fontSize: '10px', color: 'var(--txm)', marginTop: '4px' }}>{docFile.name} · {(docFile.size / 1024).toFixed(0)} KB</div>}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--txm)', background: 'var(--sand-d)', borderRadius: '8px', padding: '8px' }}>
                ✨ AI will auto-generate a 3-sentence summary on upload
              </div>
              {docError && <div style={{ fontSize: '11px', color: '#dc2626', background: '#fef2f2', padding: '8px 12px', borderRadius: '8px' }}>{docError}</div>}
              {docSuccess && <div style={{ fontSize: '11px', color: '#166534', background: '#f0fdf4', padding: '8px 12px', borderRadius: '8px' }}>✓ {docSuccess}</div>}
              <button onClick={uploadDocument} disabled={docUploading || !docFile || !docTitle.trim()} className="btn btn-primary" style={{ width: '100%', opacity: docUploading || !docFile || !docTitle.trim() ? 0.6 : 1 }}>
                {docUploading ? '⏳ Uploading + summarising...' : '⬆ Upload document'}
              </button>
            </div>
          </div>
          <div>
            <div className="section-title" style={{ marginBottom: '12px' }}>Uploaded documents ({docs.length})</div>
            {docs.length === 0 && <div style={{ fontSize: '12px', color: 'var(--txl)', textAlign: 'center', padding: '32px 0' }}>No documents yet.</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {docs.map(doc => (
                <div key={doc.id} className="card" style={{ padding: '12px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--tx)', marginBottom: '4px' }}>{doc.title}</div>
                  {doc.description && <div style={{ fontSize: '11px', color: 'var(--txm)', marginBottom: '6px', lineHeight: 1.4 }}>{doc.description}</div>}
                  <div style={{ fontSize: '10px', color: 'var(--txl)', marginBottom: '8px' }}>{DOC_CATEGORIES.find(c => c.id === doc.category)?.label || doc.category} · {formatDate(doc.created_at)}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {(doc.files || []).map((f: any) => (
                      <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <a href={f.file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '10px', fontWeight: 500, padding: '2px 8px', borderRadius: '999px', background: '#dcfce7', color: '#166534', textDecoration: 'none' }}>{f.language} ↗</a>
                        <button onClick={() => deleteDocFile(f.id)} style={{ fontSize: '10px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px' }}>✕</button>
                      </div>
                    ))}
                    {(doc.files || []).length === 0 && <span style={{ fontSize: '10px', color: 'var(--txl)', fontStyle: 'italic' }}>No files yet</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'config' && (
        <div className="two-col" style={{ gap: '24px' }}>
          <div>
            <div className="section-title" style={{ marginBottom: '12px' }}>Core languages — always active</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginBottom: '20px' }}>
              {CORE_LANGS.map(lang => <div key={lang} style={{ padding: '8px', borderRadius: '12px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#fff', background: 'var(--pine)' }}>{lang}</div>)}
            </div>
            <div className="section-title" style={{ marginBottom: '12px' }}>Extended — toggle per community</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {ALL_EXT_LANGS.map(lang => (
                <button key={lang} onClick={() => toggleExtLang(lang)} style={{ padding: '8px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', background: extLangs.includes(lang) ? '#dcfce7' : 'transparent', color: extLangs.includes(lang) ? '#166534' : 'var(--txm)', border: extLangs.includes(lang) ? '1px solid transparent' : '1px solid var(--br)' }}>{lang}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="section-title" style={{ marginBottom: '12px' }}>Community settings</div>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
                <span style={{ fontSize: '12px', color: 'var(--tx)' }}>Min. rental period (months)</span>
                <input type="number" value={rentalMonths} onChange={e => setRentalMonths(parseInt(e.target.value))} min="1" max="60" style={{ width: '56px', padding: '4px 8px', border: '1px solid var(--br)', borderRadius: '8px', fontSize: '12px', textAlign: 'center' }} />
              </div>
              {[
                { label: 'Short-term rentals allowed', value: shortTermAllowed, setter: setShortTermAllowed },
                { label: 'Community Voice auto-posts', value: cvEnabled, setter: setCvEnabled },
                { label: 'Birthday wishes', value: birthdayEnabled, setter: setBirthdayEnabled },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--br)', padding: '10px 0' }}>
                  <span style={{ fontSize: '12px', color: 'var(--tx)' }}>{item.label}</span>
                  <button onClick={() => item.setter(!item.value)} className="toggle" style={{ background: item.value ? 'var(--pine)' : 'var(--br)' }}>
                    <span style={{ position: 'absolute', top: '2px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s', left: item.value ? '18px' : '2px' }} />
                  </button>
                </div>
              ))}
              <button onClick={saveConfig} disabled={configSaving} className="btn btn-primary" style={{ width: '100%', marginTop: '12px', opacity: configSaving ? 0.6 : 1 }}>
                {configSaving ? tc('saving') : 'Save configuration'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tenants' && isSA && (
        <div>
          <div style={{ fontSize: '11px', color: 'var(--txm)', marginBottom: '16px' }}>All tenant communities. Each is fully independent. Bermar = pilot #001.</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {allCommunities.map(comm => (
              <div key={comm.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '14px', background: comm.primary_color || 'var(--pine)' }}>{comm.name.slice(0,2).toUpperCase()}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--tx)' }}>{comm.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--txm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{comm.address}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                  <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 500 }}>Live</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
