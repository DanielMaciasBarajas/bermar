'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTranslations } from 'next-intl'

interface Props {
  community: any
  profile: any
  unreadNotifs: number
  warnings: any[]
  onMenuToggle: () => void
}

const LANG_FLAGS: Record<string, string> = {
  ES: '🇪🇸',
  EN: '🇬🇧',
  FR: '🇫🇷',
  RU: '🇷🇺',
  SR: '🇷🇸',
  PT: '🇵🇹',
  IT: '🇮🇹',
  DE: '🇩🇪',
  NL: '🇳🇱',
  UK: '🇺🇦',
  HI: '🇮🇳',
}

const LANG_NAMES: Record<string, string> = {
  CA: 'Català', ES: 'Español', EN: 'English', FR: 'Français',
  RU: 'Русский', SR: 'Српски', PT: 'Português', IT: 'Italiano',
  DE: 'Deutsch', NL: 'Nederlands', UK: 'Українська', HI: 'हिन्दी',
}

// Catalan flag as inline SVG (senyera — 4 red stripes on gold)
function CatalanFlag({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={Math.round(size * 0.67)} viewBox="0 0 3 2" style={{ borderRadius: '2px', display: 'block' }}>
      <rect width="3" height="2" fill="#FCDD09"/>
      <rect y="0" width="3" height="0.286" fill="#DA121A"/>
      <rect y="0.572" width="3" height="0.286" fill="#DA121A"/>
      <rect y="1.144" width="3" height="0.286" fill="#DA121A"/>
      <rect y="1.716" width="3" height="0.284" fill="#DA121A"/>
    </svg>
  )
}

export default function Topbar({ community, profile, unreadNotifs, warnings, onMenuToggle }: Props) {
  const supabase = createClient()
  const t = useTranslations('common')

  const coreLangs = [...(community?.languages_core || ['CA','ES','EN','FR','RU'])]
  const extLangs = community?.languages_extended || []
  // Show core + any extended langs that are active (e.g. SR)
  const allLangs = [...coreLangs, ...extLangs]

  const [activeLang, setActiveLang] = useState<string>(profile?.preferred_lang || coreLangs[0] || 'CA')

  async function switchLang(lang: string) {
    setActiveLang(lang)
    await supabase
      .from('profiles')
      .update({ preferred_lang: lang })
      .eq('id', profile?.id)
    document.cookie = `NEXT_LOCALE=${lang.toLowerCase()}; path=/; max-age=31536000; SameSite=Lax`
    window.location.reload()
  }

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = '/auth/login'
  }

  return (
    <div>
      {warnings.map((w: any) => (
        <div key={w.id} className="warn-bar type-warning">
          ⚠ <span><strong>{w.title}</strong>{w.body ? ` — ${w.body}` : ''}</span>
          <button style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', opacity: 0.7 }}>
            {t('cancel')}
          </button>
        </div>
      ))}
      <div className="topbar">
        <button onClick={onMenuToggle} className="hamburger-btn" aria-label="Open menu">
          <span /><span /><span />
        </button>

        <span className="topbar-title">{community?.name || 'Bermar Park'}</span>

        {/* Language flags */}
        <div style={{ display: 'flex', gap: '2px', alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
          {allLangs.map((l: string) => {
            const isActive = activeLang === l
            return (
              <button
                key={l}
                onClick={() => switchLang(l)}
                title={LANG_NAMES[l] || l}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  fontSize: '16px',
                  cursor: 'pointer',
                  border: isActive ? '2px solid var(--pine)' : '2px solid transparent',
                  background: isActive ? 'rgba(26,61,43,0.08)' : 'transparent',
                  transition: 'all 0.15s',
                  padding: 0,
                  lineHeight: 1,
                }}
              >
                {l === 'CA'
                  ? <CatalanFlag size={18} />
                  : (LANG_FLAGS[l] || '🌐')}
              </button>
            )
          })}
        </div>

        <button className="notif-btn">
          🔔
          {unreadNotifs > 0 && <span className="notif-dot" />}
        </button>
        <button className="signout-btn" onClick={signOut}>Sign out</button>
      </div>
    </div>
  )
}
