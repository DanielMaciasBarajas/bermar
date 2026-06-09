'use client'

import { useState } from 'react'
import { formatDate } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import type { Profile } from '@/lib/supabase/types'

interface DocumentFile { id: string; language: string; file_url: string; file_name: string | null; uploaded_at: string }
interface DocumentData { id: string; title: string; category: string; created_at: string; description?: string | null; files: DocumentFile[] }

const CATEGORY_LABELS: Record<string, string> = {
  statutes: 'Statutes & rules', minutes: 'Meeting minutes', contracts: 'Contracts',
  projects: 'Projects', urban: 'Urban development', other: 'Other',
}
const CATEGORY_ICONS: Record<string, string> = {
  statutes: '📜', minutes: '📋', contracts: '🤝', projects: '🏗', urban: '🌳', other: '📄',
}
const CATEGORY_BG: Record<string, string> = {
  statutes: '#eff6ff', minutes: '#f0fdf4', contracts: '#fffbeb',
  projects: '#faf5ff', urban: '#f0fdfa', other: 'var(--sand-d)',
}

type SortKey = 'date_desc' | 'date_asc' | 'title_asc' | 'category'
interface Props { documents: DocumentData[]; allLangs: string[]; profile: Profile }

export default function DocumentsClient({ documents, allLangs, profile }: Props) {
  const t = useTranslations('documents')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sort, setSort] = useState<SortKey>('date_desc')

  const filtered = documents
    .filter(doc => {
      const matchSearch = doc.title.toLowerCase().includes(search.toLowerCase())
      const matchCat = categoryFilter === 'all' || doc.category === categoryFilter
      return matchSearch && matchCat
    })
    .sort((a, b) => {
      if (sort === 'date_desc') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      if (sort === 'date_asc') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      if (sort === 'title_asc') return a.title.localeCompare(b.title)
      if (sort === 'category') return a.category.localeCompare(b.category)
      return 0
    })

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto' }}>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder={t('search')} className="form-input" style={{ flex: 1, minWidth: '160px' }}
        />
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="form-select" style={{ width: 'auto' }}>
          <option value="all">{t('all_categories')}</option>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={sort} onChange={e => setSort(e.target.value as SortKey)} className="form-select" style={{ width: 'auto' }}>
          <option value="date_desc">{t('newest_first')}</option>
          <option value="date_asc">{t('oldest_first')}</option>
          <option value="title_asc">{t('title_az')}</option>
          <option value="category">{t('by_category')}</option>
        </select>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--txl)', fontSize: '13px' }}>No documents found.</div>
        )}
        {filtered.map((doc, i) => (
          <div key={doc.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px 16px', borderTop: i === 0 ? 'none' : '1px solid var(--br)', cursor: 'pointer', transition: 'background 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--sand-d)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', background: CATEGORY_BG[doc.category] || 'var(--sand-d)' }}>
              {CATEGORY_ICONS[doc.category] || '📄'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--tx)', marginBottom: '2px' }}>{doc.title}</div>
              {doc.description && (
                <div style={{ fontSize: '11px', color: 'var(--txm)', marginBottom: '6px', lineHeight: 1.5, fontStyle: 'italic' }}>{doc.description}</div>
              )}
              <div style={{ fontSize: '11px', color: 'var(--txm)', marginBottom: '8px' }}>{CATEGORY_LABELS[doc.category] || doc.category} · {formatDate(doc.created_at)}</div>
              {doc.files.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {doc.files.map(f => (
                    <a key={f.id} href={f.file_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                      style={{ fontSize: '9px', padding: '2px 8px', borderRadius: '999px', fontWeight: 500, background: '#dcfce7', color: '#166534', border: '1px solid transparent', textDecoration: 'none', cursor: 'pointer' }}>
                      {f.language} ↗
                    </a>
                  ))}
                </div>
              )}
            </div>
            {doc.files.length > 0 && (
              <a href={doc.files[0].file_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                style={{ flexShrink: 0, color: 'var(--txl)', textDecoration: 'none', fontSize: '16px', transition: 'color 0.15s' }}
                onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.color = 'var(--pine)')}
                onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.color = 'var(--txl)')}>
                ⬇
              </a>
            )}
          </div>
        ))}
      </div>

      {profile.role !== 'resident' && (
        <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(255,255,255,0.8)', borderRadius: '12px', border: '1px dashed var(--br)', textAlign: 'center', fontSize: '11px', color: 'var(--txl)' }}>
          Admin: upload documents and translations via Admin → Documents tab.
        </div>
      )}
    </div>
  )
}
