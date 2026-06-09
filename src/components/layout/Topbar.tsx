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
  CA: '🏴󠁥󠁳󠁣󠁴󠁿',
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

export default function Topbar({ community, profile, unreadNotifs, warnings, onMenuToggle }: Props) {
  const supabase = createClient()
  const t = useTranslations('common')

  // Only show core languages in topbar
  const langs = [...(community?.languages_core || ['CA','ES','EN','FR','RU'])]
  const [activeLang, setActiveLang] = useState<string>(profile?.preferred_lang || langs[0] || 'CA')

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

        {/* Language flags — core only */}
        <div style={{ display: 'flex', gap: '2px', alignItems: 'center', flexShrink: 0 }}>
          {langs.map((l: string) => {
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
                {LANG_FLAGS[l] || '🌐'}
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
