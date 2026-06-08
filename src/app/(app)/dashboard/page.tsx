import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import DashboardFeed from './DashboardFeed'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/auth/register')

  const communityId = profile.community_id

  const [
    { count: registeredCount },
    { data: community },
    { count: openProposals },
    { count: todayBookings },
    { count: activeListings },
    { data: voicePosts },
    { data: myBookings },
    { data: premises },
    { data: recentBookings },
    { data: recentProposals },
    { data: recentListings },
    { data: recentTickets },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('community_id', communityId).eq('approved', true),
    supabase.from('communities').select('*').eq('id', communityId).single(),
    supabase.from('proposals').select('*', { count: 'exact', head: true }).eq('community_id', communityId).in('status', ['open', 'voting']),
    supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('community_id', communityId).eq('date', new Date().toISOString().split('T')[0]).eq('status', 'confirmed'),
    supabase.from('marketplace_listings').select('*', { count: 'exact', head: true }).eq('community_id', communityId).eq('status', 'active'),
    supabase.from('community_voice').select('*').eq('community_id', communityId).order('created_at', { ascending: false }).limit(3),
    supabase.from('bookings').select('*, premise:premises(name)').eq('profile_id', user.id).eq('status', 'confirmed').gte('date', new Date().toISOString().split('T')[0]).order('date').limit(5),
    supabase.from('premises').select('*').eq('community_id', communityId).eq('active', true).order('sort_order'),
    supabase.from('bookings').select('*').eq('community_id', communityId).order('created_at', { ascending: false }).limit(5),
    supabase.from('proposals').select('*').eq('community_id', communityId).order('created_at', { ascending: false }).limit(5),
    supabase.from('marketplace_listings').select('*').eq('community_id', communityId).order('created_at', { ascending: false }).limit(5),
    supabase.from('maintenance_tickets').select('*').eq('community_id', communityId).order('created_at', { ascending: false }).limit(5),
  ])

  // Build initial feed — merge and sort all recent activity
  const feedItems = [
    ...(recentBookings || []).map((r: any) => ({
      id: r.id, type: 'booking' as const, icon: '📅',
      text: `Apt ${r.apt_number} booked a premise`,
      meta: r.date, created_at: r.created_at,
    })),
    ...(recentProposals || []).map((r: any) => ({
      id: r.id, type: 'proposal' as const, icon: '📢',
      text: `New proposal: ${r.title}`,
      meta: `by @${r.apt_number}`, created_at: r.created_at,
    })),
    ...(recentListings || []).map((r: any) => ({
      id: r.id, type: 'listing' as const, icon: '⇄',
      text: `New listing: ${r.title}`,
      meta: `@${r.apt_number}`, created_at: r.created_at,
    })),
    ...(recentTickets || []).map((r: any) => ({
      id: r.id, type: 'maintenance' as const, icon: '🔧',
      text: `Maintenance ticket submitted`,
      meta: `@${r.apt_number} · ${r.category}`, created_at: r.created_at,
    })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 20)

  const triggerIcons: Record<string, string> = {
    birthday: '🎂', new_neighbour: '🏠', milestone: '🎯',
    proposal_milestone: '📢', marketplace_quirk: '🔄', event_completed: '🎾',
  }
  const triggerLabels: Record<string, string> = {
    birthday: 'Birthday', new_neighbour: 'New neighbour', milestone: 'Milestone',
    proposal_milestone: 'Proposal', marketplace_quirk: 'Marketplace', event_completed: 'Completed',
  }

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>

      {/* Banner */}
      <div className="banner" style={{ marginBottom: '14px' }}>
        {community?.banner_url && <img src={community.banner_url} alt="Bermar Park" />}
        <div className="banner-overlay">
          <div>
            <div className="banner-title">Good morning, {community?.name || 'Bermar Park'}</div>
            <div className="banner-sub" style={{ textTransform: 'capitalize' }}>
              {new Date().toLocaleDateString('ca-ES', { weekday: 'long', day: 'numeric', month: 'long' })} · Gavà Mar
            </div>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Registered</div>
          <div className="stat-value">{registeredCount || 0}</div>
          <div className="stat-sub">of {community?.total_apts_tbc || 73} TBC</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Proposals</div>
          <div className="stat-value">{openProposals || 0}</div>
          <div className="stat-sub">open / voting</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Today</div>
          <div className="stat-value">{todayBookings || 0}</div>
          <div className="stat-sub">bookings</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Marketplace</div>
          <div className="stat-value">{activeListings || 0}</div>
          <div className="stat-sub">active listings</div>
        </div>
      </div>

      {/* Community Voice */}
      {voicePosts && voicePosts.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div className="section-title">Community voice</div>
          {voicePosts.map((post: any) => {
            const body = typeof post.body === 'object' ? post.body : {}
            const text = body.EN || body.CA || body.ES || Object.values(body)[0] || ''
            return (
              <div key={post.id} className="cv-card">
                <div className="cv-icon">{triggerIcons[post.trigger_type] || '💬'}</div>
                <div>
                  <div className="cv-label">{triggerLabels[post.trigger_type] || 'Community'}</div>
                  <div className="cv-text">{text}</div>
                  <div className="cv-time">{formatDate(post.created_at)}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Two column */}
      <div className="two-col">
        <div>
          <DashboardFeed communityId={communityId} initialItems={feedItems} />
        </div>
        <div>
          <div className="section-title">Premises today</div>
          <div className="card card-sm" style={{ marginBottom: '12px' }}>
            {premises?.map((p: any) => (
              <div key={p.id} className="premise-row">
                <span>{p.name}</span>
                <span className="tag tag-green">Free</span>
              </div>
            ))}
          </div>

          {myBookings && myBookings.length > 0 && (
            <>
              <div className="section-title">My bookings</div>
              <div className="card card-sm">
                {myBookings.map((b: any) => (
                  <div key={b.id} className="feed-item">
                    <div className="feed-dot" style={{ background: '#3b82f6' }} />
                    <div>
                      <div className="feed-text">{b.premise?.name} · {formatDate(b.date)}</div>
                      {b.slot_start && (
                        <div className="feed-meta">{b.slot_start.slice(0,5)}–{b.slot_end?.slice(0,5)}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
