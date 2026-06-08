'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'

const NAV = [
  { section: 'community', items: [
    { href: '/dashboard', key: 'dashboard', icon: '⊞' },
    { href: '/booking',   key: 'booking',   icon: '📅' },
    { href: '/events',    key: 'events',     icon: '🔥' },
    { href: '/proposals', key: 'proposals',  icon: '📢' },
    { href: '/marketplace', key: 'marketplace', icon: '⇄' },
  ]},
  { section: 'info', items: [
    { href: '/documents', key: 'documents', icon: '📁' },
    { href: '/projects',  key: 'projects',  icon: '🔨' },
    { href: '/directory', key: 'directory', icon: '🏘' },
  ]},
  { section: 'operations', items: [
    { href: '/maintenance', key: 'maintenance', icon: '🔧' },
    { href: '/settings',    key: 'settings',    icon: '⚙️' },
  ]},
]

// Section heading translations (static, not in nav keys)
const SECTION_LABELS: Record<string, Record<string, string>> = {
  community:  { ca: 'Comunitat',   es: 'Comunidad',   en: 'Community',   fr: 'Communauté',  ru: 'Сообщество', sr: 'Заједница' },
  info:       { ca: 'Informació',  es: 'Información', en: 'Info',        fr: 'Info',        ru: 'Инфо',       sr: 'Инфо' },
  operations: { ca: 'Operacions',  es: 'Operaciones', en: 'Operations',  fr: 'Opérations',  ru: 'Операции',   sr: 'Операције' },
  admin:      { ca: 'Admin',       es: 'Admin',       en: 'Admin',       fr: 'Admin',       ru: 'Админ',      sr: 'Админ' },
}

interface Props {
  profile: any
  community: any
  mobileOpen: boolean
  onMobileClose: () => void
}

export default function Sidebar({ profile, community, mobileOpen, onMobileClose }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const pathname = usePathname()
  const isAdmin = profile?.role === 'admin' || profile?.role === 'sa'
  const t = useTranslations('nav')

  // Determine current locale for section labels
  const locale = (profile?.preferred_lang || 'CA').toLowerCase()
  const sectionLabel = (key: string) => SECTION_LABELS[key]?.[locale] ?? SECTION_LABELS[key]?.['en'] ?? key

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Close mobile sidebar on navigation
  useEffect(() => {
    if (isMobile) onMobileClose()
  }, [pathname])

  const showLabels = isMobile ? true : !collapsed

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isMobile && mobileOpen && (
        <div
          onClick={onMobileClose}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
            zIndex: 40, backdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* Sidebar */}
      <div
        className="sidebar"
        style={{
          position: isMobile ? 'fixed' : 'relative',
          top: 0, left: 0, bottom: 0,
          zIndex: isMobile ? 50 : 'auto',
          width: isMobile ? '220px' : (collapsed ? '52px' : '210px'),
          minWidth: isMobile ? '220px' : (collapsed ? '52px' : '210px'),
          transform: isMobile ? (mobileOpen ? 'translateX(0)' : 'translateX(-100%)') : 'none',
          transition: 'transform 0.25s ease, width 0.2s ease, min-width 0.2s ease',
          height: isMobile ? '100dvh' : undefined,
          overflowY: 'auto',
        }}
      >
        {/* Desktop collapse button */}
        {!isMobile && (
          <button
            onClick={() => setCollapsed(c => !c)}
            style={{
              position: 'absolute', top: '16px', right: '-10px',
              width: '20px', height: '20px', borderRadius: '50%',
              background: '#2d5a3f', border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.6)', fontSize: '10px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 10,
            }}
          >
            {collapsed ? '›' : '‹'}
          </button>
        )}

        {/* Mobile close button */}
        {isMobile && (
          <button
            onClick={onMobileClose}
            style={{
              position: 'absolute', top: '12px', right: '12px',
              width: '28px', height: '28px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)', border: 'none',
              color: 'rgba(255,255,255,0.7)', fontSize: '14px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ✕
          </button>
        )}

        {/* Logo */}
        <div className="sidebar-top">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">
              <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
                <path d="M16 4L19 11L22 8L20 14L24 12L21 17L25 16L22 20L26 19L22 23L10 23L6 19L10 20L7 16L11 17L8 12L12 14L10 8L13 11Z" fill="#4ade80"/>
                <path d="M8 24Q16 20 24 24" stroke="#93c5fd" strokeWidth="1.5" fill="none"/>
              </svg>
            </div>
            {showLabels && (
              <div className="sidebar-logo-text">
                <div className="sidebar-name">{community?.name || 'Bermar Park'}</div>
                <div className="sidebar-sub">Gavà Mar</div>
              </div>
            )}
          </div>
          {showLabels && profile && (
            <div className="apt-pill">🏠 Apt {profile.apt_number}</div>
          )}
        </div>

        {/* Nav */}
        <div className="sidebar-nav">
          {NAV.map(({ section, items }) => (
            <div key={section}>
              {showLabels && <div className="nav-section-label">{sectionLabel(section)}</div>}
              {items.map(item => {
                const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
                return (
                  <Link key={item.href} href={item.href}
                    className={`nav-item${active ? ' active' : ''}`}>
                    <span className="nav-icon">{item.icon}</span>
                    {showLabels && <span className="nav-label">{t(item.key)}</span>}
                  </Link>
                )
              })}
            </div>
          ))}
          {isAdmin && (
            <div>
              {showLabels && <div className="nav-section-label">{sectionLabel('admin')}</div>}
              <Link href="/admin" className={`nav-item${pathname === '/admin' ? ' active' : ''}`}>
                <span className="nav-icon">🛡</span>
                {showLabels && <span className="nav-label">{t('admin')}</span>}
              </Link>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="user-avatar">{profile?.apt_number?.slice(0, 2) || '?'}</div>
            {showLabels && (
              <div>
                <div className="user-name">Apt {profile?.apt_number}</div>
                <div className="user-role">{profile?.role || 'resident'}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
