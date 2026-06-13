'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MARKETPLACE_CATEGORY_LABELS, formatDate } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import type { MarketplaceListing, Profile } from '@/lib/supabase/types'

const CATEGORY_TAG: Record<string, string> = {
  favour: 'tag tag-green', advice: 'tag tag-gray', borrow: 'tag tag-blue',
  buy_sell_donate: 'tag tag-red', parking: 'tag tag-amber',
  apartment_rental: 'tag tag-pine', apartment_sale: 'tag tag-pine',
  babysitting: 'tag tag-gold', language_exchange: 'tag tag-blue',
}

interface Props { listings: MarketplaceListing[]; profile: Profile; shortTermAllowed: boolean; rentalMinMonths: number }

export default function MarketplaceClient({ listings, profile, shortTermAllowed, rentalMinMonths }: Props) {
  const supabase = createClient()
  const t = useTranslations('marketplace')
  const tc = useTranslations('common')
  const tMCat = useTranslations('marketplace_categories')
  const lang = (profile as any).preferred_lang || 'ES'

  function getCatLabel(key: string): string {
    try { return tMCat(key as any) } catch { return key }
  }

  const [categoryFilter, setCategoryFilter] = useState('all')
  const [showNewForm, setShowNewForm] = useState(false)
  const [form, setForm] = useState({ category: 'favour' as MarketplaceListing['category'], title: '', body: '', price_eur: '', language_from: '', language_to: '' })
  const [saving, setSaving] = useState(false)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  function getListingBody(listing: MarketplaceListing): string {
    if (listing.body_translations && typeof listing.body_translations === 'object') {
      return (listing.body_translations as any)[lang] || (listing.body_translations as any)['ES'] || (listing.body_translations as any)['EN'] || listing.body
    }
    return listing.body
  }

  function triggerPrint(listing: MarketplaceListing) {
    const body = getListingBody(listing)
    const categoryLabel = MARKETPLACE_CATEGORY_LABELS[listing.category]
    const photoHtml = listing.photo_url ? '<img src="' + listing.photo_url + '" class="photo" />' : ''
    const priceHtml = listing.price_eur
      ? '<div class="price">&euro;' + listing.price_eur.toLocaleString() + (listing.category === 'apartment_rental' ? ' / month' : '') + (listing.rental_months_min ? ' &middot; Min. ' + listing.rental_months_min + ' months' : '') + '</div>'
      : ''
    const langHtml = (listing.language_from && listing.language_to)
      ? '<div class="price">' + listing.language_from + ' &harr; ' + listing.language_to + ' &middot; In person</div>'
      : ''
    const html = '<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Bermar &mdash; ' + listing.title + '</title><style>'
      + '* { margin: 0; padding: 0; box-sizing: border-box; }'
      + 'body { font-family: sans-serif; color: #1c1c1a; background: #fff; padding: 20mm 18mm; width: 210mm; min-height: 297mm; }'
      + '.header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #1a3d2b; }'
      + '.logo { font-size: 32px; }'
      + '.community { font-size: 28px; color: #1a3d2b; font-weight: 700; }'
      + '.sub { font-size: 12px; color: #8a8780; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }'
      + '.category { display: inline-block; padding: 4px 12px; border-radius: 999px; background: #f4efe6; color: #4a4a45; font-size: 11px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px; }'
      + 'h1 { font-size: 36px; color: #1a3d2b; line-height: 1.2; margin-bottom: 20px; }'
      + '.photo { width: 100%; max-height: 120mm; object-fit: cover; border-radius: 8px; margin-bottom: 20px; }'
      + '.price { font-size: 24px; font-weight: 600; color: #b8922a; margin-bottom: 16px; }'
      + '.body { font-size: 14px; line-height: 1.7; color: #4a4a45; white-space: pre-line; margin-bottom: 32px; }'
      + '.footer { position: fixed; bottom: 20mm; left: 18mm; right: 18mm; padding-top: 16px; border-top: 1px solid #ddd8cc; display: flex; justify-content: space-between; align-items: center; }'
      + '.contact { font-size: 14px; font-weight: 500; color: #1a3d2b; }'
      + '.url { font-size: 11px; color: #8a8780; letter-spacing: 0.5px; }'
      + '</style></head><body>'
      + '<div class="header"><div class="logo">🌿</div><div><div class="community">Bermar</div><div class="sub">Community Marketplace</div></div></div>'
      + '<div class="category">' + categoryLabel + '</div>'
      + '<h1>' + listing.title + '</h1>'
      + photoHtml + priceHtml + langHtml
      + '<p class="body">' + body + '</p>'
      + '<div class="footer"><div class="contact">Contact via Bermar app &mdash; Apt ' + listing.apt_number + '</div><div class="url">beramar.vercel.app</div></div>'
      + '<scr' + 'ipt>window.onload=function(){window.print();window.onafterprint=function(){window.close();};};</scr' + 'ipt>'
      + '</body></html>'
    const win = window.open('', '_blank')
    if (win) { win.document.write(html); win.document.close() }
  }

  async function deleteListing(id: string) {
    if (!confirm(t('delete_confirm'))) return
    await supabase.from('marketplace_listings').delete().eq('id', id)
    window.location.reload()
  }

  async function toggleStatus(listing: MarketplaceListing) {
    const next = listing.status === 'active' ? 'closed' : 'active'
    await supabase.from('marketplace_listings').update({ status: next }).eq('id', listing.id)
    window.location.reload()
  }

  const categories = Object.entries(MARKETPLACE_CATEGORY_LABELS)
  const filtered = listings.filter(l => categoryFilter === 'all' || l.category === categoryFilter)

  async function submitListing() {
    setSaving(true)
    let photo_url: string | null = null

    if (photoFile) {
      const ext = photoFile.name.split('.').pop()
      const path = profile.community_id + '/' + profile.id + '/' + Date.now() + '.' + ext
      const { error: uploadError } = await supabase.storage
        .from('marketplace')
        .upload(path, photoFile, { upsert: false, contentType: photoFile.type })
      if (uploadError) {
        console.error('Photo upload error:', uploadError)
      } else {
        const { data: urlData } = supabase.storage.from('marketplace').getPublicUrl(path)
        photo_url = urlData.publicUrl
      }
    }

    const { error: insertError } = await supabase.from('marketplace_listings').insert({
      community_id: profile.community_id, profile_id: profile.id, apt_number: profile.apt_number,
      category: form.category, title: form.title, body: form.body,
      price_eur: form.price_eur ? parseInt(form.price_eur) : null,
      rental_months_min: form.category === 'apartment_rental' ? rentalMinMonths : null,
      language_from: form.language_from || null, language_to: form.language_to || null,
      status: 'active', photo_url,
    })

    if (insertError) {
      alert('Error posting listing: ' + insertError.message)
      setSaving(false)
      return
    }

    setShowNewForm(false)
    setPhotoFile(null)
    setPhotoPreview(null)
    setSaving(false)
    window.location.reload()
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="form-select" style={{ width: 'auto' }}>
          <option value="all">{t('all_categories')}</option>
          {categories.map(([k]) => <option key={k} value={k}>{getCatLabel(k)}</option>)}
        </select>
        <button onClick={() => setShowNewForm(true)} className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }}>{t('post_listing')}</button>
      </div>

      <div className="lang-nudge" style={{ marginBottom: '10px' }}>
        {t('lang_nudge')}
      </div>

      {!shortTermAllowed && (
        <div className="warn-bar" style={{ marginBottom: '10px' }}>
          {t('rental_rule', { months: rentalMinMonths })}
        </div>
      )}

      {showNewForm && (
        <div className="card" style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 500, color: 'var(--tx)', marginBottom: '12px' }}>{t('new_listing')}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as any }))} className="form-select">
              {categories.map(([k]) => <option key={k} value={k}>{getCatLabel(k)}</option>)}
            </select>
            <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder={t('title_placeholder')} className="form-input" />
            <textarea required value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} placeholder={t('body_placeholder')} rows={3} className="form-textarea" />
            <div>
              <label style={{ fontSize: '11px', color: 'var(--txm)', display: 'block', marginBottom: '6px' }}>{t('photo_label')}</label>
              <input type="file" accept="image/*" onChange={pickPhoto} style={{ fontSize: '12px', color: 'var(--tx)' }} />
              {photoPreview && (
                <div style={{ marginTop: '8px', position: 'relative', display: 'inline-block' }}>
                  <img src={photoPreview} alt="preview" style={{ width: '120px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--br)' }} />
                  <button onClick={() => { setPhotoFile(null); setPhotoPreview(null) }} style={{ position: 'absolute', top: '-6px', right: '-6px', background: 'var(--tx)', color: 'var(--bg)', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', cursor: 'pointer', lineHeight: '18px', textAlign: 'center' }}>x</button>
                </div>
              )}
            </div>
            {['parking', 'apartment_rental', 'apartment_sale', 'buy_sell_donate'].includes(form.category) && (
              <input type="number" value={form.price_eur} onChange={e => setForm(f => ({ ...f, price_eur: e.target.value }))} placeholder={t('price_placeholder')} className="form-input" />
            )}
            {form.category === 'language_exchange' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <input value={form.language_from} onChange={e => setForm(f => ({ ...f, language_from: e.target.value }))} placeholder={t('i_speak')} className="form-input" />
                <input value={form.language_to} onChange={e => setForm(f => ({ ...f, language_to: e.target.value }))} placeholder={t('i_learn')} className="form-input" />
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={submitListing} disabled={saving} className="btn btn-primary" style={{ opacity: saving ? 0.6 : 1 }}>
                {saving ? tc('saving') : t('post_listing')}
              </button>
              <button onClick={() => { setShowNewForm(false); setPhotoFile(null); setPhotoPreview(null) }} className="btn">{tc('cancel')}</button>
            </div>
          </div>
        </div>
      )}

      <div className="three-col">
        {filtered.map(listing => (
          <div key={listing.id} className="card-sm">
            <span className={CATEGORY_TAG[listing.category] || 'tag tag-gray'} style={{ display: 'inline-block', marginBottom: '8px' }}>{getCatLabel(listing.category)}</span>
            {listing.status === 'closed' && (
              <span style={{ display: 'inline-block', marginLeft: '6px', fontSize: '10px', fontWeight: 600, color: '#fff', background: '#6b7280', borderRadius: '999px', padding: '2px 8px', verticalAlign: 'middle' }}>{t('closed')}</span>
            )}
            {listing.photo_url
              ? <img src={listing.photo_url} alt={listing.title} style={{ width: '100%', height: '112px', objectFit: 'cover', borderRadius: '8px', marginBottom: '8px' }} />
              : <div style={{ width: '100%', height: '48px', borderRadius: '8px', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--txl)', border: '1px dashed var(--br)', background: 'var(--sand-d)' }}>📷</div>
            }
            <h3 style={{ fontSize: '11px', fontWeight: 500, color: 'var(--tx)', marginBottom: '4px', lineHeight: 1.3 }}>{listing.title}</h3>
            <p style={{ fontSize: '11px', color: 'var(--txm)', marginBottom: '4px' }}>@{listing.apt_number} · {formatDate(listing.created_at)}</p>
            {listing.price_eur && <p style={{ fontSize: '11px', fontWeight: 500, color: 'var(--tx)', marginBottom: '4px' }}>€{listing.price_eur.toLocaleString()}{listing.category === 'apartment_rental' ? '/mo' : ''}</p>}
            {listing.rental_months_min && <p style={{ fontSize: '11px', color: '#92400e', marginBottom: '4px' }}>{t('min_months', { months: listing.rental_months_min })}</p>}
            {listing.language_from && listing.language_to && <p style={{ fontSize: '11px', color: '#0f766e', marginBottom: '4px' }}>{listing.language_from} → {listing.language_to} · {t('in_person')}</p>}
            <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
              <button className="btn btn-sm" style={{ flex: 1 }}>{t('contact')} @{listing.apt_number}</button>
              <button className="btn btn-sm" title={t('print_poster')} style={{ padding: '4px 8px' }} onClick={() => triggerPrint(listing)}>📄</button>
            </div>
            {listing.profile_id === profile.id && (
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                <button
                  className="btn btn-sm"
                  style={{ flex: 1, fontSize: '10px', color: listing.status === 'active' ? '#92400e' : '#166534', borderColor: listing.status === 'active' ? '#fcd34d' : '#86efac' }}
                  onClick={() => toggleStatus(listing)}
                >
                  {listing.status === 'active' ? t('mark_closed') : t('reopen')}
                </button>
                <button
                  className="btn btn-sm"
                  style={{ padding: '4px 8px', fontSize: '10px', color: '#dc2626', borderColor: '#fca5a5' }}
                  onClick={() => deleteListing(listing.id)}
                >🗑</button>
              </div>
            )}
          </div>
        ))}

        <button onClick={() => setShowNewForm(true)} style={{ borderRadius: '16px', border: '2px dashed var(--br)', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--txl)', background: 'transparent', cursor: 'pointer', minHeight: '128px', transition: 'border-color 0.15s, color 0.15s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--txm)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--txm)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--br)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--txl)' }}>
          <span style={{ fontSize: '24px' }}>+</span>
          <span style={{ fontSize: '11px', fontWeight: 500 }}>{t('post_listing')}</span>
          <span style={{ fontSize: '11px', textAlign: 'center' }}>{t('post_listing_hint')}</span>
        </button>
      </div>
    </div>
  )
}