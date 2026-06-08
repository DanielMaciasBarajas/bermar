'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MARKETPLACE_CATEGORY_LABELS, formatDate } from '@/lib/utils'
import type { MarketplaceListing, Profile } from '@/lib/supabase/types'

const CATEGORY_TAG: Record<string, string> = {
  favour: 'tag tag-green',
  advice: 'tag tag-gray',
  borrow: 'tag tag-blue',
  buy_sell_donate: 'tag tag-red',
  parking: 'tag tag-amber',
  apartment_rental: 'tag tag-pine',
  apartment_sale: 'tag tag-pine',
  babysitting: 'tag tag-gold',
  language_exchange: 'tag tag-blue',
}

interface Props {
  listings: MarketplaceListing[]
  profile: Profile
  shortTermAllowed: boolean
  rentalMinMonths: number
}

export default function MarketplaceClient({ listings, profile, shortTermAllowed, rentalMinMonths }: Props) {
  const supabase = createClient()
  const lang = (profile as any).preferred_lang || 'ES'
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [showNewForm, setShowNewForm] = useState(false)
  const [printListing, setPrintListing] = useState<MarketplaceListing | null>(null)

  function getListingBody(listing: MarketplaceListing): string {
    if (listing.body_translations && typeof listing.body_translations === 'object') {
      return (listing.body_translations as any)[lang]
        || (listing.body_translations as any)['ES']
        || (listing.body_translations as any)['EN']
        || listing.body
    }
    return listing.body
  }

  function triggerPrint(listing: MarketplaceListing) {
    setPrintListing(listing)
    setTimeout(() => window.print(), 150)
  }
  const [form, setForm] = useState({
    category: 'favour' as MarketplaceListing['category'],
    title: '',
    body: '',
    price_eur: '',
    language_from: '',
    language_to: '',
  })
  const [saving, setSaving] = useState(false)

  const categories = Object.entries(MARKETPLACE_CATEGORY_LABELS).filter(([k]) => {
    if (k === 'apartment_rental' && !shortTermAllowed) return true
    return true
  })

  const filtered = listings.filter(l =>
    categoryFilter === 'all' || l.category === categoryFilter
  )

  async function submitListing() {
    setSaving(true)
    await supabase.from('marketplace_listings').insert({
      community_id: profile.community_id,
      profile_id: profile.id,
      apt_number: profile.apt_number,
      category: form.category,
      title: form.title,
      body: form.body,
      price_eur: form.price_eur ? parseInt(form.price_eur) : null,
      rental_months_min: form.category === 'apartment_rental' ? rentalMinMonths : null,
      language_from: form.language_from || null,
      language_to: form.language_to || null,
      status: 'active',
    })
    setShowNewForm(false)
    setSaving(false)
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>

      {/* Filters + Post button */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="form-select"
          style={{ width: 'auto' }}
        >
          <option value="all">All categories</option>
          {categories.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button
          onClick={() => setShowNewForm(true)}
          className="btn btn-primary btn-sm"
          style={{ marginLeft: 'auto' }}
        >
          + Post listing
        </button>
      </div>

      {/* Language nudge */}
      <div className="lang-nudge" style={{ marginBottom: '10px' }}>
        🌐 Write in as many languages as you can. Add a photo — listings with photos get 3× more responses.
      </div>

      {/* Short-term rental notice */}
      {!shortTermAllowed && (
        <div className="warn-bar" style={{ marginBottom: '10px' }}>
          <strong>Apartment rentals:</strong> minimum {rentalMinMonths} months (community rule). Short-term / holiday rentals are not permitted in this community.
        </div>
      )}

      {/* New listing form */}
      {showNewForm && (
        <div className="card" style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 500, color: 'var(--tx)', marginBottom: '12px' }}>New listing</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <select
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value as any }))}
              className="form-select"
            >
              {categories.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input
              required
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Title"
              className="form-input"
            />
            <textarea
              required
              value={form.body}
              onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
              placeholder="Description — add translations: ES: ... · FR: ... · EN: ..."
              rows={3}
              className="form-textarea"
            />
            {['parking', 'apartment_rental', 'apartment_sale', 'buy_sell_donate'].includes(form.category) && (
              <input
                type="number"
                value={form.price_eur}
                onChange={e => setForm(f => ({ ...f, price_eur: e.target.value }))}
                placeholder="Price (€)"
                className="form-input"
              />
            )}
            {form.category === 'language_exchange' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <input
                  value={form.language_from}
                  onChange={e => setForm(f => ({ ...f, language_from: e.target.value }))}
                  placeholder="I speak (e.g. Spanish)"
                  className="form-input"
                />
                <input
                  value={form.language_to}
                  onChange={e => setForm(f => ({ ...f, language_to: e.target.value }))}
                  placeholder="I want to learn (e.g. English)"
                  className="form-input"
                />
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={submitListing}
                disabled={saving}
                className="btn btn-primary"
                style={{ opacity: saving ? 0.6 : 1 }}
              >
                {saving ? 'Posting...' : 'Post listing'}
              </button>
              <button onClick={() => setShowNewForm(false)} className="btn">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Listings grid */}
      <div className="three-col">
        {filtered.map(listing => (
          <div key={listing.id} className="card-sm">
            <span className={CATEGORY_TAG[listing.category] || 'tag tag-gray'} style={{ display: 'inline-block', marginBottom: '8px' }}>
              {MARKETPLACE_CATEGORY_LABELS[listing.category]}
            </span>
            {listing.photo_url ? (
              <img
                src={listing.photo_url}
                alt={listing.title}
                style={{ width: '100%', height: '112px', objectFit: 'cover', borderRadius: '8px', marginBottom: '8px' }}
              />
            ) : (
              <div style={{
                width: '100%', height: '48px', borderRadius: '8px', marginBottom: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--txl)', border: '1px dashed var(--br)', background: 'var(--sand-d)',
              }}>
                📷
              </div>
            )}
            <h3 style={{ fontSize: '11px', fontWeight: 500, color: 'var(--tx)', marginBottom: '4px', lineHeight: 1.3 }}>
              {listing.title}
            </h3>
            <p style={{ fontSize: '11px', color: 'var(--txm)', marginBottom: '4px' }}>
              @{listing.apt_number} · {formatDate(listing.created_at)}
            </p>
            {listing.price_eur && (
              <p style={{ fontSize: '11px', fontWeight: 500, color: 'var(--tx)', marginBottom: '4px' }}>
                €{listing.price_eur.toLocaleString()}{listing.category === 'apartment_rental' ? '/mo' : ''}
              </p>
            )}
            {listing.rental_months_min && (
              <p style={{ fontSize: '11px', color: '#92400e', marginBottom: '4px' }}>
                Min. {listing.rental_months_min} months
              </p>
            )}
            {listing.language_from && listing.language_to && (
              <p style={{ fontSize: '11px', color: '#0f766e', marginBottom: '4px' }}>
                {listing.language_from} → {listing.language_to} · In person
              </p>
            )}
            <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
              <button className="btn btn-sm" style={{ flex: 1 }}>
                Contact @{listing.apt_number}
              </button>
              <button
                className="btn btn-sm"
                title="Generate PDF poster"
                style={{ padding: '4px 8px' }}
                onClick={() => triggerPrint(listing)}
              >
                📄
              </button>
            </div>
          </div>
        ))}

        {/* Add new placeholder */}
        <button
          onClick={() => setShowNewForm(true)}
          style={{
            borderRadius: '16px',
            border: '2px dashed var(--br)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            color: 'var(--txl)',
            background: 'transparent',
            cursor: 'pointer',
            minHeight: '128px',
            transition: 'border-color 0.15s, color 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--txm)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--txm)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--br)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--txl)' }}
        >
          <span style={{ fontSize: '24px' }}>+</span>
          <span style={{ fontSize: '11px', fontWeight: 500 }}>Post new listing</span>
          <span style={{ fontSize: '11px', textAlign: 'center' }}>Photo · PDF poster for lobby board</span>
        </button>
      </div>

      {/* PRINT POSTER — hidden on screen, shown only when printing */}
      {printListing && (
        <div className="beramar-poster">
          {/* Header */}
          <div className="bermar-poster-header">
            <div className="bermar-poster-logo">🌿</div>
            <div>
              <div className="bermar-poster-community">Beramar</div>
              <div className="bermar-poster-sub">Community Marketplace</div>
            </div>
          </div>

          {/* Category badge */}
          <div className="bermar-poster-category">
            {MARKETPLACE_CATEGORY_LABELS[printListing.category]}
          </div>

          {/* Title */}
          <h1 className="bermar-poster-title">{printListing.title}</h1>

          {/* Photo */}
          {printListing.photo_url && (
            <img
              src={printListing.photo_url}
              alt={printListing.title}
              className="bermar-poster-photo"
            />
          )}

          {/* Price */}
          {printListing.price_eur && (
            <div className="bermar-poster-price">
              €{printListing.price_eur.toLocaleString()}
              {printListing.category === 'apartment_rental' ? ' / month' : ''}
              {printListing.rental_months_min ? ` · Min. ${printListing.rental_months_min} months` : ''}
            </div>
          )}

          {/* Language exchange */}
          {printListing.language_from && printListing.language_to && (
            <div className="bermar-poster-price">
              {printListing.language_from} ↔ {printListing.language_to} · In person
            </div>
          )}

          {/* Body */}
          <p className="bermar-poster-body">{getListingBody(printListing)}</p>

          {/* Footer */}
          <div className="bermar-poster-footer">
            <div className="bermar-poster-contact">
              📱 Contact via Beramar app — Apt {printListing.apt_number}
            </div>
            <div className="bermar-poster-url">beramar.vercel.app</div>
          </div>
        </div>
      )}
    </div>
  )
}
