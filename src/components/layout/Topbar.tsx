'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

interface Props {
  community: any
  profile: any
  unreadNotifs: number
  warnings: any[]
  onMenuToggle: () => void
}

export default function Topbar({ community, profile, unreadNotifs, warnings, onMenuToggle }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const t = useTranslations('common')

  const langs = [...(community?.languages_core || ['CA','ES','EN','FR','RU'])]
  const extended = community?.languages_extended || []

  const [activeLang, setActiveLang] = useState<string>(profile?.preferred_lang || langs[0] || 'CA')
  const [showExtended, setShowExtended] = useState(false)

  async function switchLang(lang: string) {
    setActiveLang(lang)
    setShowExtended(false)
    // Save to profile
    await supabase
      .from('profiles')
      .update({ preferred_lang: lang })
      .eq('id', profile?.id)
    document.cookie = `NEXT_LOCALE=${lang.toLowerCase()}; path=/; max-age=31536000; SameSite=Lax`
    // Refresh server components so multilingual content re-renders
    router.refresh()
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
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
        {/* Hamburger — mobile only */}
        <button onClick={onMenuToggle} className="hamburger-btn" aria-label="Open menu">
          <span /><span /><span />
        </button>

        <span className="topbar-title">{community?.name || 'Bermar Park'}</span>

        {/* Language chips */}
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', position: 'relative' }}>
          {langs.map((l: string) => (
            <button
              key={l}
              onClick={() => switchLang(l)}
              className="lang-chip"
              style={{
                background: activeLang === l ? 'var(--pine)' : undefined,
                color: activeLang === l ? '#fff' : undefined,
                border: activeLang === l ? '1px solid var(--pine)' : undefined,
                fontWeight: activeLang === l ? 600 : undefined,
                cursor: 'pointer',
              }}
            >
              {l}
            </button>
          ))}

          {/* Extended languages dropdown */}
          {extended.length > 0 && (
            <div style={{ position: 'relative' }}>
              <button
                className="lang-more"
                onClick={() => setShowExtended(o => !o)}
                style={{
                  background: extended.includes(activeLang) ? 'var(--pine)' : undefined,
                  color: extended.includes(activeLang) ? '#fff' : undefined,
                }}
              >
                {extended.includes(activeLang) ? activeLang : `+${extended.length}`}
              </button>
              {showExtended && (
                <div style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: '4px',
                  background: '#fff', borderRadius: '12px', border: '1px solid var(--br)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.1)', padding: '6px',
                  display: 'flex', flexDirection: 'column', gap: '2px', zIndex: 100,
                  minWidth: '80px',
                }}>
                  {extended.map((l: string) => (
                    <button
                      key={l}
                      onClick={() => switchLang(l)}
                      style={{
                        padding: '6px 10px', borderRadius: '8px', fontSize: '11px',
                        fontWeight: activeLang === l ? 600 : 400,
                        background: activeLang === l ? '#dcfce7' : 'transparent',
                        color: activeLang === l ? '#166534' : 'var(--tx)',
                        border: 'none', cursor: 'pointer', textAlign: 'left',
                        transition: 'background 0.1s',
                      }}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
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
